/* eslint-disable no-undef */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FiX } from "react-icons/fi";
import appIconUrl from "../assets/icons/icon.png";
import ChatBot from "../components/ChatBot.jsx";
import Controls from "../components/Controls.jsx";
import HistoryView from "../components/HistoryView.jsx";
import {
  ChatIcon,
  DragHandleIcon,
  ElementSelectorIcon,
} from "../components/Icons.jsx";
import SelectorView from "../components/SelectorView.jsx";
import Sidebar from "../components/Sidebar.jsx";
import ES from "./../utils/utilsModule.js";

export default function Menu() {
  const SIZES = useMemo(
    () => ({
      min: { w: "148px", h: "48px" },
      max: { w: "440px", h: "600px" },
    }),
    [],
  );

  // State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("chat"); // 'chat' | 'selector' | 'history' | 'settings'
  const [size, setSize] = useState(SIZES.min);
  const [menuOpacity, setMenuOpacity] = useState("1");
  const [autoHideDelay, setAutoHideDelay] = useState(0);
  const [chatbotTheme, setChatbotTheme] = useState(() => {
    return localStorage.getItem("app-theme") || "system";
  });
  const [contrastMode, setContrastMode] = useState(() => {
    return localStorage.getItem("app-contrast") || "solid";
  });
  const [loadedHistoryItem, setLoadedHistoryItem] = useState(null);
  const [pageTheme, setPageTheme] = useState(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    return "dark";
  });

  const menuRef = useRef(null);
  const dragRef = useRef(null);
  const windowContainerRef = useRef(null);
  const [newChatKey, setNewChatKey] = useState(0);

  useEffect(() => {
    // Request controls & page theme from parent frame
    ES.pagePostMessage("IF_C_GET_CURRENT_CONTROLS", {}, window.parent);

    // Initial storage read
    ES.chromeStorageGetLocal(ES.KEYS.CONTROLS, (controls) => {
      if (controls) {
        if (controls.autoHideDelay !== undefined) {
          setAutoHideDelay(Number(controls.autoHideDelay));
        }
        if (controls.chatbotTheme) {
          setChatbotTheme(controls.chatbotTheme);
        }
        if (controls.contrastMode) {
          setContrastMode(controls.contrastMode);
        }
      }
    });

    // Listen for storage changes directly
    let storageListener;
    if (typeof chrome !== "undefined" && chrome.storage?.onChanged) {
      storageListener = (changes) => {
        if (changes[ES.KEYS.CONTROLS]) {
          const val = changes[ES.KEYS.CONTROLS].newValue;
          const controls = typeof val === "string" ? JSON.parse(val) : val;
          if (controls?.chatbotTheme) {
            setChatbotTheme(controls.chatbotTheme);
          }
          if (controls?.contrastMode) {
            setContrastMode(controls.contrastMode);
          }
        }
      };
      chrome.storage.onChanged.addListener(storageListener);
    }

    ES.pageOnMessage("C_IF_OPEN_CHAT", () => {
      setIsChatOpen(true);
      setActiveTab("chat");
      setMenuOpacity("1");
    });
    ES.pageOnMessage("C_IF_CLOSE_CHAT", () => {
      setIsChatOpen(false);
    });

    ES.pageOnMessage("C_IF_HIDDEN", () => {
      setMenuOpacity("0");
    });
    ES.pageOnMessage("C_IF_SHOW", () => {
      setMenuOpacity("1");
    });

    // Parent page theme detector
    ES.pageOnMessage("C_IF_PAGE_THEME", (msg) => {
      if (msg?.theme) {
        setPageTheme(msg.theme);
      }
    });

    // Receive initial/live controls
    ES.pageOnMessage("IF_C_GET_CURRENT_CONTROLS", (data) => {
      if (data?.pageTheme) {
        setPageTheme(data.pageTheme);
      }
      const controls = data?.controls;
      if (controls) {
        if (controls.autoHideDelay !== undefined) {
          setAutoHideDelay(Number(controls.autoHideDelay));
        }
        if (controls.chatbotTheme) {
          setChatbotTheme(controls.chatbotTheme);
        }
        if (controls.contrastMode) {
          setContrastMode(controls.contrastMode);
        }
      }
    });

    ES.pageOnMessage("C_IF_CURRENT_CONTROLS", (data) => {
      if (data?.autoHideDelay !== undefined) {
        setAutoHideDelay(Number(data.autoHideDelay));
      }
      if (data?.chatbotTheme) {
        setChatbotTheme(data.chatbotTheme);
      }
      if (data?.contrastMode) {
        setContrastMode(data.contrastMode);
      }
    });

    return () => {
      if (
        storageListener &&
        typeof chrome !== "undefined" &&
        chrome.storage?.onChanged
      ) {
        chrome.storage.onChanged.removeListener(storageListener);
      }
    };
  }, []);

  // Compute effective theme based on user settings
  const effectiveTheme = useMemo(() => {
    if (chatbotTheme === "light") return "light";
    if (chatbotTheme === "dark") return "dark";
    // 'system' or 'auto' matches page theme
    return pageTheme === "dark" ? "dark" : "light";
  }, [chatbotTheme, pageTheme]);

  // Dynamic theme & contrast class
  const contrastClass = useMemo(() => {
    if (!isChatOpen) {
      if (contrastMode === "transparent") {
        return "bg-[#16171d]/60 backdrop-blur-xl border border-white/15 shadow-2xl";
      }
      if (contrastMode === "medium") {
        return "bg-[#16171d]/85 backdrop-blur-md border border-white/15 shadow-2xl";
      }
      return "bg-[#16171d] border border-white/20 shadow-2xl";
    } else {
      if (contrastMode === "transparent") {
        return "bg-[#f8fafc]/80 dark:bg-[#0e1015]/75 backdrop-blur-2xl border border-slate-200/60 dark:border-white/[0.08] shadow-2xl";
      }
      if (contrastMode === "medium") {
        return "bg-[#f8fafc]/95 dark:bg-[#0e1015]/90 backdrop-blur-md border border-slate-200/80 dark:border-white/10 shadow-2xl";
      }
      return "bg-[#f8fafc] dark:bg-[#0e1015] border border-slate-200 dark:border-white/10 shadow-2xl";
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

  // Auto-hide inactivity timer when minimized
  useEffect(() => {
    if (isChatOpen || autoHideDelay <= 0) {
      setMenuOpacity("1");
      return;
    }

    let timer;
    const resetTimer = () => {
      setMenuOpacity("1");
      clearTimeout(timer);
      timer = setTimeout(() => {
        setMenuOpacity("0");
      }, autoHideDelay * 1000);
    };

    resetTimer();

    const handleUserActivity = () => {
      resetTimer();
    };

    window.addEventListener("mousemove", handleUserActivity);
    window.addEventListener("pointerdown", handleUserActivity);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("mousemove", handleUserActivity);
      window.removeEventListener("pointerdown", handleUserActivity);
    };
  }, [isChatOpen, autoHideDelay]);

  useEffect(() => {
    setSize(isChatOpen ? SIZES.max : SIZES.min);
  }, [isChatOpen, SIZES]);

  useEffect(() => {
    const isOpen = parseInt(size.w) > 160;
    ES.pagePostMessage(
      "IF_C_MENU_WINDOW_RESIZE",
      {
        width: size.w,
        height: size.h,
        isOpen,
      },
      window.parent,
    );
  }, [size]);

  // Drag logic:
  // - Minimized: Only left 6-dot drag handle (`dragRef`).
  // - Expanded: Drag from anywhere across the window (except interactive buttons/inputs/text selection).
  useEffect(() => {
    const handlePointerDown = (e) => {
      if (e.button !== 0) return;

      if (isChatOpen) {
        const target = e.target;
        if (
          target.closest(
            "button, input, textarea, a, select, [role='button'], .no-drag, pre, code, .custom-scrollbar"
          )
        ) {
          return;
        }
      }

      e.preventDefault();

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
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
        window.removeEventListener("pointercancel", handlePointerUp);
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
      window.addEventListener("pointercancel", handlePointerUp);
    };

    const dragEl = dragRef.current;
    const windowEl = windowContainerRef.current;

    if (!isChatOpen && dragEl) {
      dragEl.addEventListener("pointerdown", handlePointerDown);
    } else if (isChatOpen && windowEl) {
      windowEl.addEventListener("pointerdown", handlePointerDown);
    }

    return () => {
      if (dragEl) {
        dragEl.removeEventListener("pointerdown", handlePointerDown);
      }
      if (windowEl) {
        windowEl.removeEventListener("pointerdown", handlePointerDown);
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
    if (!isChatOpen) {
      setActiveTab("chat");
    }
  }, [isChatOpen]);

  const handleSelectElement = useCallback(() => {
    setActiveTab("selector");
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

  return (
    <div
      className={`absolute transition-all duration-200 ease-out select-none ${effectiveTheme}`}
      ref={menuRef}
      style={{ zIndex: 999999, opacity: menuOpacity }}
    >
      <main
        data-theme={effectiveTheme}
        data-contrast={contrastMode}
        className={`relative overflow-hidden transition-all duration-300 ease-out shadow-2xl ${
          isChatOpen ? "rounded-[20px]" : "rounded-[24px]"
        } ${contrastClass}`}
        style={{
          width: isChatOpen ? SIZES.max.w : SIZES.min.w,
          height: isChatOpen ? SIZES.max.h : SIZES.min.h,
        }}
      >
        {/* ======================================================== */}
        {/* Minimized Pill Mode (Pixel-perfect matching user image)  */}
        {/* ======================================================== */}
        {!isChatOpen ? (
          <div className="relative w-full h-full px-2.5 py-1 flex items-center justify-between gap-1 select-none overflow-hidden rounded-[24px]">
            {/* Background ambient violet-blue gradient on the right section */}
            <div className="absolute right-0 top-0 bottom-0 w-2/3 bg-gradient-to-r from-transparent via-[#8b5cf6]/20 to-[#3b82f6]/25 rounded-r-[24px] pointer-events-none" />

            {/* 1. Drag Handle (6 Dots on Left - Old way only this drags) */}
            <div
              ref={dragRef}
              className="w-8 h-9 flex items-center justify-center text-slate-400 hover:text-white active:text-white cursor-grab active:cursor-grabbing transition-colors z-10 select-none"
              title="Drag to reposition widget"
            >
              <DragHandleIcon
                className="w-4 h-4 text-slate-400 hover:text-white transition-colors"
                size={18}
              />
            </div>

            {/* 2. Chat Button (Prominent circular gradient pill) */}
            <button
              type="button"
              onClick={toggleChat}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-gradient-to-tr from-[#8b5cf6] via-[#6366f1] to-[#3b82f6] text-white shadow-md hover:scale-105 active:scale-95 transition-all focus:outline-none cursor-pointer z-10"
              title="Open SpectraLens AI Chat"
            >
              <ChatIcon className="w-5 h-5 text-white" size={20} />
            </button>

            {/* 3. Scan / Element Selector Button */}
            <button
              type="button"
              onClick={handleSelectElement}
              className="w-9 h-9 rounded-full flex items-center justify-center text-white hover:bg-white/15 active:scale-95 transition-all focus:outline-none cursor-pointer z-10"
              title="Select Page Element / Area"
            >
              <ElementSelectorIcon className="w-5 h-5 text-white" size={20} />
            </button>
          </div>
        ) : (
          /* ======================================================== */
          /* Expanded Mode: Full 2-Pane Window Matching Image 1       */
          /* ======================================================== */
          <div ref={windowContainerRef} className="flex flex-col h-full w-full cursor-default">
            {/* Top Draggable Window Control Bar */}
            <div className="flex items-center justify-between px-3.5 py-2 bg-slate-100/90 dark:bg-[#14161e] border-b border-slate-200/80 dark:border-white/[0.08] shrink-0 cursor-grab active:cursor-grabbing">
              <div className="flex items-center gap-2 select-none pointer-events-none">
                <img
                  src={appIconUrl}
                  alt="SpectraLens AI"
                  className="size-6 rounded-md object-contain shadow-2xs"
                />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  SpectraLens AI
                </span>
              </div>

              {/* Draggable Center Window Region (completely transparent, no glow) */}
              <div
                className="flex-1 mx-2 h-full select-none pointer-events-none"
                title="Drag to move chat window"
              />

              {/* Window Controls (Single Close Button) */}
              <div className="flex items-center">
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleChat();
                  }}
                  className="p-1 rounded-lg text-slate-500 hover:text-rose-500 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors focus:outline-none cursor-pointer"
                  title="Close"
                >
                  <FiX className="w-4 h-4 pointer-events-none" />
                </button>
              </div>
            </div>

            {/* 2-Pane Content Area with Sidebar & Multi-Views */}
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
                    newChatTrigger={newChatKey}
                    onClearLoadedHistory={() => setLoadedHistoryItem(null)}
                    onOpenSelector={() => handleSelectElement()}
                  />
                </div>

                {/* Element Selector View */}
                {activeTab === "selector" && (
                  <div className="w-full h-full animate-fade-in">
                    <SelectorView
                      onTriggerComplete={() => handleSelectElement()}
                    />
                  </div>
                )}

                {/* History View */}
                {activeTab === "history" && (
                  <div className="w-full h-full animate-fade-in">
                    <HistoryView onLoadQuery={handleLoadQuery} />
                  </div>
                )}

                {/* Menu Settings View (Full Settings inside the in-page menu) */}
                {activeTab === "settings" && (
                  <div className="w-full h-full overflow-y-auto custom-scrollbar animate-fade-in">
                    <Controls onBack={() => setActiveTab("chat")} />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
