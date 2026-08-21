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
  IoAdd,
  IoCameraOutline,
  IoCropOutline,
  IoDocumentTextOutline,
  IoTimeOutline,
} from "react-icons/io5";
import ChatAiResponseCard from "../features/chat/ChatAiResponseCard.jsx";
import ChatMessageBubble from "../features/chat/ChatMessageBubble.jsx";
import ChatModelTabs from "../features/chat/ChatModelTabs.jsx";
import ChatPromptInput from "../features/chat/ChatPromptInput.jsx";
import { useTheme } from "../hooks/useThemeHook.jsx";
import UTILS from "./../utils/utilsModule.js";

/**
 * =========================================================================
 * ⚙️ SPECTRALENS AI PROVIDER CONFIGURATION
 * =========================================================================
 * Modify these variables to customize AI provider limits for testing or production:
 *
 * - MAX_PRIMARY_PROVIDER_TABS: Number of AI tabs displayed as primary buttons in the
 *   chat header before placing additional ones into the "More" dropdown menu.
 *   (Default: 3. Set higher e.g. 5, 8 or Infinity to display all providers at once)
 *
 * - MAX_CONCURRENT_AI_PROVIDERS: Maximum number of AI providers queried in parallel
 *   simultaneously when submitting a question.
 *   (Default: 3. Set to 1 for sequential, or 5, 8, Infinity for all at once)
 * =========================================================================
 */
export const MAX_PRIMARY_PROVIDER_TABS = 3;
export const MAX_CONCURRENT_AI_PROVIDERS = 3;

export const DEFAULT_AI_PROVIDERS = [
  { id: "google", name: "Google AI", enabled: true },
  { id: "chatgpt", name: "ChatGPT", enabled: true },
  { id: "gemini", name: "Gemini", enabled: true },
  { id: "claude", name: "Claude", enabled: false },
  { id: "perplexity", name: "Perplexity", enabled: false },
  { id: "grok", name: "Grok AI", enabled: false },
];

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
  onTriggerOcr,
  onTriggerArea,
}) {
  const { contrastMode } = useTheme();
  const [input, setInput] = useState(pendingInput || "");
  const [isLoading, setIsLoading] = useState(false);
  const [isViewingHistory, setIsViewingHistory] = useState(false);
  const lastHandledNewChatRef = useRef(0);

  // Continuous Conversation Turns: Array<{ id, question, questionImage, questionPage, messageTime, answers, isLoading, selectedProvider }>
  const [turns, setTurns] = useState([]);
  const turnsRef = useRef(turns);
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
  const isSubmittingRef = useRef(false);
  const activeProviderResolversRef = useRef(new Map());
  const historySaveTimeoutRef = useRef(null);

  // Screen/Context attachment state
  const [attachedImage, setAttachedImage] = useState(null);
  const [attachedPage, setAttachedPage] = useState(null);
  const [attachedContextType, setAttachedContextType] = useState(null);

  // '@' mention autocomplete state
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionSelectedIndex, setMentionSelectedIndex] = useState(0);
  const [mentionQuery, setMentionQuery] = useState("");
  const mentionMenuRef = useRef(null);

  const [aiProviders, setAiProviders] = useState(DEFAULT_AI_PROVIDERS);
  const [maxConcurrentRequest, setMaxConcurrentRequest] = useState(
    MAX_CONCURRENT_AI_PROVIDERS,
  );

  const scrollContainerRef = useRef(null);
  const rootRef = useRef(null);
  const textareaRef = useRef(null);
  const moreMenuRef = useRef(null);

  const scrollToBottom = useCallback((smooth = false) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop =
        scrollContainerRef.current.scrollHeight;
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

  const handleCopyAiResponse = useCallback(
    (activeAiResponseContent, providerId) => {
      if (!activeAiResponseContent) return;

      let cleanText = activeAiResponseContent;
      if (
        typeof activeAiResponseContent === "string" &&
        /<[a-z][\s\S]*>/i.test(activeAiResponseContent)
      ) {
        try {
          cleanText =
            typeof UTILS.htmlToMarkdown === "function"
              ? UTILS.htmlToMarkdown(activeAiResponseContent)
              : activeAiResponseContent;
        } catch {
          try {
            const tempEl = document.createElement("div");
            tempEl.innerHTML = activeAiResponseContent;
            cleanText = (tempEl.innerText || tempEl.textContent || "").trim();
          } catch {
            cleanText = activeAiResponseContent;
          }
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
    },
    [],
  );

  const appIconUrl = (() => {
    try {
      if (typeof chrome !== "undefined" && chrome.runtime?.id && chrome.runtime?.getURL) {
        return chrome.runtime.getURL("assets/icons/128.png");
      }
    } catch {}
    return "";
  })();

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
      setIsMultiLineInput(
        targetHeight >= 60 || (input.match(/\n/g) || []).length >= 2,
      );
    }
  }, [input]);

  // Sync pending input from OCR scan
  useEffect(() => {
    if (pendingInput !== null && pendingInput !== undefined) {
      setInput((prev) => {
        if (!prev || prev.trim() === "") return pendingInput;
        return prev + (prev.endsWith("\n") ? "" : "\n") + pendingInput;
      });
      onConsumePendingInput?.();
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = "24px";
          const scrollHeight = textareaRef.current.scrollHeight;
          const targetHeight = Math.min(Math.max(24, scrollHeight), 120);
          textareaRef.current.style.height = `${targetHeight}px`;
          setIsMultiLineInput(
            targetHeight >= 60 || (pendingInput.match(/\n/g) || []).length >= 2,
          );
          textareaRef.current.focus();
        }
      }, 50);
    }
  }, [pendingInput, onConsumePendingInput]);

  // Auto scroll to bottom instantly when switching AI providers
  useLayoutEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop =
        scrollContainerRef.current.scrollHeight;
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
      scrollContainerRef.current.scrollTop =
        scrollContainerRef.current.scrollHeight;
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
      const cleanBefore = textBeforeCursor
        .replace(/(?:^|\s)@([a-zA-Z0-9_-]*)$/, " ")
        .trimStart();
      const finalInput = (
        cleanBefore + (textAfterCursor ? " " + textAfterCursor : "")
      ).trim();

      setInput(finalInput);

      if (option.id === "screen") {
        setAttachedContextType("screen");
        UTILS.pagePostMessage("IF_B_CAPTURE_SCREEN", {}, window.parent);
      } else if (option.id === "page") {
        setAttachedContextType("page");
        UTILS.pagePostMessage("IF_B_CAPTURE_PAGE", {}, window.parent);
      } else if (option.id === "area") {
        setAttachedContextType("area");
        if (onTriggerArea) {
          onTriggerArea();
        } else if (onOpenSelector) {
          onOpenSelector();
        }
      }

      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    },
    [input, onTriggerArea, onOpenSelector],
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
    return () =>
      document.removeEventListener("pointerdown", handleClickOutside);
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
      setIsLoading(false);
      isSubmittingRef.current = false;
      if (
        Array.isArray(initialHistoryItem.turns) &&
        initialHistoryItem.turns.length > 0
      ) {
        const sanitizedTurns = initialHistoryItem.turns.map((t) => ({
          ...t,
          isLoading: false,
          loadingProviders: [],
        }));
        setTurns(sanitizedTurns);
        turnsRef.current = sanitizedTurns;
        const answeredProviders = [];
        for (const t of sanitizedTurns) {
          if (t.answers) {
            for (const [k, ans] of Object.entries(t.answers)) {
              if (
                ans?.content ||
                ans?.answer ||
                (typeof ans === "string" && ans.trim())
              ) {
                answeredProviders.push(k);
              }
            }
          }
        }
        const lastTurn =
          sanitizedTurns[sanitizedTurns.length - 1];
        const targetProv =
          lastTurn?.selectedProvider &&
          answeredProviders.includes(lastTurn.selectedProvider)
            ? lastTurn.selectedProvider
            : answeredProviders[0] || "google";
        setSelectedProvider(targetProv);
      } else if (initialHistoryItem.id) {
        UTILS.getChatSession(initialHistoryItem.id).then((fullChat) => {
          if (fullChat?.turns && fullChat.turns.length > 0) {
            const sanitizedTurns = fullChat.turns.map((t) => ({
              ...t,
              isLoading: false,
              loadingProviders: [],
            }));
            setTurns(sanitizedTurns);
            turnsRef.current = sanitizedTurns;
            const lastTurn = sanitizedTurns[sanitizedTurns.length - 1];
            if (lastTurn?.selectedProvider) {
              setSelectedProvider(lastTurn.selectedProvider);
            }
          }
        });
      }
      if (onClearLoadedHistory) {
        onClearLoadedHistory();
      }
    }
  }, [initialHistoryItem, onClearLoadedHistory]);

  // Immediate history storage writer for state transitions (e.g. toggling models, starting new chat)
  const saveHistoryImmediately = useCallback((turnsToSave) => {
    if (!turnsToSave || turnsToSave.length === 0) return;
    if (historySaveTimeoutRef.current) {
      clearTimeout(historySaveTimeoutRef.current);
    }
    const sessionId = turnsToSave[0]?.id || Date.now().toString();

    // Sanitize turns so NO turn is ever saved to history with active loading or pending state
    const sanitizedTurns = turnsToSave.map((turn) => {
      const cleanAnswers = {};
      if (turn.answers && typeof turn.answers === "object") {
        for (const [pId, pVal] of Object.entries(turn.answers)) {
          if (pVal && typeof pVal === "object") {
            cleanAnswers[pId] = {
              ...pVal,
              isLoading: false,
            };
          } else {
            cleanAnswers[pId] = pVal;
          }
        }
      }
      return {
        ...turn,
        isLoading: false,
        loadingProviders: [],
        answers: cleanAnswers,
      };
    });

    const allSessionProviders = new Set();
    const mergedAllAnswers = {};
    for (const t of sanitizedTurns) {
      if (t.answers) {
        for (const [pId, pVal] of Object.entries(t.answers)) {
          allSessionProviders.add(pId);
          mergedAllAnswers[pId] = pVal;
        }
      }
    }

    const firstTurnQuestion =
      sanitizedTurns[0]?.question?.trim() ||
      (sanitizedTurns[0]?.questionImage
        ? "Visual Query / Screenshot"
        : sanitizedTurns[0]?.questionPage
          ? "Web Page Analysis"
          : "Conversation Session");

    const sessionData = {
      id: sessionId,
      question: firstTurnQuestion,
      timestamp: Date.now(),
      turns: sanitizedTurns,
      answers: mergedAllAnswers,
      providers: Array.from(allSessionProviders),
    };

    if (typeof UTILS.saveChatSession === "function") {
      UTILS.saveChatSession(sessionData);
    } else {
      UTILS.chromeStorageSetLocal(
        (UTILS.KEYS.CHAT_PREFIX || "SpectraLens-Chat-") + sessionId,
        sessionData,
      );
    }
  }, []);

  // Debounced history storage writer to prevent CPU & GC churn during high-frequency streaming
  const saveHistoryDebounced = useCallback((updatedTurns) => {
    if (!updatedTurns || updatedTurns.length === 0) return;
    if (historySaveTimeoutRef.current) {
      clearTimeout(historySaveTimeoutRef.current);
    }
    historySaveTimeoutRef.current = setTimeout(() => {
      saveHistoryImmediately(updatedTurns);
    }, 1200);
  }, [saveHistoryImmediately]);

  useEffect(() => {
    return () => {
      if (historySaveTimeoutRef.current) {
        clearTimeout(historySaveTimeoutRef.current);
      }
    };
  }, []);

  // Stop active AI fetching
  const handleStopFetch = useCallback(() => {
    isSubmittingRef.current = false;
    currentRequestIdRef.current = "stopped_" + Date.now();
    activeProviderResolversRef.current.forEach((resolve) => {
      resolve({ cancelled: true });
    });
    activeProviderResolversRef.current.clear();
    setIsLoading(false);
    setTurns((prev) => {
      const next = prev.map((t) => ({
        ...t,
        isLoading: false,
        loadingProviders: [],
      }));
      turnsRef.current = next;
      saveHistoryImmediately(next);
      return next;
    });
    UTILS.pagePostMessage("IF_B_STOP_FETCH", {}, window.parent);
  }, [saveHistoryImmediately]);

  // Start fresh chat session (clears the continuous chat thread and resets background sessions)
  const handleNewChat = useCallback(() => {
    isSubmittingRef.current = false;
    handleStopFetch();
    if (turnsRef.current && turnsRef.current.length > 0) {
      saveHistoryImmediately(turnsRef.current);
    }
    if (historySaveTimeoutRef.current) {
      clearTimeout(historySaveTimeoutRef.current);
    }
    setIsViewingHistory(false);
    setInput("");
    setTurns([]);
    turnsRef.current = [];
    setAttachedImage(null);
    setAttachedPage(null);
    setAttachedContextType(null);
    setShowMentionMenu(false);
    setIsLoading(false);
    currentRequestIdRef.current = null;
    activeProviderResolversRef.current.clear();
    setUnreadProviders(new Set());
    UTILS.pagePostMessage("IF_B_NEW_CHAT", {}, window.parent);
    if (textareaRef.current) {
      textareaRef.current.style.height = "24px";
    }
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  }, [handleStopFetch, saveHistoryImmediately]);

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
          const enabledKey = enabledProviders
            .map((p) => p.id)
            .sort()
            .join(",");

          // If enabled provider configuration changed, save chat to history and start fresh chat
          if (
            prevEnabledProvidersKeyRef.current !== null &&
            prevEnabledProvidersKeyRef.current !== enabledKey &&
            (turns.length > 0 || isLoading)
          ) {
            if (turnsRef.current && turnsRef.current.length > 0) {
              saveHistoryImmediately(turnsRef.current);
            }
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

    try {
      if (
        typeof chrome !== "undefined" &&
        Boolean(chrome?.runtime?.id) &&
        chrome.storage?.onChanged
      ) {
        const storageListener = (changes, areaName) => {
          try {
            if (!chrome?.runtime?.id) return;
            if (areaName === "local" && changes[UTILS.KEYS.CONTROLS]) {
              loadControls();
            }
          } catch {}
        };
        chrome.storage.onChanged.addListener(storageListener);
        return () => {
          try {
            if (chrome?.runtime?.id) {
              chrome.storage.onChanged.removeListener(storageListener);
            }
          } catch {}
        };
      }
    } catch {}
  }, [turns.length, isLoading, handleNewChat, saveHistoryImmediately]);

  useEffect(() => {
    UTILS.pageOnMessage("IF_C_GET_CURRENT_CONTROLS", (data) => {
      const { aiProviders: storedProviders, concurrentRequests } =
        data?.controls || {};

      if (storedProviders && Array.isArray(storedProviders)) {
        const enabledProviders = storedProviders.filter((p) => p.enabled);
        const disabledProviders = storedProviders.filter((p) => !p.enabled);
        const enabledKey = enabledProviders
          .map((p) => p.id)
          .sort()
          .join(",");

        if (
          prevEnabledProvidersKeyRef.current !== null &&
          prevEnabledProvidersKeyRef.current !== enabledKey &&
          (turns.length > 0 || isLoading)
        ) {
          if (turnsRef.current && turnsRef.current.length > 0) {
            saveHistoryImmediately(turnsRef.current);
          }
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
    async (question, provider = "google", requestId, image = null) => {
      console.log(
        `[SL REQUEST] ${requestId} provider=${provider} event=QUEUED timestamp=${Date.now()}`,
      );
      UTILS.pagePostMessage(
        "IF_B_GET_ANSWER",
        { question, provider, requestId, image },
        window.parent,
      );
    },
    [],
  );

  // Concurrent provider loading (reactive event-driven, zero polling timers!)
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
          activeProviderResolversRef.current.set(provider.id, resolve);

          // Fallback safety timeout (45s) in case provider network drops
          setTimeout(() => {
            if (activeProviderResolversRef.current.has(provider.id)) {
              activeProviderResolversRef.current.delete(provider.id);
              resolve({ provider, completed: true, timeout: true });
            }
          }, 45000);
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

        if (finishedPromise?.cancelled) break;

        if (finishedPromise?.provider?.id) {
          activeRequests.delete(finishedPromise.provider.id);
        }

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
    };
    turns.forEach((turn) => {
      Object.keys(turn.answers || {}).forEach((id) => {
        if (!existingIds.has(id)) {
          list.push({
            id,
            name:
              defaultNames[id.toLowerCase()] ||
              id.charAt(0).toUpperCase() + id.slice(1),
            enabled: false,
          });
          existingIds.add(id);
        }
      });
    });
    return list;
  }, [aiProviders, turns]);

  // Dynamically available tabs
  const availableProviderTabs = useMemo(() => {
    if (isViewingHistory && turns.length > 0) {
      const historyProviders = new Set();
      turns.forEach((t) => {
        if (t.answers) {
          Object.keys(t.answers).forEach((id) => historyProviders.add(id));
        }
      });

      const list = allProvidersList.filter((p) =>
        historyProviders.has(p.id),
      );

      return list.length > 0
        ? list
        : [{ id: "google", name: "Google AI", enabled: true }];
    }

    const enabled = aiProviders.filter((p) => p.enabled);
    if (enabled.length === 0) {
      return [{ id: "google", name: "Google AI", enabled: true }];
    }
    return enabled;
  }, [aiProviders, turns, isViewingHistory, allProvidersList]);

  // Providers shown as primary pills vs overflow menu based on MAX_PRIMARY_PROVIDER_TABS
  const primaryProviderTabs = availableProviderTabs.slice(
    0,
    MAX_PRIMARY_PROVIDER_TABS,
  );
  const overflowProviderTabs = availableProviderTabs.slice(
    MAX_PRIMARY_PROVIDER_TABS,
  );

  const handleSendMessage = useCallback(
    async (messageInput = null) => {
      // 1. Submit Lock & Rapid Duplicate Prevention
      if (isSubmittingRef.current) {
        console.warn(
          "[SL REQUEST] Submit lock is active — ignoring rapid duplicate submit trigger",
        );
        return;
      }

      const actualInput = messageInput !== null ? messageInput : input;
      if (actualInput?.trim() === "" && !attachedImage && !attachedPage) return;

      isSubmittingRef.current = true;

      const requestId =
        "req_" +
        Date.now() +
        "_" +
        Math.random().toString(36).slice(2, 8);
      currentRequestIdRef.current = requestId;

      console.log(
        `[SL REQUEST] ${requestId} event=CREATED timestamp=${Date.now()}`,
      );

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
        if (attachedPage.title)
          metaLines.push(`Page Title: ${attachedPage.title}`);
        if (attachedPage.url) metaLines.push(`Page Link: ${attachedPage.url}`);
        if (attachedPage.description)
          metaLines.push(`Description: ${attachedPage.description}`);
        if (attachedPage.author)
          metaLines.push(`Author: ${attachedPage.author}`);
        if (attachedPage.keywords)
          metaLines.push(`Keywords: ${attachedPage.keywords}`);

        const metadataBlock = metaLines.join("\n");
        const userPrompt =
          actualInput ||
          "Analyze and summarize this page based on the attached top-section screenshot and page metadata.";
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
        enabledList.length > 0 ? enabledList.map((p) => p.id) : ["google"];

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

      setTurns((prev) => {
        const next = [...prev, newTurn];
        turnsRef.current = next;
        return next;
      });

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

      try {
        fetchAiResponsesWithConcurrency(sentQuestion, requestId, currentImage);
      } finally {
        // Release UI submit lock after dispatching
        setTimeout(() => {
          isSubmittingRef.current = false;
        }, 300);
      }
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
      allProvidersList,
      isViewingHistory,
      turns,
    ],
  );

  // Retry a single provider for a specific turn (e.g. after user logs in)
  const handleRetryProvider = useCallback(
    (providerId, turnId = null) => {
      if (isSubmittingRef.current) return;
      const targetTurn = turnId
        ? turns.find((t) => t.id === turnId)
        : turns[turns.length - 1];
      if (!targetTurn) return;

      const question = targetTurn.question || "";
      const questionImage = targetTurn.questionImage || null;
      const requestId =
        "req_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
      currentRequestIdRef.current = requestId;

      setIsLoading(true);
      setSelectedProvider(providerId);

      setTurns((prev) => {
        const next = prev.map((t) => {
          if (t.id === targetTurn.id) {
            const cleanAnswers = { ...(t.answers || {}) };
            delete cleanAnswers[providerId];
            return {
              ...t,
              isLoading: true,
              loadingProviders: Array.from(
                new Set([...(t.loadingProviders || []), providerId]),
              ),
              answers: cleanAnswers,
            };
          }
          return t;
        });
        turnsRef.current = next;
        return next;
      });

      dispatchAiRequestToBackground(
        question,
        providerId,
        requestId,
        questionImage,
      );
    },
    [turns, dispatchAiRequestToBackground],
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
        setMentionSelectedIndex(
          (prev) => (prev + 1) % filteredMentionOptions.length,
        );
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionSelectedIndex(
          (prev) =>
            (prev - 1 + filteredMentionOptions.length) %
            filteredMentionOptions.length,
        );
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
      console.log(
        "[SpectraLens:ChatBot] 📥 Received IF_B_GET_ANSWER in UI:",
        data,
      );
      if (!data || typeof data !== "object") return;

      const provider = data.provider || "google";
      const answerText =
        data.answer || data.content || (typeof data === "string" ? data : "");

      console.log(
        `[SpectraLens:ChatBot] ✅ Updating answer for "${provider}", text length: ${answerText.length}`,
      );

      // Reactive resolution of concurrency promise for this provider
      const resolver = activeProviderResolversRef.current.get(provider);
      if (resolver && (answerText || data.isComplete)) {
        activeProviderResolversRef.current.delete(provider);
        resolver({ provider: { id: provider }, completed: true });
      }

      setTurns((prevTurns) => {
        const turnIndex = prevTurns.findIndex(
          (t) => t.id === (data.requestId || currentRequestIdRef.current),
        );
        if (turnIndex === -1 && prevTurns.length === 0) return prevTurns;

        const targetIndex = turnIndex >= 0 ? turnIndex : prevTurns.length - 1;
        const targetTurn = prevTurns[targetIndex];
        if (!targetTurn) return prevTurns;

        const isFirstAnswerForTurn =
          Object.keys(targetTurn.answers || {}).length === 0;
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

        // Keep turnsRef in sync
        turnsRef.current = newTurns;

        // Debounced history save to eliminate storage I/O and GC pauses
        saveHistoryDebounced(newTurns);

        return newTurns;
      });
    });

    UTILS.pageOnMessage("IF_B_AI_REQUEST_COMPLETE", () => {
      setIsLoading(false);
      setTurns((prev) => {
        const next = prev.map((t) => ({ ...t, isLoading: false }));
        turnsRef.current = next;
        return next;
      });
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
    if (
      newChatTrigger > 0 &&
      newChatTrigger !== lastHandledNewChatRef.current
    ) {
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
        style={{
          willChange: "scroll-position, transform",
          transform: "translateZ(0)",
        }}
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

          // Determine the provider ID to display for this turn:
          // 1. If selectedProvider has content or is loading for this turn, use selectedProvider
          // 2. If turn.selectedProvider has content, use turn.selectedProvider
          // 3. Otherwise pick the first provider that has an answer in this turn
          let currentProviderId =
            selectedProvider || turn.selectedProvider || "google";
          let finalAns = turnAnswers[currentProviderId];
          let activeContent =
            finalAns?.content ||
            finalAns?.answer ||
            (typeof finalAns === "string" ? finalAns : "");

          if (!activeContent && !turn.isLoading) {
            const alternateAnsweredId = Object.keys(turnAnswers).find(
              (pId) => {
                const a = turnAnswers[pId];
                return (
                  a &&
                  (a.content ||
                    a.answer ||
                    (typeof a === "string" && a.trim().length > 0))
                );
              },
            );
            if (alternateAnsweredId) {
              currentProviderId = alternateAnsweredId;
              finalAns = turnAnswers[currentProviderId];
              activeContent =
                finalAns?.content ||
                finalAns?.answer ||
                (typeof finalAns === "string" ? finalAns : "");
            }
          }

          const isCardLoading = Boolean(
            !activeContent &&
            !isViewingHistory &&
            isLoading &&
            (turn.isLoading ||
              (Array.isArray(turn.loadingProviders) &&
                turn.loadingProviders.includes(currentProviderId))),
          );

          const providerMeta = allProvidersList.find(
            (p) => p.id === currentProviderId,
          ) || {
            id: currentProviderId,
            name:
              currentProviderId.charAt(0).toUpperCase() +
              currentProviderId.slice(1),
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
                turnId={turn.id}
                onCopyUserQuestion={handleCopyUserQuestion}
              />

              {/* AI Response Card for this Turn (Strictly shows only the selected provider's response) */}
              <ChatAiResponseCard
                activeAiResponseContent={activeContent}
                isLoading={isCardLoading}
                activeAiProviderMetadata={providerMeta}
                copiedProviderId={
                  copiedProviderId === currentProviderId
                    ? currentProviderId
                    : null
                }
                selectedProvider={currentProviderId}
                messageTime={turn.messageTime}
                contrastMode={contrastMode}
                turnId={turn.id}
                onCopyAiResponse={handleCopyAiResponse}
                onRetryProvider={handleRetryProvider}
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
              : "bg-white/90 dark:bg-[#14161e]/90 border-slate-200/50 dark:border-white/[0.06]"
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
          onTriggerOcr={onTriggerOcr || onOpenSelector}
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
  pendingInput: PropTypes.string,
  onConsumePendingInput: PropTypes.func,
  newChatTrigger: PropTypes.number,
  onClearLoadedHistory: PropTypes.func,
  onOpenSelector: PropTypes.func,
  onTriggerOcr: PropTypes.func,
  onTriggerArea: PropTypes.func,
};
