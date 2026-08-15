import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import PropTypes from "prop-types";
import {
  ProviderIcon,
  ElementSelectorIcon,
  SendPlaneIcon,
  DoubleCheckIcon,
  ThreeDotsIcon,
} from "./Icons.jsx";
import {
  IoAdd,
  IoClose,
  IoSquare,
} from "react-icons/io5";
import UTILS from "./../utils/utilsModule.js";

export default function ChatBot({
  isOpen,
  initialHistoryItem = null,
  newChatTrigger = 0,
  onClearLoadedHistory,
  onOpenSelector,
}) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lastQuestion, setLastQuestion] = useState("");
  const [answers, setAnswers] = useState({});
  const [selectedProvider, setSelectedProvider] = useState("google");
  const [messageTime, setMessageTime] = useState("");
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const currentRequestIdRef = useRef(null);
  const lastQuestionRef = useRef("");

  const [aiProviders, setAiProviders] = useState([]);
  const [maxConcurrentRequest, setMaxConcurrentRequest] = useState(3);

  const scrollContainerRef = useRef(null);
  const rootRef = useRef(null);
  const textareaRef = useRef(null);
  const moreMenuRef = useRef(null);

  // Close more menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) {
        setIsMoreMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
      setAnswers(initialHistoryItem.answers || {});
      if (initialHistoryItem.timestamp) {
        try {
          const d = new Date(initialHistoryItem.timestamp);
          setMessageTime(d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
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
    setIsLoading(false);
    currentRequestIdRef.current = null;
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  }, [isLoading, handleStopFetch]);

  useEffect(() => {
    UTILS.pageOnMessage("IF_C_GET_CURRENT_CONTROLS", (data) => {
      const { aiProviders: storedProviders, concurrentRequests } = data?.controls || {};
      if (storedProviders && Array.isArray(storedProviders)) {
        const enabledProviders = storedProviders.filter((p) => p.enabled);
        setAiProviders(enabledProviders);
        if (enabledProviders.length > 0 && !enabledProviders.some((p) => p.id === selectedProvider)) {
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
        if (enabledProviders.length > 0 && !enabledProviders.some((p) => p.id === selectedProvider)) {
          setSelectedProvider(enabledProviders[0].id);
        }
      }
      if (concurrentRequests) {
        setMaxConcurrentRequest(concurrentRequests);
      }
    });
  }, [selectedProvider]);

  // Helper to save history to storage
  const saveHistory = (newHistory) => {
    UTILS.chromeStorageSetLocal(UTILS.KEYS.HISTORY, newHistory);
  };

  // Get answer from background script
  const getAnswerFromBackground = async (
    question,
    provider = "google",
    requestId,
  ) => {
    UTILS.pagePostMessage(
      "IF_B_GET_ANSWER",
      { question, provider, requestId },
      window.parent,
    );
  };

  // Concurrent provider loading
  const loadProvidersWithConcurrency = useCallback(
    async (question, requestId) => {
      const providersToProcess = [...aiProviders];
      const activeRequests = new Map();

      const startProviderRequest = (provider) => {
        getAnswerFromBackground(question, provider.id, requestId);

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
      if (actualInput?.trim() === "") return;

      const requestId = Date.now().toString();
      currentRequestIdRef.current = requestId;

      setLastQuestion(actualInput);
      lastQuestionRef.current = actualInput;
      setMessageTime(getFormattedTime());
      setInput("");
      setIsLoading(true);
      setAnswers({});

      loadProvidersWithConcurrency(actualInput, requestId);
    },
    [input, loadProvidersWithConcurrency],
  );

  useEffect(() => {
    UTILS.pageOnMessage("IF_B_GET_ANSWER", (data) => {
      if (data.requestId && data.requestId !== currentRequestIdRef.current) {
        return;
      }

      const provider = data.provider || "google";

      setAnswers((prev) => {
        const isFirstAnswer = Object.keys(prev).length === 0;
        if (isFirstAnswer) {
          setSelectedProvider(provider);
          setIsLoading(false);
        }

        const newAnswers = {
          ...prev,
          [provider]: {
            content: data.answer,
            provider: provider,
          },
        };

        // Save history incrementally
        UTILS.chromeStorageGetLocal(UTILS.KEYS.HISTORY, (prevHistory = []) => {
          const historyList = Array.isArray(prevHistory) ? prevHistory : [];
          const reqId = data.requestId || currentRequestIdRef.current;
          const existingIndex = historyList.findIndex((item) => item.id === reqId);

          let updatedHistory;
          if (existingIndex >= 0) {
            updatedHistory = [...historyList];
            updatedHistory[existingIndex] = {
              ...updatedHistory[existingIndex],
              answers: newAnswers,
            };
          } else {
            const newHistoryItem = {
              id: reqId,
              question: lastQuestionRef.current || "",
              answers: newAnswers,
              timestamp: Date.now(),
            };
            updatedHistory = [newHistoryItem, ...historyList].slice(0, 20);
          }
          saveHistory(updatedHistory);
        });

        return newAnswers;
      });
    });

    UTILS.pageOnMessage("C_IF_SET_INPUTS", (data) => {
      setTimeout(() => {
        setInput(data.input);
      }, 100);
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

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  useEffect(() => {
    if (newChatTrigger > 0) {
      handleNewChat();
    }
  }, [newChatTrigger, handleNewChat]);

  const selectedAnswer = answers[selectedProvider];
  const activeProviderObj =
    displayedProviders.find((p) => p.id === selectedProvider) || {
      id: selectedProvider,
      name: selectedProvider.charAt(0).toUpperCase() + selectedProvider.slice(1),
    };

  return (
    <div
      ref={rootRef}
      className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#0e1015] text-[#0f172a] dark:text-[#f8fafc] overflow-hidden select-none"
    >
      {/* Provider Selector Pills Bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200/60 dark:border-white/[0.05] bg-slate-100/60 dark:bg-[#12141c]/80 shrink-0 gap-1.5">
        <div className="flex items-center gap-1.5 flex-1 overflow-x-auto custom-scrollbar">
          {primaryPills.map((provider) => {
            const isSelected = selectedProvider === provider.id;
            const hasAnswer = Boolean(answers[provider.id]);

            return (
              <button
                key={provider.id}
                onClick={() => setSelectedProvider(provider.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-150 shrink-0 focus:outline-none cursor-pointer ${
                  isSelected
                    ? "bg-blue-600 text-white shadow-sm ring-1 ring-blue-500 font-semibold"
                    : "bg-white dark:bg-[#1a1d26] text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-[#222634] border border-slate-200 dark:border-white/[0.06]"
                } ${!hasAnswer && isLoading ? "opacity-75" : ""}`}
              >
                <ProviderIcon id={provider.id} className="w-4 h-4 shrink-0" size={16} />
                <span>{provider.name}</span>
                {hasAnswer && !isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Overflow 3-dots Menu for 4+ providers */}
        {overflowProviders.length > 0 && (
          <div className="relative shrink-0" ref={moreMenuRef}>
            <button
              onClick={() => setIsMoreMenuOpen((v) => !v)}
              title="More AI Models"
              className={`p-1.5 rounded-xl transition-all border focus:outline-none cursor-pointer ${
                isMoreMenuOpen
                  ? "bg-blue-600 text-white border-blue-500"
                  : "bg-white dark:bg-[#1a1d26] text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-[#222634] border-slate-200 dark:border-white/[0.06]"
              }`}
            >
              <ThreeDotsIcon className="w-4 h-4" size={16} />
            </button>

              {isMoreMenuOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-44 rounded-xl bg-white dark:bg-[#1a1d26] border border-slate-200 dark:border-white/10 shadow-xl py-1 z-30 animate-fade-in">
                  {overflowProviders.map((provider) => (
                    <button
                      key={provider.id}
                      onClick={() => {
                        setSelectedProvider(provider.id);
                        setIsMoreMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-left transition-colors focus:outline-none cursor-pointer ${
                        selectedProvider === provider.id
                          ? "bg-blue-600/15 text-blue-600 dark:text-blue-400 font-semibold"
                          : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5"
                      }`}
                    >
                      <ProviderIcon id={provider.id} className="w-4 h-4 shrink-0" size={16} />
                      <span className="truncate">{provider.name}</span>
                    </button>
                  ))}
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
          <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8 text-slate-500 dark:text-slate-400 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 dark:text-blue-400 flex items-center justify-center">
              <ProviderIcon id="google" className="w-6 h-6" size={24} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Compare AI Models Side-by-Side
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-[240px]">
                Ask questions across Google AI, Bing AI, Gemini, and more in real-time.
              </p>
            </div>
          </div>
        )}

        {/* User Message Bubble */}
        {lastQuestion && (
          <div className="flex flex-col items-end gap-1 animate-fade-in">
            <div className="max-w-[85%] px-3.5 py-2.5 rounded-2xl rounded-tr-xs bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs">
              <p className="text-xs leading-relaxed font-normal whitespace-pre-wrap">
                {lastQuestion}
              </p>
              <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-blue-200/90 font-medium">
                <span>{messageTime || getFormattedTime()}</span>
                <DoubleCheckIcon className="w-3.5 h-3.5 text-blue-200" size={14} />
              </div>
            </div>
          </div>
        )}

        {/* AI Response Card */}
        {(selectedAnswer || (isLoading && !selectedAnswer)) && (
          <div className="flex flex-col gap-2 animate-fade-in">
            <div className="p-4 rounded-2xl bg-white dark:bg-[#181920] border border-slate-200/80 dark:border-white/[0.08] shadow-xs space-y-3">
              {/* Provider Header Badge */}
              <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-white/[0.04]">
                <div className="flex items-center gap-2">
                  <ProviderIcon
                    id={activeProviderObj.id}
                    className="w-4 h-4 shrink-0"
                    size={18}
                  />
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    {activeProviderObj.name}
                  </span>
                </div>

                {isLoading && !selectedAnswer && (
                  <span className="text-[10px] text-blue-500 font-medium animate-pulse">
                    Streaming response...
                  </span>
                )}
              </div>

              {/* Response Content Body */}
              {selectedAnswer ? (
                <div
                  className="ai-markdown text-slate-800 dark:text-slate-200 overflow-x-auto leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: UTILS.sanitizeHtml(selectedAnswer.content),
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

              {/* Timestamp at bottom right */}
              {selectedAnswer && (
                <div className="flex items-center justify-end pt-1 border-t border-slate-100 dark:border-white/[0.04] text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                  <span>{messageTime || getFormattedTime()}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Input Dock Bar */}
      <div className="p-3 border-t border-slate-200/80 dark:border-white/[0.07] bg-white/70 dark:bg-[#12141c]/80 backdrop-blur-md shrink-0">
        <div className="relative flex items-center w-full px-3 py-2 rounded-2xl bg-white dark:bg-[#191c25] border border-slate-200/90 dark:border-white/[0.09] focus-within:border-blue-500 dark:focus-within:border-blue-500/80 focus-within:ring-1 focus-within:ring-blue-500/50 shadow-xs transition-all">
          <input
            ref={textareaRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything..."
            className="flex-1 bg-transparent text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 border-0 outline-none pr-2"
          />

          {input && (
            <button
              onClick={() => setInput("")}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors focus:outline-none cursor-pointer mr-1"
              title="Clear text"
            >
              <IoClose className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Action Buttons: Element Selector Shortcut */}
          <div className="flex items-center gap-1 pl-1 border-l border-slate-200 dark:border-white/10">
            <button
              onClick={onOpenSelector}
              title="Inspect & Select Page Element"
              className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-all focus:outline-none cursor-pointer"
            >
              <ElementSelectorIcon className="w-4 h-4" size={16} />
            </button>

            {/* Send / Stop Button */}
            {isLoading ? (
              <button
                onClick={handleStopFetch}
                title="Stop Fetching"
                className="w-8 h-8 ml-1 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white flex items-center justify-center shadow-xs transition-all focus:outline-none cursor-pointer"
              >
                <IoSquare className="w-3 h-3 text-white fill-current animate-pulse" />
              </button>
            ) : (
              <button
                onClick={() => handleSendMessage()}
                disabled={input.trim() === ""}
                title="Send Prompt"
                className={`w-8 h-8 ml-1 rounded-xl flex items-center justify-center transition-all focus:outline-none ${
                  input.trim() === ""
                    ? "bg-slate-200 dark:bg-white/10 text-slate-400 dark:text-slate-500 cursor-not-allowed"
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
