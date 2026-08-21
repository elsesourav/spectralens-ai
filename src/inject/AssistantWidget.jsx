import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import appIconUrl from "../assets/icons/128.png";
import ChatBot from "../components/ChatBot.jsx";
import Controls from "../components/Controls.jsx";
import HistoryView from "../components/HistoryView.jsx";
import Sidebar from "../components/Sidebar.jsx";
import FloatingPillLauncher from "../features/launcher/FloatingPillLauncher.jsx";
import WindowHeader from "../features/launcher/WindowHeader.jsx";
import { useTheme } from "../hooks/useThemeHook.jsx";
import ES from "./../utils/utilsModule.js";

// Lazy-load GuideView only when the user clicks the '?' guide tab
const GuideView = lazy(() => import("../components/GuideView.jsx"));

export default function AssistantWidget() {
  const { isDarkMode, contrastMode } = useTheme();

  const SIZES = useMemo(
    () => ({
      min: { w: "154px", h: "48px" },
      max: { w: "440px", h: "600px" },
    }),
    [],
  );

  // Constants
  const DEFAULT_AUTO_MINIMIZE_DELAY = 60;
  const DEFAULT_AUTO_HIDE_DELAY = 60;

  // State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("chat"); // 'chat' | 'selector' | 'history' | 'settings'
  const [menuOpacity, setMenuOpacity] = useState("1");
  const [autoHideDelay, setAutoHideDelay] = useState(DEFAULT_AUTO_HIDE_DELAY);
  const [autoMinimizeDelay, setAutoMinimizeDelay] = useState(
    DEFAULT_AUTO_MINIMIZE_DELAY,
  );
  const [pendingScanInput, setPendingScanInput] = useState(null);
  const [loadedHistoryItem, setLoadedHistoryItem] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isDraggingWidget, setIsDraggingWidget] = useState(false);
  const [dragHover, setDragHover] = useState(false);
  const [chatHover, setChatHover] = useState(false);

  const menuRef = useRef(null);
  const dragRef = useRef(null);
  const headerRef = useRef(null);
  const windowContainerRef = useRef(null);
  const [newChatKey, setNewChatKey] = useState(0);
  const [isAlwaysActive, setIsAlwaysActive] = useState(false);

  // Check first-time onboarding hint
  useEffect(() => {
    ES.chromeStorageGetLocal(ES.KEYS.WIDGET_HINT_SEEN, (seen) => {
      if (!seen) {
        setShowOnboarding(true);
        const timer = setTimeout(() => {
          setShowOnboarding(false);
          ES.chromeStorageSetLocal(ES.KEYS.WIDGET_HINT_SEEN, true);
        }, 3000);
        return () => clearTimeout(timer);
      }
    });
  }, []);

  const dismissOnboarding = useCallback(() => {
    setShowOnboarding((prev) => {
      if (prev) {
        ES.chromeStorageSetLocal(ES.KEYS.WIDGET_HINT_SEEN, true);
        return false;
      }
      return false;
    });
  }, []);

  // Check and observe Always Active Tab status
  useEffect(() => {
    const checkAlwaysActive = async () => {
      try {
        const tab = await ES.getActiveTab();
        let hostname = "";
        if (tab?.url?.startsWith("http")) {
          try {
            hostname = new URL(tab.url).hostname;
          } catch {
            // Ignore
          }
        }

        ES.chromeStorageGetLocal(ES.KEYS.ALWAYS_ACTIVE_HOSTS, (hosts = []) => {
          const activeHosts = Array.isArray(hosts) ? hosts : [];
          if (
            hostname &&
            (activeHosts.includes(hostname) || activeHosts.includes("*"))
          ) {
            setIsAlwaysActive(true);
          } else {
            setIsAlwaysActive(false);
          }
        });
      } catch {
        // Ignore context invalidation
      }
    };

    checkAlwaysActive();

    let storageListener;
    try {
      if (
        typeof chrome !== "undefined" &&
        Boolean(chrome?.runtime?.id) &&
        chrome.storage?.onChanged
      ) {
        storageListener = (changes) => {
          try {
            if (!chrome?.runtime?.id) return;
            if (changes[ES.KEYS.ALWAYS_ACTIVE_HOSTS]) {
              checkAlwaysActive();
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
  }, []);

  useEffect(() => {
    // Initial fetch directly from chrome storage
    try {
      ES.chromeStorageGetLocal(ES.KEYS.CONTROLS, (data) => {
        if (data && typeof data === "object") {
          if (data.autoHideDelay !== undefined) {
            setAutoHideDelay(Number(data.autoHideDelay));
          } else {
            setAutoHideDelay(DEFAULT_AUTO_HIDE_DELAY);
          }
          if (data.autoMinimizeDelay !== undefined) {
            setAutoMinimizeDelay(Number(data.autoMinimizeDelay));
          } else {
            setAutoMinimizeDelay(DEFAULT_AUTO_MINIMIZE_DELAY);
          }
        }
      });
    } catch {}

    // Listen for storage changes
    let storageListener;
    try {
      if (
        typeof chrome !== "undefined" &&
        Boolean(chrome?.runtime?.id) &&
        chrome.storage?.onChanged
      ) {
        storageListener = (changes) => {
          try {
            if (!chrome?.runtime?.id) return;
            if (changes[ES.KEYS.CONTROLS]) {
              const val = changes[ES.KEYS.CONTROLS].newValue;
              const controls =
                typeof val === "string" ? JSON.parse(val) : val;
              if (controls?.autoHideDelay !== undefined) {
                setAutoHideDelay(Number(controls.autoHideDelay));
              }
              if (controls?.autoMinimizeDelay !== undefined) {
                setAutoMinimizeDelay(Number(controls.autoMinimizeDelay));
              }
            }
          } catch {}
        };
        chrome.storage.onChanged.addListener(storageListener);
      }
    } catch {}

    const unsubs = [
      ES.pageOnMessage("C_IF_OPEN_CHAT", () => {
        setIsChatOpen(true);
        setMenuOpacity("1");
      }),
      ES.pageOnMessage("C_IF_SET_INPUTS", (data) => {
        if (data && data.input !== undefined) {
          setPendingScanInput(data.input);
          setIsChatOpen(true);
          setActiveTab("chat");
          setMenuOpacity("1");
        }
      }),
      ES.pageOnMessage("C_IF_SET_AREA_IMAGE", (data) => {
        if (data && data.image) {
          setIsChatOpen(true);
          setActiveTab("chat");
          setMenuOpacity("1");
        }
      }),
      ES.pageOnMessage("C_IF_CLOSE_CHAT", () => {
        setIsChatOpen(false);
      }),
      ES.pageOnMessage("C_IF_HIDDEN", () => {
        setMenuOpacity("0");
      }),
      ES.pageOnMessage("C_IF_VISIBLE", () => {
        setMenuOpacity("1");
      }),
      ES.pageOnMessage("C_IF_SHOW", () => {
        setMenuOpacity("1");
      }),
      ES.pageOnMessage("IF_C_SELECT_CANCEL", () => {
        setActiveTab("chat");
        setMenuOpacity("1");
      }),
      ES.pageOnMessage("IF_C_GET_CURRENT_CONTROLS", (data) => {
        const controls = data?.controls;
        if (controls?.autoHideDelay !== undefined) {
          setAutoHideDelay(Number(controls.autoHideDelay));
        }
        if (controls?.autoMinimizeDelay !== undefined) {
          setAutoMinimizeDelay(Number(controls.autoMinimizeDelay));
        }
      }),
      ES.pageOnMessage("C_IF_CURRENT_CONTROLS", (data) => {
        if (data?.autoHideDelay !== undefined) {
          setAutoHideDelay(Number(data.autoHideDelay));
        }
        if (data?.autoMinimizeDelay !== undefined) {
          setAutoMinimizeDelay(Number(data.autoMinimizeDelay));
        }
      }),
    ];

    return () => {
      if (
        storageListener &&
        typeof chrome !== "undefined" &&
        chrome.storage?.onChanged
      ) {
        chrome.storage.onChanged.removeListener(storageListener);
      }
      unsubs.forEach((u) => u && typeof u === "function" && u());
    };
  }, []);

  // Compute effective theme based on user settings
  const effectiveTheme = isDarkMode ? "dark" : "light";

  // Dynamic theme & contrast class with opposite-color border
  const contrastClass = useMemo(() => {
    if (!isChatOpen) {
      if (contrastMode === "transparent") {
        return "bg-white/90 dark:bg-black/90 text-slate-800 dark:text-white border border-black/25 dark:border-white/30 shadow-2xl";
      }
      if (contrastMode === "medium") {
        return "bg-white/95 dark:bg-[#16171d]/95 text-slate-800 dark:text-white border border-black/20 dark:border-white/25 shadow-2xl";
      }
      return "bg-white dark:bg-[#16171d] text-slate-800 dark:text-white border border-black/20 dark:border-white/25 shadow-2xl";
    } else {
      if (contrastMode === "transparent") {
        return "bg-white/90 dark:bg-black/90 border border-black/20 dark:border-white/25 shadow-2xl";
      }
      if (contrastMode === "medium") {
        return "bg-[#f8fafc]/95 dark:bg-[#0e1015]/95 border border-black/20 dark:border-white/25 shadow-2xl";
      }
      return "bg-[#f8fafc] dark:bg-[#0e1015] border border-black/20 dark:border-white/25 shadow-2xl";
    }
  }, [isChatOpen, contrastMode]);

  // Sync theme class to document element
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(effectiveTheme);
    root.setAttribute("data-theme", effectiveTheme);
    root.setAttribute("data-contrast", contrastMode);
  }, [effectiveTheme, contrastMode]);

  // 1. Auto-minimize expanded chat window to pill when idle
  useEffect(() => {
    if (!isChatOpen || autoMinimizeDelay <= 0) return;

    let minimizeTimer = null;
    let lastReset = 0;

    const startMinimizeTimer = () => {
      if (minimizeTimer) clearTimeout(minimizeTimer);
      minimizeTimer = setTimeout(() => {
        setIsChatOpen(false); // Auto collapse to minimized pill
      }, autoMinimizeDelay * 1000);
    };

    const resetMinimize = () => {
      const now = Date.now();
      if (now - lastReset > 1000) {
        lastReset = now;
        startMinimizeTimer();
      }
    };

    startMinimizeTimer();

    window.addEventListener("mousemove", resetMinimize, { passive: true });
    window.addEventListener("pointerdown", resetMinimize, { passive: true });
    window.addEventListener("keydown", resetMinimize, { passive: true });

    return () => {
      if (minimizeTimer) clearTimeout(minimizeTimer);
      window.removeEventListener("mousemove", resetMinimize);
      window.removeEventListener("pointerdown", resetMinimize);
      window.removeEventListener("keydown", resetMinimize);
    };
  }, [isChatOpen, autoMinimizeDelay]);

  // 2. Auto-hide / idle dim inactivity timer when minimized (applies only after/while minimized)
  useEffect(() => {
    if (isChatOpen || autoHideDelay <= 0) {
      setMenuOpacity("1");
      return;
    }

    let hideTimer = null;

    const startHideTimer = () => {
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        setMenuOpacity("0.2");
      }, autoHideDelay * 1000);
    };

    const wakeUpHide = () => {
      setMenuOpacity("1");
      startHideTimer();
    };

    wakeUpHide();

    const handleMessage = (event) => {
      const type = event?.data?.type;
      if (
        type === "C_IF_ACTIVITY" ||
        type === "C_IF_SHOW" ||
        type === "C_IF_MENU_WINDOW_DRAG_START"
      ) {
        wakeUpHide();
      }
    };

    window.addEventListener("mousemove", wakeUpHide);
    window.addEventListener("pointerdown", wakeUpHide);
    window.addEventListener("mouseenter", wakeUpHide);
    window.addEventListener("message", handleMessage);

    return () => {
      if (hideTimer) clearTimeout(hideTimer);
      window.removeEventListener("mousemove", wakeUpHide);
      window.removeEventListener("pointerdown", wakeUpHide);
      window.removeEventListener("mouseenter", wakeUpHide);
      window.removeEventListener("message", handleMessage);
    };
  }, [isChatOpen, autoHideDelay]);

  useEffect(() => {
    const currentSize = isChatOpen ? SIZES.max : SIZES.min;
    ES.pagePostMessage(
      "IF_C_MENU_WINDOW_RESIZE",
      {
        width: currentSize.w,
        height: currentSize.h,
        isOpen: isChatOpen,
      },
      window.parent,
    );
    if (isChatOpen) {
      ES.pagePostMessage("IF_C_GET_CURRENT_CONTROLS", {}, window.parent);
    }
  }, [isChatOpen, SIZES]);

  // Drag logic:
  // - Minimized: Dedicated 6-dot drag handle (`dragRef`).
  // - Expanded: Drag from ONLY the top header bar (`headerRef`).
  useEffect(() => {
    const handlePointerDown = (e) => {
      if (e.button !== 0) return;

      const target = e.target;
      if (
        target.closest(
          "button, input, textarea, a, select, [role='button'], .no-drag",
        )
      ) {
        return;
      }

      dismissOnboarding();
      if (!isChatOpen) {
        setIsDraggingWidget(true);
      }

      let lastX = e.clientX;
      let lastY = e.clientY;

      const handlePointerMove = (moveEvent) => {
        const deltaX = moveEvent.clientX - lastX;
        const deltaY = moveEvent.clientY - lastY;
        lastX = moveEvent.clientX;
        lastY = moveEvent.clientY;

        if (deltaX !== 0 || deltaY !== 0) {
          ES.pagePostMessage(
            "IF_C_MENU_WINDOW_MOVE",
            { deltaX, deltaY },
            window.parent,
          );
        }
      };

      const handlePointerUp = () => {
        setIsDraggingWidget(false);
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
        window.removeEventListener("pointercancel", handlePointerUp);
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
      window.addEventListener("pointercancel", handlePointerUp);
    };

    const dragEl = dragRef.current;
    const headerEl = headerRef.current;

    if (!isChatOpen && dragEl) {
      dragEl.addEventListener("pointerdown", handlePointerDown);
    } else if (isChatOpen && headerEl) {
      headerEl.addEventListener("pointerdown", handlePointerDown);
    }

    return () => {
      if (dragEl) {
        dragEl.removeEventListener("pointerdown", handlePointerDown);
      }
      if (headerEl) {
        headerEl.removeEventListener("pointerdown", handlePointerDown);
      }
    };
  }, [isChatOpen]);

  // Prevent scroll propagation to parent document
  useEffect(() => {
    const stopPropagation = (e) => {
      e.stopPropagation();
    };

    window.addEventListener("wheel", stopPropagation, { passive: false });
    window.addEventListener("scroll", stopPropagation, { passive: false });
    window.addEventListener("touchmove", stopPropagation, { passive: false });

    return () => {
      window.removeEventListener("wheel", stopPropagation, { passive: false });
      window.removeEventListener("scroll", stopPropagation, { passive: false });
      window.removeEventListener("touchmove", stopPropagation, {
        passive: false,
      });
    };
  }, []);

  const toggleChat = useCallback(() => {
    setIsChatOpen((prev) => !prev);
  }, []);

  const handleSelectElement = useCallback(() => {
    setActiveTab("chat");
    ES.pagePostMessage("IF_C_SELECT_TEXT", {}, window.parent);
    setMenuOpacity("0");
  }, []);

  const handleLoadQuery = useCallback((historyItem) => {
    setLoadedHistoryItem(historyItem);
    setActiveTab("chat");
  }, []);

  const handleNewChat = useCallback(() => {
    setLoadedHistoryItem(null);
    setNewChatKey((k) => k + 1);
    setActiveTab("chat");
    ES.pagePostMessage("IF_B_NEW_CHAT", {}, window.parent);
  }, []);

  const isDimmed = menuOpacity === "0.2" || parseFloat(menuOpacity) < 0.5;

  return (
    <div
      className={`absolute transition-all duration-200 ease-out select-none ${effectiveTheme}`}
      ref={menuRef}
      style={{ zIndex: 999999, opacity: menuOpacity }}
    >
      <main
        data-theme={effectiveTheme}
        data-contrast={contrastMode}
        className={`relative ${
          isChatOpen ? "overflow-hidden rounded-[20px]" : "overflow-visible rounded-[24px]"
        } transition-all duration-300 ease-out shadow-2xl ${contrastClass} ${
          !isChatOpen && !isDimmed ? "animated-pill-glow" : ""
        }`}
        style={{
          width: isChatOpen ? SIZES.max.w : SIZES.min.w,
          height: isChatOpen ? SIZES.max.h : SIZES.min.h,
        }}
      >
        {/* Minimized Pill Mode */}
        <FloatingPillLauncher
          appIconUrl={appIconUrl}
          isChatOpen={isChatOpen}
          dragRef={dragRef}
          isDraggingWidget={isDraggingWidget}
          dragHover={dragHover}
          setDragHover={setDragHover}
          chatHover={chatHover}
          setChatHover={setChatHover}
          onDismissOnboarding={dismissOnboarding}
          onToggleChat={toggleChat}
        />

        {/* Expanded Multi-AI Window Mode */}
        <div
          ref={windowContainerRef}
          className={`relative w-full h-full flex-col overflow-hidden ${
            isChatOpen ? "flex" : "hidden"
          }`}
        >
          {/* Ambient background glow header aura */}
          <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-blue-600/10 via-purple-600/5 to-transparent pointer-events-none z-0" />

          {/* Window Header */}
          <WindowHeader
            headerRef={headerRef}
            appIconUrl={appIconUrl}
            activeTab={activeTab}
            isAlwaysActive={isAlwaysActive}
            onToggleChat={toggleChat}
          />

          {/* Main Window Body (Sidebar + Content View) */}
          <div className="flex-1 flex overflow-hidden relative">
            {/* Left Vertical Sidebar with New Chat button at top */}
            <Sidebar
              activeTab={activeTab}
              onSelectTab={setActiveTab}
              onNewChat={handleNewChat}
            />

            {/* Right View Container */}
            <div className="flex-1 h-full flex flex-col overflow-hidden relative">
              {/* Chat View */}
              <div
                className={`w-full h-full ${
                  activeTab === "chat" ? "block" : "hidden"
                }`}
              >
                <ChatBot
                  isOpen={isChatOpen}
                  initialHistoryItem={loadedHistoryItem}
                  pendingInput={pendingScanInput}
                  onConsumePendingInput={() => setPendingScanInput(null)}
                  newChatTrigger={newChatKey}
                  onClearLoadedHistory={() => setLoadedHistoryItem(null)}
                  onOpenSelector={() => handleSelectElement()}
                />
              </div>

              {/* History View */}
              {activeTab === "history" && (
                <div className="w-full h-full animate-fade-in">
                  <HistoryView
                    onLoadQuery={handleLoadQuery}
                    isMenuOpen={isChatOpen}
                  />
                </div>
              )}

              {/* Settings View */}
              {activeTab === "settings" && (
                <div className="w-full h-full overflow-y-auto custom-scrollbar animate-fade-in">
                  <Controls isMenuOpen={isChatOpen} />
                </div>
              )}

              {/* Guide & Help View (Lazy-loaded on first click) */}
              {activeTab === "guide" && (
                <div className="w-full h-full overflow-hidden animate-fade-in">
                  <Suspense
                    fallback={
                      <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-xs text-slate-400">
                        <div className="size-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        <span>Loading Guide...</span>
                      </div>
                    }
                  >
                    <GuideView isMenuOpen={isChatOpen} />
                  </Suspense>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
