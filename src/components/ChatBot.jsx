import PropTypes from "prop-types";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  IoTimeOutline,
  IoAdd,
  IoCameraOutline,
  IoDocumentTextOutline,
  IoCropOutline,
} from "react-icons/io5";
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
    IconComponent: IoCameraOutline,
  },
  {
    id: "page",
    cmd: "@page",
    label: "Page",
    badge: "Page Text",
    desc: "Attach page readable text",
    IconComponent: IoDocumentTextOutline,
  },
  {
    id: "area",
    cmd: "@area",
    label: "Area",
    badge: "Crop Area",
    desc: "Select on-screen area",
    IconComponent: IoCropOutline,
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
  const [isViewingHistory, setIsViewingHistory] = useState(false);
  const lastHandledNewChatRef = useRef(0);
  
  // Continuous Conversation Turns: Array<{ id, question, questionImage, questionPage, messageTime, answers, isLoading, selectedProvider }>
  const [turns, setTurns] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState(
    initialHistoryItem
      ? Object.keys(initialHistoryItem.answers || {})[0] || null
      : null,
  );
  const [viewedProviders, setViewedProviders] = useState(new Set());
  const [unreadProviders, setUnreadProviders] = useState(new Set());
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [copiedTurnId, setCopiedTurnId] = useState(null);
  const [copiedProviderId, setCopiedProviderId] = useState(null);
  const currentRequestIdRef = useRef(null);

  // Screen/Context attachment state
  const [attachedImage, setAttachedImage] = useState(null);
  const [attachedPage, setAttachedPage] = useState(null);
  const [attachedContextType, setAttachedContextType] = useState(null);

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

  const scrollToBottom = useCallback((smooth = false) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, []);

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

  const handleCopyUserQuestion = useCallback((questionText, turnId) => {
    if (!questionText) return;
    navigator.clipboard
      .writeText(questionText)
      .then(() => {
        setCopiedTurnId(turnId);
        setTimeout(() => setCopiedTurnId(null), 2000);
      })
      .catch(() => {});
  }, []);

  const handleCopyAiResponse = useCallback((activeAiResponseContent, providerId) => {
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
          setCopiedProviderId(providerId);
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
          setCopiedProviderId(providerId);
          setTimeout(() => setCopiedProviderId(null), 2000);
        })
        .catch(() => {
          fallbackCopy(cleanText);
        });
    } else {
      fallbackCopy(cleanText);
    }
  }, []);

  const appIconUrl =
    typeof chrome !== "undefined" && chrome.runtime?.getURL
      ? chrome.runtime.getURL("assets/icons/128.png")
      : "";

  const hasAnyActivity = Boolean(turns.length > 0 || isLoading);

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

  // Auto scroll to bottom instantly when switching AI providers
  useLayoutEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [selectedProvider]);

  // Mark currently selected provider as viewed
  useEffect(() => {
    if (selectedProvider) {
      setViewedProviders((prev) => new Set([...prev, selectedProvider]));
    }
  }, [selectedProvider]);

  // Tab selection helper: switch provider, mark as viewed, clear unread dot, and scroll to bottom instantly
  const handleSelectProvider = useCallback((providerId) => {
    setSelectedProvider(providerId);
    setViewedProviders((prev) => new Set([...prev, providerId]));
    setUnreadProviders((prev) => {
      if (!prev.has(providerId)) return prev;
      const next = new Set(prev);
      next.delete(providerId);
      return next;
    });
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
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
      const cleanBefore = textBeforeCursor.replace(/(?:^|\s)@([a-zA-Z0-9_-]*)$/, " ").trimStart();
      const finalInput = (cleanBefore + (textAfterCursor ? " " + textAfterCursor : "")).trim();

      setInput(finalInput);

      if (option.id === "screen") {
        setAttachedContextType("screen");
        UTILS.pagePostMessage("IF_B_CAPTURE_SCREEN", {}, window.parent);
      } else if (option.id === "page") {
        setAttachedContextType("page");
        UTILS.pagePostMessage("IF_B_CAPTURE_PAGE", {}, window.parent);
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

  // Close more menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        moreMenuRef.current &&
        !moreMenuRef.current.contains(e.target) &&
        !e.target.closest("#more-models-btn")
      ) {
        setIsMoreMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", handleClickOutside);
    return () => document.removeEventListener("pointerdown", handleClickOutside);
  }, []);

  // Context response listener (screen capture / page capture / area crop capture)
  useEffect(() => {
    UTILS.pageOnMessage("IF_B_CAPTURE_SCREEN", (data) => {
      if (data?.image) {
        setAttachedImage(data.image);
        setAttachedPage(null);
        setAttachedContextType("screen");
      }
    });

    UTILS.pageOnMessage("IF_B_CAPTURE_PAGE", (data) => {
      if (data && data.success) {
        setAttachedPage(data);
        setAttachedImage(null);
        setAttachedContextType("page");
      }
    });

    UTILS.pageOnMessage("C_IF_SET_AREA_IMAGE", (data) => {
      if (data?.image) {
        setAttachedImage(data.image);
        setAttachedPage(null);
        setAttachedContextType("area");
        setTimeout(() => {
          textareaRef.current?.focus();
        }, 50);
      }
    });
  }, []);

  // Load history item if requested from outside
  useEffect(() => {
    if (initialHistoryItem) {
      setInput("");
      setIsViewingHistory(true);
      if (Array.isArray(initialHistoryItem.turns) && initialHistoryItem.turns.length > 0) {
        setTurns(initialHistoryItem.turns);
        const answeredProviders = [];
        for (const t of initialHistoryItem.turns) {
          if (t.answers) {
            for (const [k, ans] of Object.entries(t.answers)) {
              if (ans?.content || ans?.answer || (typeof ans === "string" && ans.trim())) {
                answeredProviders.push(k);
              }
            }
          }
        }
        const lastTurn = initialHistoryItem.turns[initialHistoryItem.turns.length - 1];
        const targetProv =
          lastTurn?.selectedProvider && answeredProviders.includes(lastTurn.selectedProvider)
            ? lastTurn.selectedProvider
            : answeredProviders[0] || "google";
        setSelectedProvider(targetProv);
      } else if (initialHistoryItem.question || initialHistoryItem.answers) {
        // Legacy history format
        const legacyAnswers = initialHistoryItem.answers || {};
        const firstAnswered = Object.keys(legacyAnswers)[0] || "google";
        const legacyTurn = {
          id: initialHistoryItem.id || Date.now().toString(),
          question: initialHistoryItem.question || "",
          questionImage: initialHistoryItem.image || null,
          questionPage: initialHistoryItem.page || null,
          messageTime: formatDateTimeBadge(initialHistoryItem.timestamp),
          answers: legacyAnswers,
          isLoading: false,
          selectedProvider: firstAnswered,
        };
        setTurns([legacyTurn]);
        setSelectedProvider(firstAnswered);
      }
      if (onClearLoadedHistory) {
        onClearLoadedHistory();
      }
    }
  }, [initialHistoryItem, onClearLoadedHistory]);

  // Stop active AI fetching
  const handleStopFetch = useCallback(() => {
    currentRequestIdRef.current = "stopped_" + Date.now();
    setIsLoading(false);
    setTurns((prev) => prev.map((t) => ({ ...t, isLoading: false })));
    UTILS.pagePostMessage("IF_B_STOP_FETCH", {}, window.parent);
  }, []);

  // Start fresh chat session (clears the continuous chat thread and resets background sessions)
  const handleNewChat = useCallback(() => {
    handleStopFetch();
    setIsViewingHistory(false);
    setInput("");
    setTurns([]);
    setAttachedImage(null);
    setAttachedPage(null);
    setAttachedContextType(null);
    setShowMentionMenu(false);
    setIsLoading(false);
    currentRequestIdRef.current = null;
    setUnreadProviders(new Set());
    UTILS.pagePostMessage("IF_B_NEW_CHAT", {}, window.parent);
    if (textareaRef.current) {
      textareaRef.current.style.height = "24px";
    }
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  }, [handleStopFetch]);

  // Listen for reset trigger from controls settings change
  useEffect(() => {
    const unsub = UTILS.pageOnMessage("IF_C_RESET_TO_NEW_CHAT", () => {
      handleNewChat();
    });
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, [handleNewChat]);

  const prevEnabledProvidersKeyRef = useRef(null);

  // Live sync active AI providers from Chrome storage & settings
  useEffect(() => {
    const loadControls = () => {
      UTILS.chromeStorageGetLocal(UTILS.KEYS.CONTROLS, (data) => {
        const storedProviders = data?.aiProviders;
        if (storedProviders && Array.isArray(storedProviders)) {
          const enabledProviders = storedProviders.filter((p) => p.enabled);
          const disabledProviders = storedProviders.filter((p) => !p.enabled);
          const enabledKey = enabledProviders.map((p) => p.id).sort().join(",");

          // If enabled provider configuration changed, automatically start a fresh new chat
          if (
            prevEnabledProvidersKeyRef.current !== null &&
            prevEnabledProvidersKeyRef.current !== enabledKey &&
            (turns.length > 0 || isLoading)
          ) {
            handleNewChat();
          }
          prevEnabledProvidersKeyRef.current = enabledKey;

          setAiProviders([...enabledProviders, ...disabledProviders]);
          if (enabledProviders.length > 0) {
            setSelectedProvider((prev) => {
              if (!prev || !enabledProviders.some((p) => p.id === prev)) {
                return enabledProviders[0].id;
              }
              return prev;
            });
          }
        }
        if (data?.concurrentRequests) {
          setMaxConcurrentRequest(Number(data.concurrentRequests));
        }
      });
    };

    loadControls();

    if (typeof chrome !== "undefined" && chrome.storage?.onChanged) {
      const storageListener = (changes, areaName) => {
        if (areaName === "local" && changes[UTILS.KEYS.CONTROLS]) {
          loadControls();
        }
      };
      chrome.storage.onChanged.addListener(storageListener);
      return () => chrome.storage.onChanged.removeListener(storageListener);
    }
  }, [turns.length, isLoading, handleNewChat]);

  useEffect(() => {
    UTILS.pageOnMessage("IF_C_GET_CURRENT_CONTROLS", (data) => {
      const { aiProviders: storedProviders, concurrentRequests } =
        data?.controls || {};

      if (storedProviders && Array.isArray(storedProviders)) {
        const enabledProviders = storedProviders.filter((p) => p.enabled);
        const disabledProviders = storedProviders.filter((p) => !p.enabled);
        const enabledKey = enabledProviders.map((p) => p.id).sort().join(",");

        if (
          prevEnabledProvidersKeyRef.current !== null &&
          prevEnabledProvidersKeyRef.current !== enabledKey &&
          (turns.length > 0 || isLoading)
        ) {
          handleNewChat();
        }
        prevEnabledProvidersKeyRef.current = enabledKey;

        setAiProviders([...enabledProviders, ...disabledProviders]);
        if (enabledProviders.length > 0) {
          setSelectedProvider((prev) => {
            if (!prev || !enabledProviders.some((p) => p.id === prev)) {
              return enabledProviders[0].id;
            }
            return prev;
          });
        }
      }
      if (concurrentRequests) {
        setMaxConcurrentRequest(concurrentRequests);
      }
    });
  }, [turns.length, isLoading, handleNewChat]);

  // Get answer from background script
  const dispatchAiRequestToBackground = useCallback(
    async (
      question,
      provider = "google",
      requestId,
      image = null,
    ) => {
      console.log(
        `[SpectraLens:ChatBot] 🚀 Posting IF_B_GET_ANSWER for provider: "${provider}", query: "${question.slice(0, 30)}..."${image ? " (with screen image attachment)" : ""} (requestId: ${requestId})`,
      );
      UTILS.pagePostMessage(
        "IF_B_GET_ANSWER",
        { question, provider, requestId, image },
        window.parent,
      );
    },
    [],
  );

  // Request answer on demand for an earlier turn (e.g. if provider was added later)
  const handleAskProviderForTurn = useCallback(
    (turnId, questionText, providerId) => {
      if (!turnId || !questionText || !providerId) return;

      setTurns((prev) =>
        prev.map((t) => {
          if (t.id !== turnId) return t;
          const currentLoading = Array.isArray(t.loadingProviders)
            ? [...t.loadingProviders]
            : [];
          if (!currentLoading.includes(providerId)) {
            currentLoading.push(providerId);
          }
          return {
            ...t,
            loadingProviders: currentLoading,
            isLoading: true,
          };
        }),
      );
      setIsLoading(true);

      dispatchAiRequestToBackground(questionText, providerId, turnId);
    },
    [dispatchAiRequestToBackground],
  );

  // Concurrent provider loading (only queries ENABLED providers!)
  const fetchAiResponsesWithConcurrency = useCallback(
    async (question, requestId, image = null) => {
      const enabledProviders = aiProviders.filter((p) => p.enabled);
      const providersToProcess =
        enabledProviders.length > 0
          ? [...enabledProviders]
          : [{ id: "google", name: "Google AI", enabled: true }];
      const activeRequests = new Map();

      const startProviderRequest = (provider) => {
        dispatchAiRequestToBackground(question, provider.id, requestId, image);

        const promise = new Promise((resolve) => {
          const checkAnswer = () => {
            if (currentRequestIdRef.current !== requestId) {
              resolve({ cancelled: true });
              return;
            }

            setTurns((currentTurns) => {
              const currentTurn = currentTurns.find((t) => t.id === requestId);
              if (currentTurn?.answers?.[provider.id]) {
                resolve({ provider, completed: true });
              } else {
                setTimeout(checkAnswer, 400);
              }
              return currentTurns;
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
    [aiProviders, maxConcurrentRequest, dispatchAiRequestToBackground],
  );

  // Providers list memoized
  const allProvidersList = useMemo(() => {
    const list = [...aiProviders];
    const existingIds = new Set(aiProviders.map((p) => p.id));
    const defaultNames = {
      google: "Google AI",
      chatgpt: "ChatGPT",
      claude: "Claude",
      gemini: "Gemini",
      grok: "Grok",
      perplexity: "Perplexity",
      bing: "Bing Copilot",
    };
    turns.forEach((turn) => {
      Object.keys(turn.answers || {}).forEach((id) => {
        if (!existingIds.has(id)) {
          list.push({
            id,
            name: defaultNames[id.toLowerCase()] || (id.charAt(0).toUpperCase() + id.slice(1)),
            enabled: false,
          });
          existingIds.add(id);
        }
      });
    });
    return list;
  }, [aiProviders, turns]);

  // Combine only ACTIVE enabled providers, plus historical answers from past turns
  const availableProviderTabs = useMemo(() => {
    const enabled = aiProviders.filter((p) => p.enabled);
    const existingIds = new Set(enabled.map((p) => p.id));
    const combined = [...enabled];

    turns.forEach((turn) => {
      Object.keys(turn.answers || {}).forEach((providerId) => {
        if (!existingIds.has(providerId)) {
          const matching = aiProviders.find((p) => p.id === providerId);
          combined.push({
            id: providerId,
            name: matching?.name || (providerId.charAt(0).toUpperCase() + providerId.slice(1)),
            enabled: false,
          });
          existingIds.add(providerId);
        }
      });
    });

    if (combined.length === 0) {
      return [
        { id: "google", name: "Google AI", enabled: true },
      ];
    }
    return combined;
  }, [aiProviders, turns]);

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
      setUnreadProviders(new Set());

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

      const displayQuestion =
        actualInput ||
        (attachedPage
          ? "Summarize and explain this page"
          : attachedImage
            ? "Explain what is on this screen"
            : "");

      const enabledList = aiProviders.filter((p) => p.enabled);
      const requestedIds =
        enabledList.length > 0
          ? enabledList.map((p) => p.id)
          : ["google"];

      // Append new Turn to continuous conversation list (one after one)
      const newTurn = {
        id: requestId,
        question: displayQuestion,
        questionImage: currentImage,
        questionPage: attachedPage,
        messageTime: getFormattedTimeBadge(),
        answers: {},
        isLoading: true,
        loadingProviders: requestedIds,
        selectedProvider: targetProvider,
      };

      setTurns((prev) => [...prev, newTurn]);

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

  // Receive streaming / final AI answers and update corresponding turn in the conversation
  useEffect(() => {
    UTILS.pageOnMessage("IF_B_GET_ANSWER", (data) => {
      console.log("[SpectraLens:ChatBot] 📥 Received IF_B_GET_ANSWER in UI:", data);
      if (!data || typeof data !== "object") return;

      const provider = data.provider || "google";
      const answerText =
        data.answer || data.content || (typeof data === "string" ? data : "");

      console.log(`[SpectraLens:ChatBot] ✅ Updating answer for "${provider}", text length: ${answerText.length}`);

      setTurns((prevTurns) => {
        const turnIndex = prevTurns.findIndex((t) => t.id === (data.requestId || currentRequestIdRef.current));
        if (turnIndex === -1 && prevTurns.length === 0) return prevTurns;

        const targetIndex = turnIndex >= 0 ? turnIndex : prevTurns.length - 1;
        const targetTurn = prevTurns[targetIndex];
        if (!targetTurn) return prevTurns;

        const isFirstAnswerForTurn = Object.keys(targetTurn.answers || {}).length === 0;
        const updatedAnswers = {
          ...targetTurn.answers,
          [provider]: {
            ...data,
            answer: answerText,
            content: answerText,
            provider: provider,
            timestamp: Date.now(),
          },
        };

        const currentLoading = Array.isArray(targetTurn.loadingProviders)
          ? targetTurn.loadingProviders.filter((id) => id !== provider)
          : [];
        const isStillLoading = currentLoading.length > 0;

        const updatedTurn = {
          ...targetTurn,
          answers: updatedAnswers,
          loadingProviders: currentLoading,
          isLoading: isStillLoading,
        };

        if (isFirstAnswerForTurn) {
          setSelectedProvider(provider);
          setViewedProviders((v) => new Set([...v, provider]));
        } else {
          setSelectedProvider((currentSelected) => {
            if (provider !== currentSelected) {
              setUnreadProviders((v) => new Set([...v, provider]));
            }
            return currentSelected;
          });
        }

        if (!isStillLoading) {
          setIsLoading(false);
        }

        const newTurns = [...prevTurns];
        newTurns[targetIndex] = updatedTurn;

        // Save complete conversation thread to Chrome local storage history
        UTILS.chromeStorageGetLocal(UTILS.KEYS.HISTORY, (prevHistory = []) => {
          const historyList = Array.isArray(prevHistory) ? prevHistory : [];
          const sessionId = newTurns[0]?.id || Date.now().toString();
          const existingIndex = historyList.findIndex((item) => item.id === sessionId);

          const allSessionProviders = new Set();
          const mergedAllAnswers = {};
          for (const t of newTurns) {
            if (t.answers) {
              for (const [pId, pVal] of Object.entries(t.answers)) {
                allSessionProviders.add(pId);
                mergedAllAnswers[pId] = pVal;
              }
            }
          }

          const updatedHistoryItem = {
            id: sessionId,
            question: newTurns[0]?.question || "Conversation",
            timestamp: Date.now(),
            turns: newTurns,
            answers: mergedAllAnswers,
            providers: Array.from(allSessionProviders),
          };

          let updatedHistory;
          if (existingIndex >= 0) {
            updatedHistory = [...historyList];
            updatedHistory[existingIndex] = updatedHistoryItem;
          } else {
            updatedHistory = [updatedHistoryItem, ...historyList].slice(0, 50);
          }

          UTILS.chromeStorageSetLocal(UTILS.KEYS.HISTORY, updatedHistory, () => {});
        });

        return newTurns;
      });
    });

    UTILS.pageOnMessage("IF_B_AI_REQUEST_COMPLETE", () => {
      setIsLoading(false);
      setTurns((prev) => prev.map((t) => ({ ...t, isLoading: false })));
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
        }, 50);
      }
    });
  }, [
    handleSendMessage,
    handleCopyUserQuestion,
    handleCopyAiResponse,
    handleSelectProvider,
    allProvidersList,
  ]);

  // Focus textarea when chat opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (newChatTrigger > 0 && newChatTrigger !== lastHandledNewChatRef.current) {
      lastHandledNewChatRef.current = newChatTrigger;
      handleNewChat();
    }
  }, [newChatTrigger, handleNewChat]);

  // Combined answers for top model tabs across turns
  const combinedAnswers = useMemo(() => {
    if (turns.length === 0) return {};
    const merged = {};
    for (const turn of turns) {
      if (turn.answers) {
        Object.assign(merged, turn.answers);
      }
    }
    return merged;
  }, [turns]);

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
        unreadProviders={unreadProviders}
        answers={combinedAnswers}
        hasAnyActivity={hasAnyActivity}
        contrastMode={contrastMode}
        isMoreMenuOpen={isMoreMenuOpen}
        setIsMoreMenuOpen={setIsMoreMenuOpen}
        onSelectProvider={handleSelectProvider}
        moreMenuRef={moreMenuRef}
      />

      {/* Main Messages Scroll Area (One after one continuous chat) */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto custom-scrollbar p-3.5 space-y-4"
      >
        {/* Welcome Empty State */}
        {turns.length === 0 && !isLoading && (
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

        {/* Sequential Conversation Turns (One after one) */}
        {turns.map((turn) => {
          const turnAnswers = turn.answers || {};
          const availableAnswerKeys = Object.keys(turnAnswers).filter(
            (k) =>
              turnAnswers[k]?.content ||
              turnAnswers[k]?.answer ||
              (typeof turnAnswers[k] === "string" && turnAnswers[k].trim()),
          );

          const requestedProviderId =
            selectedProvider || turn.selectedProvider || "google";
          const pAns = turnAnswers[requestedProviderId];
          const hasDirectContent = Boolean(
            pAns?.content ||
              pAns?.answer ||
              (typeof pAns === "string" && pAns.trim()),
          );

          const isCardLoading = Boolean(
            !hasDirectContent &&
              (turn.isLoading ||
                (Array.isArray(turn.loadingProviders) &&
                  turn.loadingProviders.includes(requestedProviderId))),
          );

          let effectiveProviderId = requestedProviderId;
          let isFallback = false;

          // If current tab has no answer and is not loading, but other providers answered this turn, fallback to the turn's answering provider
          if (!hasDirectContent && !isCardLoading && availableAnswerKeys.length > 0) {
            effectiveProviderId =
              turn.selectedProvider && availableAnswerKeys.includes(turn.selectedProvider)
                ? turn.selectedProvider
                : availableAnswerKeys[0];
            isFallback = effectiveProviderId !== requestedProviderId;
          }

          const finalAns = turnAnswers[effectiveProviderId];
          const activeContent =
            finalAns?.content ||
            finalAns?.answer ||
            (typeof finalAns === "string" ? finalAns : "");
          const providerMeta = allProvidersList.find(
            (p) => p.id === effectiveProviderId,
          ) || {
            id: effectiveProviderId,
            name:
              effectiveProviderId.charAt(0).toUpperCase() +
              effectiveProviderId.slice(1),
          };

          const requestedProviderMeta = allProvidersList.find(
            (p) => p.id === requestedProviderId,
          ) || {
            id: requestedProviderId,
            name:
              requestedProviderId.charAt(0).toUpperCase() +
              requestedProviderId.slice(1),
          };

          return (
            <div key={turn.id} data-turn-id={turn.id} className="space-y-3.5">
              {/* User Question Message Bubble */}
              <ChatMessageBubble
                lastQuestion={turn.question}
                lastQuestionImage={turn.questionImage}
                lastQuestionPage={turn.questionPage}
                messageTime={turn.messageTime}
                isUserCopied={copiedTurnId === turn.id}
                onCopyUserQuestion={() =>
                  handleCopyUserQuestion(turn.question, turn.id)
                }
              />

              {/* AI Response Card for this Turn */}
              <ChatAiResponseCard
                activeAiResponseContent={activeContent}
                isLoading={isCardLoading}
                activeAiProviderMetadata={providerMeta}
                copiedProviderId={
                  copiedProviderId === effectiveProviderId
                    ? effectiveProviderId
                    : null
                }
                selectedProvider={effectiveProviderId}
                messageTime={turn.messageTime}
                contrastMode={contrastMode}
                isFallback={isFallback}
                requestedProviderMetadata={requestedProviderMeta}
                onAskCurrentProvider={() =>
                  handleAskProviderForTurn(
                    turn.id,
                    turn.question,
                    requestedProviderId,
                  )
                }
                onCopyAiResponse={() =>
                  handleCopyAiResponse(activeContent, effectiveProviderId)
                }
              />
            </div>
          );
        })}
      </div>

      {/* Bottom Input Dock Bar OR Past History Info Banner */}
      {isViewingHistory ? (
        <div
          className={`p-3 border-t shrink-0 flex items-center justify-between gap-3 ${
            contrastMode === "solid"
              ? "bg-slate-100 dark:bg-[#14161e] border-slate-200/90 dark:border-white/[0.08]"
              : "bg-white/50 dark:bg-black/20 backdrop-blur-md border-slate-200/50 dark:border-white/[0.06]"
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
              <IoTimeOutline className="w-4 h-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                Viewing Past Conversation
              </span>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                Session ended • Start a new chat to ask questions
              </span>
            </div>
          </div>
          <button
            onClick={handleNewChat}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold shadow-xs transition-all cursor-pointer shrink-0"
          >
            <IoAdd className="w-4 h-4" />
            <span>New Chat</span>
          </button>
        </div>
      ) : (
        <ChatPromptInput
          input={input}
          setInput={setInput}
          isLoading={isLoading}
          attachedImage={attachedImage}
          setAttachedImage={setAttachedImage}
          attachedPage={attachedPage}
          setAttachedPage={setAttachedPage}
          attachedContextType={attachedContextType}
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
      )}
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
