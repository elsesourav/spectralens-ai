import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FiX } from "react-icons/fi";
import appIconUrl from "../assets/icons/128.png";
import ChatBot from "../components/ChatBot.jsx";
import Controls from "../components/Controls.jsx";
import HistoryView from "../components/HistoryView.jsx";
import {
  ChatIcon,
  DragHandleIcon,
  ElementSelectorIcon,
} from "../components/Icons.jsx";
import Sidebar from "../components/Sidebar.jsx";
import { useTheme } from "../hooks/useThemeHook.jsx";
import ES from "./../utils/utilsModule.js";

export default function Menu() {
  const { isDarkMode, contrastMode } = useTheme();

  const SIZES = useMemo(
    () => ({
      min: { w: "154px", h: "48px" },
      max: { w: "440px", h: "600px" },
    }),
    [],
  );

  // State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("chat"); // 'chat' | 'selector' | 'history' | 'settings'
  const [menuOpacity, setMenuOpacity] = useState("1");
  const [autoHideDelay, setAutoHideDelay] = useState(0);
  const [autoMinimizeDelay, setAutoMinimizeDelay] = useState(0);
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
    };

    checkAlwaysActive();

    let storageListener;
    if (typeof chrome !== "undefined" && chrome.storage?.onChanged) {
      storageListener = (changes) => {
        if (changes[ES.KEYS.ALWAYS_ACTIVE_HOSTS]) {
          checkAlwaysActive();
        }
      };
      chrome.storage.onChanged.addListener(storageListener);
      return () => chrome.storage.onChanged.removeListener(storageListener);
    }
  }, []);

  useEffect(() => {
    // Initial fetch directly from chrome storage
    ES.chromeStorageGetLocal(ES.KEYS.CONTROLS, (data) => {
      if (data && typeof data === "object") {
        if (data.autoHideDelay !== undefined) {
          setAutoHideDelay(Number(data.autoHideDelay));
        }
        if (data.autoMinimizeDelay !== undefined) {
          setAutoMinimizeDelay(Number(data.autoMinimizeDelay));
        }
      }
    });

    // Listen for storage changes
    let storageListener;
    if (typeof chrome !== "undefined" && chrome.storage?.onChanged) {
      storageListener = (changes) => {
        if (changes[ES.KEYS.CONTROLS]) {
          const val = changes[ES.KEYS.CONTROLS].newValue;
          const controls = typeof val === "string" ? JSON.parse(val) : val;
          if (controls?.autoHideDelay !== undefined) {
            setAutoHideDelay(Number(controls.autoHideDelay));
          }
          if (controls?.autoMinimizeDelay !== undefined) {
            setAutoMinimizeDelay(Number(controls.autoMinimizeDelay));
          }
        }
      };
      chrome.storage.onChanged.addListener(storageListener);
    }

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
        return "bg-white/25 dark:bg-black/25 text-slate-800 dark:text-white backdrop-blur-sm border border-black/25 dark:border-white/30 shadow-2xl";
      }
      if (contrastMode === "medium") {
        return "bg-white/70 dark:bg-[#16171d]/60 text-slate-800 dark:text-white backdrop-blur-md border border-black/20 dark:border-white/25 shadow-2xl";
      }
      return "bg-white dark:bg-[#16171d] text-slate-800 dark:text-white border border-black/20 dark:border-white/25 shadow-2xl";
    } else {
      if (contrastMode === "transparent") {
        return "bg-white/20 dark:bg-black/20 backdrop-blur-sm border border-black/20 dark:border-white/25 shadow-2xl";
      }
      if (contrastMode === "medium") {
        return "bg-[#f8fafc]/60 dark:bg-[#0e1015]/60 backdrop-blur-md border border-black/20 dark:border-white/25 shadow-2xl";
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

    const startMinimizeTimer = () => {
      if (minimizeTimer) clearTimeout(minimizeTimer);
      minimizeTimer = setTimeout(() => {
        setIsChatOpen(false); // Auto collapse to minimized pill
      }, autoMinimizeDelay * 1000);
    };

    const resetMinimize = () => {
      startMinimizeTimer();
    };

    resetMinimize();

    window.addEventListener("mousemove", resetMinimize);
    window.addEventListener("pointerdown", resetMinimize);
    window.addEventListener("keydown", resetMinimize);

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
  // - Minimized: Only dedicated 6-dot drag handle (`dragRef`).
  // - Expanded: Drag from ONLY the top header bar (`headerRef`). Left sidebar/panel and content are not draggable.
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
        {/* ======================================================== */}
        {/* Minimized Pill Mode (Pixel-perfect matching UX design)   */}
        {/* ======================================================== */}
        <div
          className={`relative w-full h-full px-2.5 py-1.5 items-center justify-between select-none overflow-visible rounded-[24px] ${
            isChatOpen ? "hidden" : "flex"
          }`}
        >
          {/* Subtle Ambient right-side glow */}
          <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-gradient-to-r from-transparent via-[#8b5cf6]/10 dark:via-[#8b5cf6]/15 to-[#3b82f6]/15 dark:to-[#3b82f6]/20 rounded-r-[24px] pointer-events-none" />

          {/* 1. LEFT: Brand Identity (SpectraLens Logo) */}
          <div
            className="flex items-center justify-center shrink-0 select-none pointer-events-none"
            title="SpectraLens AI"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500/20 via-indigo-500/20 to-purple-500/20 ring-1.5 ring-blue-400/40 dark:ring-blue-400/50 flex items-center justify-center shadow-xs">
              {appIconUrl ? (
                <img
                  src={appIconUrl}
                  alt="SpectraLens AI"
                  className="w-5 h-5 rounded-md object-contain pointer-events-none"
                />
              ) : (
                <div className="w-4 h-4 rounded-full bg-blue-600" />
              )}
            </div>
          </div>

          {/* Hairline Separator 1 */}
          <div className="w-[1px] h-4 bg-slate-300/40 dark:bg-white/10 shrink-0 pointer-events-none" />

          {/* 2. MIDDLE: Dedicated Drag Handle (6 Dots) */}
          <div className="relative flex items-center justify-center">
            <div
              ref={dragRef}
              onMouseEnter={() => setDragHover(true)}
              onMouseLeave={() => setDragHover(false)}
              onPointerDown={dismissOnboarding}
              role="button"
              tabIndex={-1}
              aria-label="Drag SpectraLens AI widget"
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-150 select-none ${
                isDraggingWidget
                  ? "cursor-grabbing bg-emerald-500/25 ring-1 ring-emerald-500/60 text-emerald-400 scale-95"
                  : dragHover
                    ? "cursor-grab bg-emerald-500/10 dark:bg-emerald-500/15 ring-1 ring-emerald-500/30 text-emerald-500 dark:text-emerald-400 shadow-xs"
                    : "cursor-grab text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <DragHandleIcon
                className="w-4 h-4 transition-colors"
                size={16}
              />
            </div>

            {/* Hover Tooltip: "Drag to move" */}
            {dragHover && !isDraggingWidget && !showOnboarding && (
              <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-slate-900/95 dark:bg-black/95 text-emerald-300 text-[9px] font-semibold tracking-wide shadow-lg border border-emerald-500/30 whitespace-nowrap pointer-events-none z-50">
                Drag to move
              </div>
            )}

            {/* First-time Onboarding Hint for Drag */}
            {showOnboarding && (
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-50">
                <div className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[9px] font-bold shadow-md shadow-emerald-900/40 whitespace-nowrap">
                  Drag to move
                </div>
                <div className="w-1.5 h-1.5 bg-emerald-600 rotate-45 -mt-0.5" />
              </div>
            )}
          </div>

          {/* Hairline Separator 2 */}
          <div className="w-[1px] h-4 bg-slate-300/40 dark:bg-white/10 shrink-0 pointer-events-none" />

          {/* 3. RIGHT: Primary Chat Button (💬) */}
          <div className="relative flex items-center justify-center">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                dismissOnboarding();
                toggleChat();
              }}
              onMouseEnter={() => setChatHover(true)}
              onMouseLeave={() => setChatHover(false)}
              aria-label="Open SpectraLens AI"
              className={`w-8 h-8 rounded-full flex items-center justify-center p-1 border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-purple-400/70 cursor-pointer ${
                chatHover
                  ? "bg-gradient-to-tr from-purple-600/30 to-blue-600/30 border-purple-400/60 ring-2 ring-purple-400/40 text-white scale-[1.03] shadow-md shadow-purple-500/20"
                  : "bg-white/40 dark:bg-white/10 border-slate-300/80 dark:border-white/20 text-slate-800 dark:text-white active:scale-[0.97]"
              }`}
            >
              <ChatIcon
                className="w-4 h-4 text-slate-800 dark:text-white"
                size={16}
              />
            </button>

            {/* Hover Tooltip: "Open SpectraLens AI" */}
            {chatHover && !showOnboarding && (
              <div className="absolute -bottom-7 right-0 px-2 py-0.5 rounded-md bg-slate-900/95 dark:bg-black/95 text-purple-200 text-[9px] font-semibold tracking-wide shadow-lg border border-purple-500/30 whitespace-nowrap pointer-events-none z-50">
                Open SpectraLens AI
              </div>
            )}

            {/* First-time Onboarding Hint for Chat */}
            {showOnboarding && (
              <div className="absolute -top-7 right-0 flex flex-col items-center pointer-events-none z-50">
                <div className="px-2 py-0.5 rounded-md bg-purple-600 text-white text-[9px] font-bold shadow-md shadow-purple-900/40 whitespace-nowrap">
                  Click to chat
                </div>
                <div className="w-1.5 h-1.5 bg-purple-600 rotate-45 -mt-0.5" />
              </div>
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* Expanded Multi-AI Window Mode                           */}
        {/* ======================================================== */}
        <div
          ref={windowContainerRef}
          className={`relative w-full h-full flex-col overflow-hidden ${
            isChatOpen ? "flex" : "hidden"
          }`}
        >
            {/* Ambient background glow header aura */}
            <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-blue-600/10 via-purple-600/5 to-transparent pointer-events-none z-0" />

            {/* Window Header */}
            <header
              ref={headerRef}
              className="relative flex items-center justify-between px-3.5 py-2.5 border-b border-slate-200/50 dark:border-white/[0.06] shrink-0 z-10 select-none cursor-grab active:cursor-grabbing"
              title="Drag to reposition window"
            >
              {/* Left Brand Badge */}
              <div className="flex items-center gap-2 pointer-events-none">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-blue-600/20 to-purple-600/20 border border-blue-500/30 flex items-center justify-center shadow-xs relative">
                  {appIconUrl ? (
                    <img
                      src={appIconUrl}
                      alt="Logo"
                      className="size-5 object-contain pointer-events-none"
                    />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full bg-blue-600" />
                  )}
                  {isAlwaysActive && (
                    <span
                      className="absolute -bottom-0.5 -right-0.5 size-2 bg-emerald-500 rounded-full ring-1.5 ring-white dark:ring-[#14161e] shadow-xs"
                      title="Always Active Tab: Active on this page"
                    />
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold tracking-tight text-slate-900 dark:text-white leading-none">
                    SpectraLens AI
                  </span>
                  <span className="text-[10px] font-medium text-slate-600 dark:text-slate-300 capitalize leading-tight mt-0.5">
                    {activeTab}
                  </span>
                </div>
              </div>

              {/* Right Controls - Only Close button */}
              <div className="flex items-center">
                <button
                  onClick={toggleChat}
                  title="Minimize window"
                  className="p-1 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors focus:outline-none cursor-pointer"
                >
                  <FiX className="w-4 h-4" />
                </button>
              </div>
            </header>

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

                {/* Menu Settings View (Full Settings inside the in-page menu) */}
                {activeTab === "settings" && (
                  <div className="w-full h-full overflow-y-auto custom-scrollbar animate-fade-in">
                    <Controls isMenuOpen={isChatOpen} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }
