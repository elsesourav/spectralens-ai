import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FiX } from "react-icons/fi";
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
    if (effectiveTheme === "dark") {
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    }
    document.documentElement.setAttribute("data-theme", effectiveTheme);
    document.documentElement.setAttribute("data-contrast", contrastMode);
  }, [effectiveTheme, contrastMode]);

  // Auto-hide inactivity timer when minimized
  useEffect(() => {
    if (isChatOpen || autoHideDelay <= 0) {
      setMenuOpacity("1");
      return;
    }

    let timer = setTimeout(() => {
      setMenuOpacity("0.2");
    }, autoHideDelay * 1000);

    const handleUserActivity = () => {
      setMenuOpacity("1");
      clearTimeout(timer);
      timer = setTimeout(() => {
        setMenuOpacity("0.2");
      }, autoHideDelay * 1000);
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

  // Handle Drag logic
  useEffect(() => {
    const dragEl = dragRef.current;
    if (!dragEl) return;

    let startX = 0;
    let startY = 0;

    const onPointerDown = (e) => {
      e.preventDefault();
      startX = e.clientX;
      startY = e.clientY;

      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
    };

    const onPointerMove = (e) => {
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      if (deltaX !== 0 || deltaY !== 0) {
        ES.pagePostMessage(
          "IF_C_MENU_WINDOW_MOVE",
          { deltaX, deltaY },
          window.parent,
        );
      }
    };

    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };

    dragEl.addEventListener("pointerdown", onPointerDown);

    return () => {
      dragEl.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, []);

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
            <div className="absolute right-0 top-0 bottom-0 w-2/3 bg-gradient-to-r from-transparent via-[#8b5cf6]/25 to-[#3b82f6]/30 rounded-r-[24px] pointer-events-none" />

            {/* 1. Drag Handle (6 Dots on Left) */}
            <div
              ref={dragRef}
              className="w-7 h-9 flex items-center justify-center text-slate-400 hover:text-white cursor-grab active:cursor-grabbing transition-colors z-10"
              title="Drag to reposition widget"
            >
              <DragHandleIcon
                className="w-4 h-4 text-slate-400 hover:text-white"
                size={18}
              />
            </div>

            {/* 2. Chat Button (Prominent circular gradient pill) */}
            <button
              onClick={toggleChat}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-gradient-to-tr from-[#8b5cf6] via-[#6366f1] to-[#3b82f6] text-white shadow-md hover:scale-105 active:scale-95 transition-all focus:outline-none cursor-pointer z-10"
              title="Open SpectraLens AI Chat"
            >
              <ChatIcon className="w-5 h-5 text-white" size={20} />
            </button>

            {/* 3. Scan / Element Selector Button */}
            <button
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
          <div className="flex flex-col h-full w-full">
            {/* Top Draggable Window Control Bar */}
            <div className="flex items-center justify-between px-3.5 py-2 bg-slate-100/90 dark:bg-[#14161e] border-b border-slate-200/80 dark:border-white/[0.08] shrink-0">
              <div className="flex items-center">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  SpectraLens AI
                </span>
              </div>

              {/* Draggable Center Window Region (no visible icon, clean transparent drag area) */}
              <div
                ref={dragRef}
                className="flex-1 mx-2 h-full cursor-grab active:cursor-grabbing select-none"
                title="Drag to move chat window"
              />

              {/* Window Controls (Single Close Button) */}
              <div className="flex items-center">
                <button
                  onClick={toggleChat}
                  className="p-1 rounded-lg text-slate-500 hover:text-rose-500 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors focus:outline-none cursor-pointer"
                  title="Close"
                >
                  <FiX className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 2-Pane Content Area with Sidebar & Multi-Views */}
            <div className="flex-1 flex overflow-hidden relative">
              {/* Left Vertical Sidebar */}
              <Sidebar activeTab={activeTab} onSelectTab={setActiveTab} />

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
