/* global chrome */
import PropTypes from "prop-types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ChatAiResponseCard from "../features/chat/ChatAiResponseCard.jsx";
import ChatMessageBubble from "../features/chat/ChatMessageBubble.jsx";
import ChatModelTabs from "../features/chat/ChatModelTabs.jsx";
import ChatPromptInput from "../features/chat/ChatPromptInput.jsx";
import { useTheme } from "../hooks/useThemeHook.jsx";
import UTILS from "./../utils/utilsModule.js";

const MENTION_OPTIONS = [
  {
    id: "screen",
    cmd: "@screen",
    label: "Screen",
    badge: "Screenshot",
    desc: "Capture visible screen",
    icon: "📸",
  },
  {
    id: "page",
    cmd: "@page",
    label: "Page",
    badge: "Page Text",
    desc: "Attach page readable text",
    icon: "📄",
  },
  {
    id: "area",
    cmd: "@area",
    label: "Area",
    badge: "Crop Area",
    desc: "Select on-screen area",
    icon: "✂️",
  },
];

export default function ChatBot({
  isOpen,
  initialHistoryItem = null,
  pendingInput = null,
  onConsumePendingInput,
  newChatTrigger = 0,
  onClearLoadedHistory,
  onOpenSelector,
}) {
  const { contrastMode } = useTheme();
  const [input, setInput] = useState(pendingInput || "");
  const [isLoading, setIsLoading] = useState(false);
  const [lastQuestion, setLastQuestion] = useState("");
  const [answers, setAnswers] = useState({});
  const [selectedProvider, setSelectedProvider] = useState(
    initialHistoryItem
      ? Object.keys(initialHistoryItem.answers || {})[0] || null
      : null,
  );
  const [viewedProviders, setViewedProviders] = useState(new Set());
  const [messageTime, setMessageTime] = useState("");
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isUserCopied, setIsUserCopied] = useState(false);
  const [copiedProviderId, setCopiedProviderId] = useState(null);
  const currentRequestIdRef = useRef(null);
  const lastQuestionRef = useRef("");

  // Screen/Context attachment state
  const [attachedImage, setAttachedImage] = useState(null);
  const [attachedPage, setAttachedPage] = useState(null);
  const [attachedContextType, setAttachedContextType] = useState(null);
  const [lastQuestionImage, setLastQuestionImage] = useState(null);
  const [lastQuestionPage, setLastQuestionPage] = useState(null);

  // '@' mention autocomplete state
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionSelectedIndex, setMentionSelectedIndex] = useState(0);
  const [mentionQuery, setMentionQuery] = useState("");
  const mentionMenuRef = useRef(null);

  const [aiProviders, setAiProviders] = useState([]);
  const [maxConcurrentRequest, setMaxConcurrentRequest] = useState(3);

  const scrollContainerRef = useRef(null);
  const rootRef = useRef(null);
  const textareaRef = useRef(null);
  const moreMenuRef = useRef(null);

  const scrollToBottom = useCallback((smooth = true) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: smooth ? "smooth" : "auto",
      });
    }
  }, []);

  const handleCopyUserQuestion = useCallback(
    (e) => {
      e?.stopPropagation();
      if (!lastQuestion) return;
      navigator.clipboard
        .writeText(lastQuestion)
        .then(() => {
          setIsUserCopied(true);
          setTimeout(() => setIsUserCopied(false), 2000);
        })
        .catch(() => {});
    },
    [lastQuestion],
  );

  const activeAiResponseContent = useMemo(() => {
    if (!selectedProvider) return "";
    const pAns = answers[selectedProvider];
    return pAns?.content || pAns?.answer || (typeof pAns === "string" ? pAns : "");
  }, [answers, selectedProvider]);

  const handleCopyAiResponse = useCallback(
    (e) => {
      e?.stopPropagation();
      if (!activeAiResponseContent) return;
      
      let cleanText = activeAiResponseContent;
      if (typeof activeAiResponseContent === "string" && /<[a-z][\s\S]*>/i.test(activeAiResponseContent)) {
        try {
          const tempEl = document.createElement("div");
          tempEl.innerHTML = activeAiResponseContent;
          cleanText = (tempEl.innerText || tempEl.textContent || "").trim();
        } catch {
          cleanText = activeAiResponseContent;
        }
      }

      const fallbackCopy = (text) => {
        try {
          const tempArea = document.createElement("textarea");
          tempArea.value = text;
          tempArea.style.position = "fixed";
          tempArea.style.left = "-9999px";
          tempArea.style.top = "-9999px";
          document.body.appendChild(tempArea);
          tempArea.focus();
          tempArea.select();
          const success = document.execCommand("copy");
          document.body.removeChild(tempArea);
          if (success) {
            setCopiedProviderId(selectedProvider);
            setTimeout(() => setCopiedProviderId(null), 2000);
          }
        } catch (err) {
          console.warn("[SpectraLens:ChatBot] fallbackCopy failed:", err);
        }
      };

      if (
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === "function"
      ) {
        navigator.clipboard
          .writeText(cleanText)
          .then(() => {
            setCopiedProviderId(selectedProvider);
            setTimeout(() => setCopiedProviderId(null), 2000);
          })
          .catch(() => {
            fallbackCopy(cleanText);
          });
      } else {
        fallbackCopy(cleanText);
      }
    },
    [activeAiResponseContent, selectedProvider],
  );

  const appIconUrl =
    typeof chrome !== "undefined" && chrome.runtime?.getURL
      ? chrome.runtime.getURL("assets/icons/128.png")
      : "";

  const hasAnyActivity = Boolean(
    lastQuestion || isLoading || Object.keys(answers).length > 0,
  );

  const [isMultiLineInput, setIsMultiLineInput] = useState(false);

  // Auto-resize textarea height as user types
  useEffect(() => {
    if (textareaRef.current) {
      if (!input || input.trim() === "") {
        textareaRef.current.style.height = "24px";
        setIsMultiLineInput(false);
        return;
      }
      textareaRef.current.style.height = "24px";
      const scrollHeight = textareaRef.current.scrollHeight;
      const targetHeight = Math.min(Math.max(24, scrollHeight), 120);
      textareaRef.current.style.height = `${targetHeight}px`;
      setIsMultiLineInput(targetHeight >= 60 || (input.match(/\n/g) || []).length >= 2);
    }
  }, [input]);

  // Sync pending input from OCR scan
  useEffect(() => {
    if (pendingInput !== null && pendingInput !== undefined) {
      setInput(pendingInput);
      onConsumePendingInput?.();
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = "24px";
          const scrollHeight = textareaRef.current.scrollHeight;
          const targetHeight = Math.min(Math.max(24, scrollHeight), 120);
          textareaRef.current.style.height = `${targetHeight}px`;
          setIsMultiLineInput(targetHeight >= 60 || (pendingInput.match(/\n/g) || []).length >= 2);
          textareaRef.current.focus();
        }
      }, 50);
    }
  }, [pendingInput, onConsumePendingInput]);

  // Mark currently selected provider as viewed
  useEffect(() => {
    if (selectedProvider) {
      setViewedProviders((prev) => new Set([...prev, selectedProvider]));
    }
  }, [selectedProvider]);

  // Tab selection helper
  const handleSelectProvider = useCallback((providerId) => {
    setSelectedProvider(providerId);
    setViewedProviders((prev) => new Set([...prev, providerId]));
  }, []);

  // Filter mention options based on query
  const filteredMentionOptions = useMemo(() => {
    if (!mentionQuery) return MENTION_OPTIONS;
    return MENTION_OPTIONS.filter(
      (opt) =>
        opt.cmd.toLowerCase().includes(mentionQuery) ||
        opt.label.toLowerCase().includes(mentionQuery) ||
        opt.id.toLowerCase().includes(mentionQuery),
    );
  }, [mentionQuery]);

  // Handle selecting a mention option (@screen, @page, @area)
  const handleSelectMention = useCallback(
    (option) => {
      setShowMentionMenu(false);
      setMentionQuery("");

      const currentInput = input;
      const cursor = textareaRef.current?.selectionStart || currentInput.length;
      const textBeforeCursor = currentInput.slice(0, cursor);
      const textAfterCursor = currentInput.slice(cursor);
      const cleanedBefore = textBeforeCursor.replace(/(?:^|\s)@[a-zA-Z0-9_-]*$/, "");
      const newInput = (cleanedBefore + (cleanedBefore && !cleanedBefore.endsWith(" ") ? " " : "") + textAfterCursor).trimStart();
      setInput(newInput);

      if (option.id === "screen") {
        console.log("[SpectraLens:ChatBot] 📸 Requesting silent screen capture via IF_B_CAPTURE_SCREEN...");
        UTILS.pagePostMessage("IF_B_CAPTURE_SCREEN", {}, window.parent);
        setAttachedContextType("screen");
      } else if (option.id === "page") {
        console.log("[SpectraLens:ChatBot] 📄 Requesting page text context via IF_B_CAPTURE_PAGE...");
        UTILS.pagePostMessage("IF_B_CAPTURE_PAGE", {}, window.parent);
        setAttachedContextType("page");
      } else if (option.id === "area") {
        if (onOpenSelector) {
          onOpenSelector();
        }
      }

      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    },
    [input, onOpenSelector],
  );

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) {
        setIsMoreMenuOpen(false);
      }
      if (mentionMenuRef.current && !mentionMenuRef.current.contains(e.target)) {
        setShowMentionMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Listen for IF_B_CAPTURE_SCREEN & IF_B_CAPTURE_PAGE response
  useEffect(() => {
    UTILS.pageOnMessage("IF_B_CAPTURE_SCREEN", (data) => {
      if (data?.image) {
        console.log("[SpectraLens:ChatBot] 📸 Screen image attached to chat successfully!");
        setAttachedImage(data.image);
        setAttachedPage(null);
        setAttachedContextType("screen");
      }
    });

    UTILS.pageOnMessage("IF_B_CAPTURE_PAGE", (data) => {
      if (data?.success && (data?.text || data?.title)) {
        console.log(
          `[SpectraLens:ChatBot] 📄 Page attached: "${data.title}" (${data.wordCount} words, screenshot: ${Boolean(data.image)})`,
        );
        setAttachedPage({
          title: data.title || "Page Context",
          url: data.url || "",
          hostname: data.hostname || "",
          description: data.description || "",
          keywords: data.keywords || "",
          author: data.author || "",
          favicon: data.favicon || "",
          text: data.text || "",
          wordCount: data.wordCount || 0,
          image: data.image || null,
        });
        setAttachedImage(null);
        setAttachedContextType("page");
      }
    });
  }, []);

  // Format date & time (e.g. 4:15 PM • 18 Aug)
  const formatDateTimeBadge = (timestamp) => {
    if (!timestamp) return "";
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return "";

      const timeStr = date.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      });

      const day = date.getDate();
      const monthStr = date.toLocaleString("en-US", { month: "short" });
      const year = date.getFullYear();
      const currentYear = new Date().getFullYear();

      if (year === currentYear) {
        return `${timeStr} • ${day} ${monthStr}`;
      }
      return `${timeStr} • ${day} ${monthStr} ${year}`;
    } catch {
      return "";
    }
  };

  const getFormattedTimeBadge = () => formatDateTimeBadge(new Date());

  // Load history item if requested from outside
  useEffect(() => {
    if (initialHistoryItem) {
      setInput("");
      setLastQuestion(initialHistoryItem.question || "");
      lastQuestionRef.current = initialHistoryItem.question || "";
      setLastQuestionImage(initialHistoryItem.image || null);
      setAnswers(initialHistoryItem.answers || {});
      setViewedProviders(
        new Set(Object.keys(initialHistoryItem.answers || {})),
      );
      if (initialHistoryItem.timestamp) {
        setMessageTime(formatDateTimeBadge(initialHistoryItem.timestamp));
      }
      const availableProviders = Object.keys(initialHistoryItem.answers || {});
      if (availableProviders.length > 0) {
        if (!initialHistoryItem.answers[selectedProvider]) {
          setSelectedProvider(availableProviders[0]);
        }
      }
      if (onClearLoadedHistory) {
        onClearLoadedHistory();
      }
    }
  }, [initialHistoryItem, onClearLoadedHistory, selectedProvider]);

  // Stop active AI fetching
  const handleStopFetch = useCallback(() => {
    currentRequestIdRef.current = "stopped_" + Date.now();
    setIsLoading(false);
    UTILS.pagePostMessage("IF_B_STOP_FETCH", {}, window.parent);
  }, []);

  // Start fresh chat session
  const handleNewChat = useCallback(() => {
    if (isLoading) {
      handleStopFetch();
    }
    setInput("");
    setAnswers({});
    setLastQuestion("");
    setAttachedImage(null);
    setAttachedPage(null);
    setAttachedContextType(null);
    setLastQuestionImage(null);
    setLastQuestionPage(null);
    setShowMentionMenu(false);
    setSelectedProvider(null);
    setViewedProviders(new Set());
    setIsLoading(false);
    currentRequestIdRef.current = null;
    UTILS.pagePostMessage("IF_B_NEW_CHAT", {}, window.parent);
    if (textareaRef.current) {
      textareaRef.current.style.height = "24px";
    }
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  }, [isLoading, handleStopFetch]);

  useEffect(() => {
    UTILS.pageOnMessage("IF_C_GET_CURRENT_CONTROLS", (data) => {
      const { aiProviders: storedProviders, concurrentRequests } =
        data?.controls || {};
      if (storedProviders && Array.isArray(storedProviders)) {
        const enabledProviders = storedProviders.filter((p) => p.enabled);
        setAiProviders(enabledProviders);
        if (
          selectedProvider &&
          enabledProviders.length > 0 &&
          !enabledProviders.some((p) => p.id === selectedProvider)
        ) {
          setSelectedProvider(enabledProviders[0].id);
        }
      }
      if (concurrentRequests) {
        setMaxConcurrentRequest(concurrentRequests);
      }
    });

    // Also load directly from storage
    UTILS.chromeStorageGetLocal(UTILS.KEYS.CONTROLS, (data) => {
      const { aiProviders: storedProviders, concurrentRequests } = data || {};
      if (storedProviders && Array.isArray(storedProviders)) {
        const enabledProviders = storedProviders.filter((p) => p.enabled);
        setAiProviders(enabledProviders);
        if (
          selectedProvider &&
          enabledProviders.length > 0 &&
          !enabledProviders.some((p) => p.id === selectedProvider)
        ) {
          setSelectedProvider(enabledProviders[0].id);
        }
      }
      if (concurrentRequests) {
        setMaxConcurrentRequest(concurrentRequests);
      }
    });
  }, [selectedProvider]);

  // Get answer from background script
  const dispatchAiRequestToBackground = async (
    question,
    provider = "google",
    requestId,
    image = null,
  ) => {
    console.log(`[SpectraLens:ChatBot] 🚀 Posting IF_B_GET_ANSWER for provider: "${provider}", query: "${question.slice(0, 30)}..."${image ? " (with screen image attachment)" : ""} (requestId: ${requestId})`);
    UTILS.pagePostMessage(
      "IF_B_GET_ANSWER",
      { question, provider, requestId, image },
      window.parent,
    );
  };

  // Concurrent provider loading
  const fetchAiResponsesWithConcurrency = useCallback(
    async (question, requestId, image = null) => {
      const providersToProcess = [...aiProviders];
      const activeRequests = new Map();

      const startProviderRequest = (provider) => {
        dispatchAiRequestToBackground(question, provider.id, requestId, image);

        const promise = new Promise((resolve) => {
          const checkAnswer = () => {
            if (currentRequestIdRef.current !== requestId) {
              resolve({ cancelled: true });
              return;
            }

            setAnswers((current) => {
              if (current[provider.id]) {
                resolve({ provider, completed: true });
              } else {
                setTimeout(checkAnswer, 400);
              }
              return current;
            });
          };
          checkAnswer();
        });

        activeRequests.set(provider.id, promise);
        return promise;
      };

      const initialRequests = providersToProcess.splice(
        0,
        maxConcurrentRequest,
      );
      initialRequests.forEach((provider) => startProviderRequest(provider));

      while (activeRequests.size > 0) {
        const finishedPromise = await Promise.race(
          Array.from(activeRequests.values()),
        );

        if (finishedPromise.cancelled) break;

        activeRequests.delete(finishedPromise.provider.id);

        if (providersToProcess.length > 0) {
          const nextProvider = providersToProcess.shift();
          startProviderRequest(nextProvider);
        }
      }
    },
    [aiProviders, maxConcurrentRequest],
  );

  // Combine active providers with historical answers
  const availableProviderTabs = useMemo(() => {
    const combined = [...aiProviders];
    const existingIds = new Set(aiProviders.map((p) => p.id));

    Object.keys(answers).forEach((providerId) => {
      if (!existingIds.has(providerId)) {
        combined.push({
          id: providerId,
          name: providerId.charAt(0).toUpperCase() + providerId.slice(1),
          enabled: false,
        });
      }
    });

    if (combined.length === 0) {
      return [
        { id: "google", name: "Google AI", enabled: true },
        { id: "bing", name: "Bing AI", enabled: true },
        { id: "gemini", name: "Gemini", enabled: true },
      ];
    }
    return combined;
  }, [aiProviders, answers]);

  // Providers shown as primary pills (first 3) vs overflow menu
  const primaryProviderTabs = availableProviderTabs.slice(0, 3);
  const overflowProviderTabs = availableProviderTabs.slice(3);

  const handleSendMessage = useCallback(
    async (messageInput = null) => {
      const actualInput = messageInput !== null ? messageInput : input;
      if (actualInput?.trim() === "" && !attachedImage && !attachedPage) return;

      const requestId = Date.now().toString();
      currentRequestIdRef.current = requestId;

      const targetProvider =
        selectedProvider ||
        aiProviders.find((p) => p.enabled)?.id ||
        availableProviderTabs[0]?.id ||
        "google";

      setSelectedProvider(targetProvider);
      setViewedProviders(new Set([targetProvider]));

      let sentQuestion = actualInput;
      let currentImage = attachedImage;

      if (attachedPage) {
        if (attachedPage.image) {
          currentImage = attachedPage.image;
        }

        const metaLines = [];
        if (attachedPage.title) metaLines.push(`Page Title: ${attachedPage.title}`);
        if (attachedPage.url) metaLines.push(`Page Link: ${attachedPage.url}`);
        if (attachedPage.description) metaLines.push(`Description: ${attachedPage.description}`);
        if (attachedPage.author) metaLines.push(`Author: ${attachedPage.author}`);
        if (attachedPage.keywords) metaLines.push(`Keywords: ${attachedPage.keywords}`);

        const metadataBlock = metaLines.join("\n");
        const userPrompt = actualInput || "Analyze and summarize this page based on the attached top-section screenshot and page metadata.";
        sentQuestion = `${userPrompt}\n\n[Web Page Metadata]\n${metadataBlock}`;
      } else if (!actualInput && attachedImage) {
        sentQuestion = "Explain what is on this screen";
      }

      setLastQuestion(
        actualInput ||
          (attachedPage
            ? "Summarize and explain this page"
            : attachedImage
              ? "Explain what is on this screen"
              : ""),
      );
      lastQuestionRef.current = sentQuestion;
      setLastQuestionImage(currentImage);
      setLastQuestionPage(attachedPage);

      setMessageTime(getFormattedTimeBadge());
      setInput("");
      setAttachedImage(null);
      setAttachedPage(null);
      setAttachedContextType(null);
      setShowMentionMenu(false);
      setIsMultiLineInput(false);
      if (textareaRef.current) {
        textareaRef.current.style.height = "24px";
      }
      setIsLoading(true);
      setAnswers({});

      // Scroll to maximum bottom immediately on send
      scrollToBottom(false);
      setTimeout(() => scrollToBottom(true), 50);
      setTimeout(() => scrollToBottom(true), 200);

      fetchAiResponsesWithConcurrency(sentQuestion, requestId, currentImage);
    },
    [
      input,
      attachedImage,
      attachedPage,
      fetchAiResponsesWithConcurrency,
      selectedProvider,
      aiProviders,
      availableProviderTabs,
      scrollToBottom,
    ],
  );

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInput(val);

    const cursor = e.target.selectionStart || val.length;
    const textBeforeCursor = val.slice(0, cursor);
    const lastWordMatch = textBeforeCursor.match(/(?:^|\s)@([a-zA-Z0-9_-]*)$/);

    if (lastWordMatch) {
      setShowMentionMenu(true);
      setMentionQuery(lastWordMatch[1].toLowerCase());
      setMentionSelectedIndex(0);
    } else {
      setShowMentionMenu(false);
      setMentionQuery("");
    }
  };

  const handleKeyDown = (e) => {
    if (showMentionMenu && filteredMentionOptions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionSelectedIndex((prev) => (prev + 1) % filteredMentionOptions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionSelectedIndex((prev) => (prev - 1 + filteredMentionOptions.length) % filteredMentionOptions.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        handleSelectMention(filteredMentionOptions[mentionSelectedIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setShowMentionMenu(false);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  useEffect(() => {
    UTILS.pageOnMessage("IF_B_GET_ANSWER", (data) => {
      console.log("[SpectraLens:ChatBot] 📥 Received IF_B_GET_ANSWER in UI:", data);
      if (!data || typeof data !== "object") return;
      if (data.requestId && data.requestId !== currentRequestIdRef.current) {
        console.warn(`[SpectraLens:ChatBot] ⚠️ Discarding outdated response for requestId: ${data.requestId} (current: ${currentRequestIdRef.current})`);
        return;
      }

      const provider = data.provider || "google";
      const answerText =
        data.answer || data.content || (typeof data === "string" ? data : "");

      console.log(`[SpectraLens:ChatBot] ✅ Updating answer for "${provider}", text length: ${answerText.length}`);

      setAnswers((prev) => {
        const isFirstAnswer = Object.keys(prev).length === 0;
        if (isFirstAnswer) {
          setSelectedProvider(provider);
          setViewedProviders((v) => new Set([...v, provider]));
          setIsLoading(false);
        }

        const newAnswers = {
          ...prev,
          [provider]: {
            ...data,
            answer: answerText,
            content: answerText,
            provider: provider,
            timestamp: Date.now(),
          },
        };

        // Save complete response to Chrome local storage history
        UTILS.chromeStorageGetLocal(UTILS.KEYS.HISTORY, (prevHistory = []) => {
          const historyList = Array.isArray(prevHistory) ? prevHistory : [];
          const reqId = data.requestId || currentRequestIdRef.current;
          const existingIndex = historyList.findIndex(
            (item) => item.id === reqId,
          );

          let updatedHistory;
          if (existingIndex >= 0) {
            updatedHistory = [...historyList];
            updatedHistory[existingIndex] = {
              ...updatedHistory[existingIndex],
              answers: newAnswers,
            };
          } else {
            const newHistoryItem = {
              id: reqId || Date.now().toString(),
              question: lastQuestionRef.current,
              timestamp: Date.now(),
              answers: newAnswers,
            };
            updatedHistory = [newHistoryItem, ...historyList].slice(0, 50);
          }

          UTILS.chromeStorageSetLocal(
            UTILS.KEYS.HISTORY,
            updatedHistory,
            () => {},
          );
        });

        return newAnswers;
      });
    });

    UTILS.pageOnMessage("IF_B_AI_REQUEST_COMPLETE", () => {
      setIsLoading(false);
    });

    UTILS.pageOnMessage("C_IF_SET_INPUTS", (data) => {
      if (data && data.input !== undefined) {
        setInput(data.input);
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = `${Math.min(
              Math.max(24, textareaRef.current.scrollHeight),
              120,
            )}px`;
            textareaRef.current.focus();
          }
        }, 60);
      }
    });
  }, [setInput]);

  // Focus textarea when chat opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (newChatTrigger > 0) {
      handleNewChat();
    }
  }, [newChatTrigger, handleNewChat]);

  // Providers list memoized
  const allProvidersList = useMemo(() => {
    const list = [...aiProviders];
    const existingIds = new Set(aiProviders.map((p) => p.id));
    Object.keys(answers).forEach((id) => {
      if (!existingIds.has(id)) {
        list.push({
          id,
          name: id.charAt(0).toUpperCase() + id.slice(1),
          enabled: false,
        });
      }
    });
    return list;
  }, [aiProviders, answers]);

  const activeAiProviderMetadata = useMemo(() => {
    return (
      allProvidersList.find((p) => p.id === selectedProvider) || {
        id: selectedProvider || "google",
        name:
          selectedProvider
            ? selectedProvider.charAt(0).toUpperCase() +
              selectedProvider.slice(1)
            : "Google AI",
      }
    );
  }, [allProvidersList, selectedProvider]);

  return (
    <div
      ref={rootRef}
      className="flex flex-col h-full w-full overflow-hidden text-slate-800 dark:text-slate-200"
    >
      {/* Top Model Tabs & Overflow Switcher */}
      <ChatModelTabs
        primaryProviderTabs={primaryProviderTabs}
        overflowProviderTabs={overflowProviderTabs}
        selectedProvider={selectedProvider}
        viewedProviders={viewedProviders}
        answers={answers}
        hasAnyActivity={hasAnyActivity}
        contrastMode={contrastMode}
        isMoreMenuOpen={isMoreMenuOpen}
        setIsMoreMenuOpen={setIsMoreMenuOpen}
        onSelectProvider={handleSelectProvider}
        moreMenuRef={moreMenuRef}
      />

      {/* Main Messages Scroll Area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto custom-scrollbar p-3.5 space-y-3.5"
      >
        {/* Welcome Empty State */}
        {!lastQuestion && !isLoading && Object.keys(answers).length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600/15 via-indigo-600/15 to-purple-600/15 border border-blue-500/20 flex items-center justify-center shadow-xs">
              {appIconUrl ? (
                <img
                  src={appIconUrl}
                  alt="SpectraLens AI"
                  className="w-7 h-7 object-contain"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-blue-600" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                SpectraLens AI
              </h3>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mt-1 max-w-[240px]">
                Ask once, compare answers from top AI models in parallel.
              </p>
            </div>
          </div>
        )}

        {/* User Question Message Bubble */}
        <ChatMessageBubble
          lastQuestion={lastQuestion}
          lastQuestionImage={lastQuestionImage}
          lastQuestionPage={lastQuestionPage}
          messageTime={messageTime || getFormattedTimeBadge()}
          isUserCopied={isUserCopied}
          onCopyUserQuestion={handleCopyUserQuestion}
        />

        {/* AI Response Card */}
        <ChatAiResponseCard
          activeAiResponseContent={activeAiResponseContent}
          isLoading={isLoading}
          activeAiProviderMetadata={activeAiProviderMetadata}
          copiedProviderId={copiedProviderId}
          selectedProvider={selectedProvider}
          messageTime={messageTime || getFormattedTimeBadge()}
          contrastMode={contrastMode}
          onCopyAiResponse={handleCopyAiResponse}
        />
      </div>

      {/* Bottom Input Dock Bar */}
      <ChatPromptInput
        input={input}
        setInput={setInput}
        isLoading={isLoading}
        attachedImage={attachedImage}
        setAttachedImage={setAttachedImage}
        attachedPage={attachedPage}
        setAttachedPage={setAttachedPage}
        setAttachedContextType={setAttachedContextType}
        showMentionMenu={showMentionMenu}
        filteredMentionOptions={filteredMentionOptions}
        mentionSelectedIndex={mentionSelectedIndex}
        mentionMenuRef={mentionMenuRef}
        textareaRef={textareaRef}
        isMultiLineInput={isMultiLineInput}
        contrastMode={contrastMode}
        onKeyDown={handleKeyDown}
        onChangeInput={handleInputChange}
        onSelectMention={handleSelectMention}
        onOpenSelector={onOpenSelector}
        onStopFetching={handleStopFetch}
        onSendMessage={handleSendMessage}
      />
    </div>
  );
}

ChatBot.propTypes = {
  isOpen: PropTypes.bool,
  initialHistoryItem: PropTypes.object,
  newChatTrigger: PropTypes.number,
  onClearLoadedHistory: PropTypes.func,
  onOpenSelector: PropTypes.func,
};
