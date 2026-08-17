/* global chrome */
import PropTypes from "prop-types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  IoCheckmark,
  IoClose,
  IoCopyOutline,
  IoSquare,
} from "react-icons/io5";
import { useTheme } from "../hooks/useThemeHook.jsx";
import UTILS from "./../utils/utilsModule.js";
import {
  ElementSelectorIcon,
  ProviderIcon,
  SendPlaneIcon,
  ThreeDotsIcon,
} from "./Icons.jsx";

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
  const [attachedContextType, setAttachedContextType] = useState(null);
  const [lastQuestionImage, setLastQuestionImage] = useState(null);

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

  const selectedAnswerContent = useMemo(() => {
    if (!selectedProvider) return "";
    const pAns = answers[selectedProvider];
    return pAns?.content || pAns?.answer || (typeof pAns === "string" ? pAns : "");
  }, [answers, selectedProvider]);

  const handleCopyAiAnswer = useCallback(
    (e) => {
      e?.stopPropagation();
      if (!selectedAnswerContent) return;
      
      let cleanText = selectedAnswerContent;
      if (typeof selectedAnswerContent === "string" && /<[a-z][\s\S]*>/i.test(selectedAnswerContent)) {
        try {
          const tempEl = document.createElement("div");
          tempEl.innerHTML = selectedAnswerContent;
          cleanText = (tempEl.innerText || tempEl.textContent || "").trim();
        } catch {
          cleanText = selectedAnswerContent;
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
    [selectedAnswerContent, selectedProvider],
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
        console.log("[SpectraLens:ChatBot] 📄 Requesting page text context...");
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

  // Listen for IF_B_CAPTURE_SCREEN response
  useEffect(() => {
    UTILS.pageOnMessage("IF_B_CAPTURE_SCREEN", (data) => {
      if (data?.image) {
        console.log("[SpectraLens:ChatBot] 📸 Screen image attached to chat successfully!");
        setAttachedImage(data.image);
        setAttachedContextType("screen");
      }
    });
  }, []);

  // Format current time
  const getFormattedTime = () => {
    const d = new Date();
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

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
        try {
          const d = new Date(initialHistoryItem.timestamp);
          setMessageTime(
            d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          );
        } catch {
          setMessageTime(getFormattedTime());
        }
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
    setAttachedContextType(null);
    setLastQuestionImage(null);
    setShowMentionMenu(false);
    setSelectedProvider(null);
    setViewedProviders(new Set());
    setIsLoading(false);
    currentRequestIdRef.current = null;
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
  const getAnswerFromBackground = async (
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
  const loadProvidersWithConcurrency = useCallback(
    async (question, requestId, image = null) => {
      const providersToProcess = [...aiProviders];
      const activeRequests = new Map();

      const startProviderRequest = (provider) => {
        getAnswerFromBackground(question, provider.id, requestId, image);

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
  const displayedProviders = useMemo(() => {
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
  const primaryPills = displayedProviders.slice(0, 3);
  const overflowProviders = displayedProviders.slice(3);

  const handleSendMessage = useCallback(
    async (messageInput = null) => {
      const actualInput = messageInput !== null ? messageInput : input;
      if (actualInput?.trim() === "" && !attachedImage) return;

      const requestId = Date.now().toString();
      currentRequestIdRef.current = requestId;

      const targetProvider =
        selectedProvider ||
        aiProviders.find((p) => p.enabled)?.id ||
        displayedProviders[0]?.id ||
        "google";

      setSelectedProvider(targetProvider);
      setViewedProviders(new Set([targetProvider]));

      const sentQuestion = actualInput || (attachedImage ? "Explain what is on this screen" : "");
      setLastQuestion(sentQuestion);
      lastQuestionRef.current = sentQuestion;
      setLastQuestionImage(attachedImage);
      const currentImage = attachedImage;

      setMessageTime(getFormattedTime());
      setInput("");
      setAttachedImage(null);
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

      loadProvidersWithConcurrency(sentQuestion, requestId, currentImage);
    },
    [
      input,
      attachedImage,
      loadProvidersWithConcurrency,
      selectedProvider,
      aiProviders,
      displayedProviders,
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

  const activeProviderObj = useMemo(() => {
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
      {/* Provider Pill Bar */}
      <div className="flex items-center justify-between gap-1.5 px-3.5 py-2 border-b border-slate-200/50 dark:border-white/[0.06] bg-slate-50/50 dark:bg-black/10 shrink-0">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-1 py-0.5">
          {primaryPills.map((provider) => {
            const isSelected =
              hasAnyActivity && selectedProvider === provider.id;
            const pAns = answers[provider.id];
            const hasAnswer = Boolean(
              pAns?.content ||
              pAns?.answer ||
              (typeof pAns === "string" && pAns),
            );
            const hasUnreadAnswer =
              hasAnswer &&
              !viewedProviders.has(provider.id) &&
              !isSelected;

            return (
              <button
                key={provider.id}
                onClick={() => hasAnyActivity && handleSelectProvider(provider.id)}
                disabled={!hasAnyActivity}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shrink-0 focus:outline-none ${
                  !hasAnyActivity
                    ? "opacity-50 cursor-default"
                    : "cursor-pointer"
                } ${
                  isSelected
                    ? "bg-blue-600 text-white border-blue-500 shadow-xs scale-100"
                    : contrastMode === "solid"
                      ? "bg-slate-200/80 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 border-slate-200 dark:border-white/[0.06]"
                      : "bg-white/40 dark:bg-white/[0.05] text-slate-800 dark:text-slate-200 hover:bg-white/60 dark:hover:bg-white/10 border-slate-200/40 dark:border-white/[0.06]"
                }`}
              >
                <ProviderIcon
                  id={provider.id}
                  className="w-3.5 h-3.5 shrink-0"
                  size={14}
                />
                <span>{provider.name}</span>

                {hasUnreadAnswer && (
                  <span
                    className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs shadow-emerald-500/50 shrink-0 animate-pulse"
                    title="New response ready"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Overflow 3-dots Menu for 4+ providers */}
        {overflowProviders.length > 0 && (
          <div className="relative shrink-0" ref={moreMenuRef}>
            <button
              onClick={() => hasAnyActivity && setIsMoreMenuOpen((v) => !v)}
              disabled={!hasAnyActivity}
              title="More AI Models"
              className={`p-2 rounded-xl transition-all border focus:outline-none ${
                !hasAnyActivity ? "opacity-50 cursor-default" : "cursor-pointer"
              } ${
                isMoreMenuOpen
                  ? "bg-blue-600 text-white border-blue-500 shadow-xs"
                  : contrastMode === "solid"
                    ? "bg-slate-200/80 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 border-slate-200 dark:border-white/[0.06]"
                    : "bg-white/40 dark:bg-white/[0.05] text-slate-800 dark:text-slate-200 hover:bg-white/60 dark:hover:bg-white/10 border-slate-200/40 dark:border-white/[0.06]"
              }`}
            >
              <ThreeDotsIcon className="w-4 h-4" size={16} />
            </button>

            {isMoreMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-44 rounded-xl bg-white dark:bg-[#1a1d26] border border-slate-200 dark:border-white/10 shadow-xl py-1 z-30 animate-fade-in">
                {overflowProviders.map((provider) => {
                  const isOverflowSelected =
                    hasAnyActivity && selectedProvider === provider.id;
                  const pAns = answers[provider.id];
                  const hasOverflowAnswer = Boolean(
                    pAns?.content ||
                    pAns?.answer ||
                    (typeof pAns === "string" && pAns),
                  );
                  const hasUnreadOverflow =
                    hasOverflowAnswer &&
                    !viewedProviders.has(provider.id) &&
                    !isOverflowSelected;

                  return (
                    <button
                      key={provider.id}
                      onClick={() => {
                        handleSelectProvider(provider.id);
                        setIsMoreMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-left transition-colors focus:outline-none cursor-pointer ${
                        isOverflowSelected
                          ? "bg-blue-600/15 text-blue-600 dark:text-blue-400 font-bold"
                          : "text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <ProviderIcon
                          id={provider.id}
                          className="w-4 h-4 shrink-0"
                          size={16}
                        />
                        <span className="truncate">{provider.name}</span>
                      </div>
                      {hasUnreadOverflow && (
                        <span
                          className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs shadow-emerald-500/50 shrink-0 animate-pulse"
                          title="New response ready"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

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

        {/* User Message Bubble */}
        {lastQuestion && (
          <div className="flex flex-col items-end gap-1 animate-fade-in group">
            <div className="user-message-bubble relative max-w-[85%] px-3.5 py-2.5 rounded-2xl rounded-tr-xs bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs select-text">
              {/* Attached Screen Preview Thumbnail inside Message Bubble */}
              {lastQuestionImage && (
                <div className="mb-2 rounded-xl overflow-hidden border border-white/20 shadow-xs max-h-36 bg-black/20">
                  <img
                    src={lastQuestionImage}
                    alt="Attached screen context"
                    className="w-full h-auto max-h-36 object-contain cursor-pointer hover:opacity-95 transition-opacity"
                    onClick={() => {
                      try {
                        const win = window.open();
                        win?.document.write(
                          `<html style="background:#0b0d13;display:flex;align-items:center;justify-content:center;height:100%;"><body style="margin:0;"><img src="${lastQuestionImage}" style="max-width:95vw;max-height:95vh;border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,0.5);" /></body></html>`,
                        );
                      } catch {}
                    }}
                    title="Click to view full screenshot"
                  />
                </div>
              )}

              <p
                className="text-xs leading-relaxed font-normal whitespace-pre-wrap break-words max-h-[7.2em] overflow-y-auto custom-scrollbar pr-1 select-text cursor-text"
                title={lastQuestion}
              >
                {lastQuestion}
              </p>
              <div className="flex items-center justify-between gap-4 mt-2 pt-1.5 border-t border-white/15 text-[10px] text-blue-100 font-medium select-none">
                {/* Copy User Question Button */}
                <button
                  type="button"
                  onClick={handleCopyUserQuestion}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/15 hover:bg-white/25 active:scale-95 transition-all text-white cursor-pointer focus:outline-none"
                  title="Copy sent message"
                >
                  {isUserCopied ? (
                    <>
                      <IoCheckmark className="w-3 h-3 text-emerald-300" />
                      <span className="text-emerald-200 text-[10px] font-semibold">Copied</span>
                    </>
                  ) : (
                    <>
                      <IoCopyOutline className="w-3 h-3 text-blue-100" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
                <span>{messageTime || getFormattedTime()}</span>
              </div>
            </div>
          </div>
        )}

        {/* AI Response Card */}
        {(selectedAnswerContent || (isLoading && !selectedAnswerContent)) && (
          <div className="flex flex-col gap-2 animate-fade-in">
            <div
              className={`p-4 rounded-2xl border shadow-xs space-y-3 ${
                contrastMode === "solid"
                  ? "bg-white dark:bg-[#181920] border-slate-200/90 dark:border-white/[0.08]"
                  : contrastMode === "medium"
                    ? "bg-white/70 dark:bg-[#181920]/70 backdrop-blur-md border-slate-200/60 dark:border-white/[0.07]"
                    : "bg-white/30 dark:bg-white/[0.05] backdrop-blur-sm border-slate-200/30 dark:border-white/[0.05]"
              }`}
            >
              {/* Provider Header Badge & Copy Button */}
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-white/[0.04]">
                <div className="flex items-center gap-2">
                  <ProviderIcon
                    id={activeProviderObj.id}
                    className="w-4 h-4 shrink-0"
                    size={18}
                  />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {activeProviderObj.name}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {isLoading && !selectedAnswerContent && (
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold animate-pulse">
                      Generating answer...
                    </span>
                  )}
                </div>
              </div>

              {/* Response Content Body */}
              {selectedAnswerContent ? (
                <div
                  className="spectralens-response-wrapper text-slate-900 dark:text-slate-100 overflow-x-auto leading-relaxed font-normal select-text cursor-text"
                  dangerouslySetInnerHTML={{
                    __html: UTILS.sanitizeHtml(
                      typeof UTILS.markdownToHtml === "function"
                        ? UTILS.markdownToHtml(selectedAnswerContent)
                        : selectedAnswerContent,
                    ),
                  }}
                />
              ) : (
                /* Skeleton Loading Dots */
                <div className="flex items-center gap-2 py-3">
                  <div
                    className="w-2 h-2 rounded-full bg-blue-500 animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  />
                  <div
                    className="w-2 h-2 rounded-full bg-blue-500 animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  />
                  <div
                    className="w-2 h-2 rounded-full bg-blue-500 animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  />
                </div>
              )}

              {/* Footer with Timestamp and Action */}
              {selectedAnswerContent && (
                <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-white/[0.04] text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  <button
                    type="button"
                    onClick={handleCopyAiAnswer}
                    className="flex items-center gap-1.5 px-2 py-0.5 rounded-md hover:bg-slate-100 dark:hover:bg-white/[0.08] hover:text-blue-600 dark:hover:text-blue-400 transition-all cursor-pointer focus:outline-none"
                    title="Copy answer"
                  >
                    {copiedProviderId === selectedProvider ? (
                      <>
                        <IoCheckmark className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                          Copied
                        </span>
                      </>
                    ) : (
                      <>
                        <IoCopyOutline className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                  <span>{messageTime || getFormattedTime()}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Input Dock Bar */}
      <div
        className={`p-2.5 border-t shrink-0 relative ${
          contrastMode === "solid"
            ? "bg-slate-100 dark:bg-[#14161e] border-slate-200/90 dark:border-white/[0.08]"
            : "bg-transparent border-slate-200/50 dark:border-white/[0.06]"
        }`}
      >
        {/* Floating '@' Mention Autocomplete Popover */}
        {showMentionMenu && filteredMentionOptions.length > 0 && (
          <div
            ref={mentionMenuRef}
            className="absolute bottom-full left-3 right-3 mb-2 bg-white/95 dark:bg-[#181b24]/95 backdrop-blur-xl border border-slate-200/90 dark:border-white/[0.12] rounded-2xl shadow-xl overflow-hidden z-50 p-1.5 animate-in slide-in-from-bottom-2 duration-150"
          >
            <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Attach Context
            </div>
            <div className="flex flex-col gap-0.5">
              {filteredMentionOptions.map((opt, idx) => (
                <button
                  key={opt.id}
                  onClick={() => handleSelectMention(opt)}
                  className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-left transition-all cursor-pointer ${
                    idx === mentionSelectedIndex
                      ? "bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 font-medium"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06]"
                  }`}
                >
                  <span className="text-sm">{opt.icon}</span>
                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold">{opt.cmd}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-200/60 dark:bg-white/10 text-slate-600 dark:text-slate-300 font-medium">
                        {opt.badge}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                      {opt.desc}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Attached Screen Thumbnail Chip */}
        {attachedImage && (
          <div className="flex items-center gap-2 px-3 py-1.5 mb-2 bg-white dark:bg-[#191c25] border border-slate-200/90 dark:border-white/[0.1] rounded-xl shadow-xs animate-in fade-in duration-200">
            <div className="relative w-8 h-6 rounded overflow-hidden border border-slate-300 dark:border-white/10 shrink-0 bg-slate-200 dark:bg-black/30">
              <img src={attachedImage} alt="Screen attachment" className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate">
                Screen Attached
              </span>
              <span className="text-[9px] text-slate-400 dark:text-slate-500">
                Visual context will be sent to AI
              </span>
            </div>
            <button
              onClick={() => {
                setAttachedImage(null);
                setAttachedContextType(null);
              }}
              className="w-5 h-5 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
              title="Remove attachment"
            >
              <IoClose className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div
          className={`relative flex ${
            isMultiLineInput ? "items-end py-2" : "items-center py-1.5"
          } w-full pl-3 pr-2 min-h-[44px] rounded-2xl border focus-within:border-blue-500 dark:focus-within:border-blue-500/80 focus-within:ring-1 focus-within:ring-blue-500/50 shadow-xs transition-all ${
            contrastMode === "solid"
              ? "bg-white dark:bg-[#191c25] border-slate-200/90 dark:border-white/[0.09]"
              : contrastMode === "medium"
                ? "bg-white/70 dark:bg-[#191c25]/70 backdrop-blur-md border-slate-200/60 dark:border-white/[0.08]"
                : "bg-white/30 dark:bg-white/[0.06] backdrop-blur-sm border-slate-200/30 dark:border-white/[0.05]"
          }`}
        >
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything... (type @ for screen)"
            className="flex-1 bg-transparent text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 border-0 outline-none pr-1 resize-none custom-scrollbar leading-[20px] py-0 my-auto"
            style={{ minHeight: "20px", maxHeight: "120px", height: "20px" }}
          />

          {input && (
            <button
              onClick={() => setInput("")}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors focus:outline-none cursor-pointer mr-1 shrink-0"
              title="Clear text"
            >
              <IoClose className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Clean Vertical Divider */}
          <div className="w-[1px] h-5 bg-slate-200 dark:bg-white/10 mx-1.5 shrink-0" />

          {/* Action Buttons: Element Selector Shortcut & Send (Stacked vertically when 3+ lines for extra text width) */}
          <div
            className={`flex ${
              isMultiLineInput ? "flex-col items-center gap-1.5 justify-end" : "flex-row items-center gap-1"
            } shrink-0 transition-all duration-200`}
          >
            <button
              onClick={onOpenSelector}
              title="Inspect & Select Page Element"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-all focus:outline-none cursor-pointer"
            >
              <ElementSelectorIcon className="w-4 h-4" size={16} />
            </button>

            {/* Send / Stop Button */}
            {isLoading ? (
              <button
                onClick={handleStopFetch}
                title="Stop Fetching"
                className="w-7 h-7 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white flex items-center justify-center shadow-xs transition-all focus:outline-none cursor-pointer"
              >
                <IoSquare className="w-3 h-3 text-white fill-current animate-pulse" />
              </button>
            ) : (
              <button
                onClick={() => handleSendMessage()}
                disabled={input.trim() === "" && !attachedImage}
                title="Send Prompt"
                className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all focus:outline-none ${
                  input.trim() === "" && !attachedImage
                    ? "bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 active:scale-95 text-white shadow-xs cursor-pointer"
                }`}
              >
                <SendPlaneIcon className="w-3.5 h-3.5" size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
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
