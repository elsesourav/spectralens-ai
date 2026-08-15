/* eslint-disable no-undef */
import { useCallback, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import {
  ProviderIcon,
  DragHandleIcon,
  SettingsIcon,
} from "./Icons.jsx";
import {
  IoSunnyOutline,
  IoMoonOutline,
  IoDesktopOutline,
  IoAlertCircleOutline,
  IoShieldCheckmarkOutline,
  IoFlashOutline,
  IoRefreshOutline,
  IoCheckmark,
} from "react-icons/io5";
import extensionUtils from "./../utils/utilsModule.js";
import { useTheme } from "../hooks/useThemeHook.jsx";

const DEFAULT_AI_OPTIONS = [
  { id: "google", name: "Google AI", enabled: true },
  { id: "bing", name: "Bing AI", enabled: true },
  { id: "gemini", name: "Gemini", enabled: true },
  { id: "perplexity", name: "Perplexity", enabled: false },
  { id: "grok", name: "Grok AI", enabled: false },
];

export default function Controls({ onBack }) {
  const { theme, setTheme, contrastMode, setContrastMode } = useTheme();

  const [aiList, setAiList] = useState(DEFAULT_AI_OPTIONS);
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [maxProviderWarning, setMaxProviderWarning] = useState(false);

  // Widget settings
  const [widgetEnabled, setWidgetEnabled] = useState(false);
  const [autoHideDelay, setAutoHideDelay] = useState(0);
  const [concurrentRequests, setConcurrentRequests] = useState(3);

  // Core feature states
  const [alwaysActiveTab, setAlwaysActiveTab] = useState(false);
  const [enableCopy, setEnableCopy] = useState(false);

  const [isInitialized, setIsInitialized] = useState(false);
  const warningTimerRef = useRef(null);

  const enabledCount = aiList.filter((ai) => ai.enabled).length;

  // Load Settings from Chrome Storage
  useEffect(() => {
    // 1. Controls Data
    extensionUtils.chromeStorageGetLocal(extensionUtils.KEYS.CONTROLS, (data) => {
      if (data) {
        if (data.aiProviders && Array.isArray(data.aiProviders)) {
          const storedMap = new Map(data.aiProviders.map((p) => [p.id, p]));
          const merged = DEFAULT_AI_OPTIONS.map((def) => {
            if (storedMap.has(def.id)) {
              return { ...def, ...storedMap.get(def.id) };
            }
            return def;
          });

          // Ensure max 3 are enabled
          let count = 0;
          const capped = merged.map((item) => {
            if (item.enabled) {
              count++;
              if (count > 3) return { ...item, enabled: false };
            }
            return item;
          });
          setAiList(capped);
        }

        if (data.concurrentRequests !== undefined) {
          setConcurrentRequests(Math.min(3, Math.max(1, Number(data.concurrentRequests))));
        }
        if (data.autoHideDelay !== undefined) {
          setAutoHideDelay(Number(data.autoHideDelay));
        }
      }
      setIsInitialized(true);
    });

    // 2. Widget Toggle
    extensionUtils.chromeStorageGetLocal(extensionUtils.KEYS.SETTINGS, (settings) => {
      if (settings?.enable !== undefined) {
        setWidgetEnabled(Boolean(settings?.enable));
      }
    });

    // 3. Always Active Tab Host Status
    const checkAlwaysActive = async () => {
      const tab = await extensionUtils.getActiveTab();
      let hostname = "";
      if (tab?.url?.startsWith("http")) {
        try {
          hostname = new URL(tab.url).hostname;
        } catch {
          // Ignore
        }
      }
      extensionUtils.chromeStorageGetLocal(extensionUtils.KEYS.ALWAYS_ACTIVE_HOSTS, (hosts = []) => {
        const activeHosts = Array.isArray(hosts) ? hosts : [];
        if (hostname && (activeHosts.includes(hostname) || activeHosts.includes("*"))) {
          setAlwaysActiveTab(true);
        } else {
          setAlwaysActiveTab(false);
        }
      });
    };
    checkAlwaysActive();

    // 4. Enable Copy Host Status
    const checkEnableCopy = async () => {
      const tab = await extensionUtils.getActiveTab();
      let hostname = "";
      if (tab?.url?.startsWith("http")) {
        try {
          hostname = new URL(tab.url).hostname;
        } catch {
          // Ignore
        }
      }
      extensionUtils.chromeStorageGetLocal(extensionUtils.KEYS.ENABLE_COPY_HOSTS, (hosts) => {
        let activeHosts = hosts;
        if (typeof activeHosts === "string") {
          try {
            activeHosts = JSON.parse(activeHosts);
          } catch {
            activeHosts = [];
          }
        }
        if (Array.isArray(activeHosts) && hostname && (activeHosts.includes(hostname) || activeHosts.includes("*"))) {
          setEnableCopy(true);
        } else {
          setEnableCopy(false);
        }
      });
    };
    checkEnableCopy();
  }, []);

  // Save Settings helper
  const saveControlsSettings = useCallback(
    (newAiList = aiList, newConcurrent = concurrentRequests, newDelay = autoHideDelay) => {
      if (!isInitialized) return;
      const controlsData = {
        aiProviders: newAiList,
        concurrentRequests: newConcurrent,
        autoHideDelay: newDelay,
        chatbotTheme: theme,
      };
      extensionUtils.chromeStorageSetLocal(extensionUtils.KEYS.CONTROLS, controlsData);
    },
    [aiList, concurrentRequests, autoHideDelay, theme, isInitialized]
  );

  // Toggle Provider with strict MAX 3 limit
  const handleToggleProvider = (providerId) => {
    setAiList((prevList) => {
      const target = prevList.find((p) => p.id === providerId);
      if (!target) return prevList;

      const willEnable = !target.enabled;

      // Check max 3 limit
      if (willEnable && enabledCount >= 3) {
        setMaxProviderWarning(true);
        if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
        warningTimerRef.current = setTimeout(() => {
          setMaxProviderWarning(false);
        }, 3500);
        return prevList;
      }

      // Hide warning if disabling
      if (!willEnable) {
        setMaxProviderWarning(false);
      }

      const updated = prevList.map((p) =>
        p.id === providerId ? { ...p, enabled: willEnable } : p
      );
      saveControlsSettings(updated);
      return updated;
    });
  };

  // Drag and Drop
  const handleDragStart = (e, index) => {
    setDraggedItem(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedItem !== null && draggedItem !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedItem === null || draggedItem === dropIndex) {
      setDraggedItem(null);
      setDragOverIndex(null);
      return;
    }

    const newList = [...aiList];
    const item = newList[draggedItem];
    newList.splice(draggedItem, 1);
    newList.splice(dropIndex, 0, item);

    setAiList(newList);
    setDraggedItem(null);
    setDragOverIndex(null);
    saveControlsSettings(newList);
  };

  // Toggle In-Page Widget
  const handleToggleWidget = () => {
    const nextState = !widgetEnabled;
    setWidgetEnabled(nextState);
    const updatedSettings = { enable: nextState };
    extensionUtils.chromeStorageSetLocal(extensionUtils.KEYS.SETTINGS, updatedSettings, () => {
      extensionUtils.runtimeSendMessage("P_B_TOGGLE");
    });
  };

  // Toggle Always Active Tab
  const handleToggleAlwaysActive = () => {
    setAlwaysActiveTab(!alwaysActiveTab);
    extensionUtils.runtimeSendMessage("P_B_TOGGLE_ALWAYS_ACTIVE");
  };

  // Toggle Enable Copy
  const handleToggleEnableCopy = async () => {
    const nextState = !enableCopy;
    setEnableCopy(nextState);

    const tab = await extensionUtils.getActiveTab();
    let hostname = "";
    if (tab?.url?.startsWith("http")) {
      try {
        hostname = new URL(tab.url).hostname;
      } catch {
        // Ignore
      }
    }
    if (!tab || !hostname) return;

    extensionUtils.chromeStorageGetLocal(extensionUtils.KEYS.ENABLE_COPY_HOSTS, (storedHosts) => {
      let hosts = storedHosts || [];
      if (typeof hosts === "string") {
        try {
          hosts = JSON.parse(hosts);
        } catch {
          hosts = [];
        }
      }
      if (!Array.isArray(hosts)) hosts = [];

      if (nextState) {
        if (!hosts.includes(hostname)) hosts.push(hostname);
      } else {
        hosts = hosts.filter((h) => h !== hostname && h !== "*");
      }

      extensionUtils.chromeStorageSetLocal(extensionUtils.KEYS.ENABLE_COPY_HOSTS, hosts, () => {
        if (chrome?.tabs?.sendMessage && tab.id) {
          chrome.tabs.sendMessage(
            tab.id,
            { action: nextState ? "enable_function" : "disable_function" },
            () => {
              void chrome.runtime.lastError;
            }
          );
        }
      });
    });
  };

  // Reset floating widget position
  const handleResetWidgetPosition = () => {
    extensionUtils.chromeStorageSetLocal("menu_window_location", { x: 20, y: 20 }, () => {
      extensionUtils.runtimeSendMessage("P_B_RESET_WIDGET_POSITION");
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#0e1015] text-[#0f172a] dark:text-[#f8fafc] overflow-hidden">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-200 dark:border-white/[0.07] bg-white/50 dark:bg-[#14161e]/50 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500 dark:text-blue-400">
            <SettingsIcon className="w-5 h-5" size={20} />
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-tight">Settings</h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Customize AI models, widget & browser controls
            </p>
          </div>
        </div>

        {onBack && (
          <button
            onClick={onBack}
            className="px-2.5 py-1 rounded-lg text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-white/5 transition-all focus:outline-none cursor-pointer"
          >
            Done
          </button>
        )}
      </div>

      {/* Settings Scrollable Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3.5 space-y-4">
        {/* ======================================================== */}
        {/* SECTION 1: AI Provider Selection (Max 3 Enforcement)     */}
        {/* ======================================================== */}
        <section className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Active AI Models ({enabledCount}/3)
            </h3>
            <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
              Max 3 active
            </span>
          </div>

          {/* Warning Banner when exceeding max 3 limit */}
          {maxProviderWarning && (
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400 text-xs flex items-center gap-2 animate-fade-in">
              <IoAlertCircleOutline className="w-4 h-4 shrink-0" />
              <span>Maximum 3 providers can be active simultaneously. Please disable one first.</span>
            </div>
          )}

          {/* Providers List with Drag & Drop */}
          <div className="space-y-1.5">
            {aiList.map((ai, index) => {
              const isEnabled = ai.enabled;
              const isOver = dragOverIndex === index;

              return (
                <div
                  key={ai.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                    isEnabled
                      ? "bg-white dark:bg-[#191c25] border-slate-200/80 dark:border-white/[0.08] shadow-xs"
                      : "bg-slate-100/60 dark:bg-white/[0.02] border-transparent opacity-65"
                  } ${isOver ? "border-blue-500 scale-[1.01]" : ""}`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="cursor-grab active:cursor-grabbing text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300">
                      <DragHandleIcon className="w-3.5 h-3.5" size={14} />
                    </span>
                    <ProviderIcon id={ai.id} className="w-4 h-4" size={18} />
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {ai.name}
                    </span>
                  </div>

                  {/* Toggle Switch */}
                  <button
                    onClick={() => handleToggleProvider(ai.id)}
                    className={`relative w-9 h-5 rounded-full transition-colors duration-200 focus:outline-none cursor-pointer ${
                      isEnabled
                        ? "bg-blue-600 dark:bg-blue-500"
                        : "bg-slate-300 dark:bg-slate-700"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 shadow-xs ${
                        isEnabled ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* ======================================================== */}
        {/* SECTION 2: In-Page Floating Widget Settings              */}
        {/* ======================================================== */}
        <section className="p-3.5 rounded-2xl bg-white dark:bg-[#191c25] border border-slate-200/80 dark:border-white/[0.07] shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                In-Page Floating Widget
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Show draggable AI pill menu on web pages
              </p>
            </div>

            <button
              onClick={handleToggleWidget}
              className={`relative w-9 h-5 rounded-full transition-colors duration-200 focus:outline-none cursor-pointer ${
                widgetEnabled ? "bg-blue-600 dark:bg-blue-500" : "bg-slate-300 dark:bg-slate-700"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 shadow-xs ${
                  widgetEnabled ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Auto-Hide Inactivity Timer */}
          <div className="pt-2 border-t border-slate-100 dark:border-white/[0.05] space-y-1.5">
            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
              Auto-Hide Minimized Widget
            </span>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { label: "Never", val: 0 },
                { label: "5s", val: 5 },
                { label: "10s", val: 10 },
                { label: "30s", val: 30 },
              ].map((opt) => (
                <button
                  key={opt.val}
                  onClick={() => {
                    setAutoHideDelay(opt.val);
                    saveControlsSettings(aiList, concurrentRequests, opt.val);
                  }}
                  className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all focus:outline-none cursor-pointer ${
                    autoHideDelay === opt.val
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/[0.08]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reset Position Button */}
          <div className="pt-2 border-t border-slate-100 dark:border-white/[0.05] flex items-center justify-between">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Widget placement on screen
            </span>
            <button
              onClick={handleResetWidgetPosition}
              className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-medium focus:outline-none cursor-pointer"
            >
              <IoRefreshOutline className="w-3.5 h-3.5" />
              <span>Reset Position</span>
            </button>
          </div>
        </section>

        {/* ======================================================== */}
        {/* SECTION 3: Core Browser Features (Toggles)               */}
        {/* ======================================================== */}
        <section className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Browser Powers
          </h3>

          {/* Always Active Tab */}
          <div className="p-3 rounded-2xl bg-white dark:bg-[#191c25] border border-slate-200/80 dark:border-white/[0.07] shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-500">
                <IoFlashOutline className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  Always Active Tab
                </h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Prevents videos, timers & tabs from sleeping
                </p>
              </div>
            </div>

            <button
              onClick={handleToggleAlwaysActive}
              className={`relative w-9 h-5 rounded-full transition-colors duration-200 focus:outline-none cursor-pointer ${
                alwaysActiveTab ? "bg-orange-500" : "bg-slate-300 dark:bg-slate-700"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 shadow-xs ${
                  alwaysActiveTab ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Enable Copy */}
          <div className="p-3 rounded-2xl bg-white dark:bg-[#191c25] border border-slate-200/80 dark:border-white/[0.07] shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500">
                <IoShieldCheckmarkOutline className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  Enable Copy & Right-Click
                </h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Bypasses copy-protection & context blockers
                </p>
              </div>
            </div>

            <button
              onClick={handleToggleEnableCopy}
              className={`relative w-9 h-5 rounded-full transition-colors duration-200 focus:outline-none cursor-pointer ${
                enableCopy ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 shadow-xs ${
                  enableCopy ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </section>

        {/* ======================================================== */}
        {/* SECTION 4: Appearance & Contrast Mode                    */}
        {/* ======================================================== */}
        <section className="p-3.5 rounded-2xl bg-white dark:bg-[#191c25] border border-slate-200/80 dark:border-white/[0.07] shadow-xs space-y-3">
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
              Theme Mode
            </h4>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "dark", label: "Dark", icon: IoMoonOutline },
                { id: "light", label: "Light", icon: IoSunnyOutline },
                { id: "system", label: "System", icon: IoDesktopOutline },
              ].map((mode) => {
                const Icon = mode.icon;
                const isSelected = theme === mode.id;

                return (
                  <button
                    key={mode.id}
                    onClick={() => setTheme(mode.id)}
                    className={`flex flex-col items-center gap-1.5 py-2 px-2 rounded-xl text-xs font-medium border transition-all focus:outline-none cursor-pointer ${
                      isSelected
                        ? "bg-blue-600 text-white border-blue-500 shadow-xs"
                        : "bg-slate-50 dark:bg-white/[0.03] border-slate-200 dark:border-white/[0.06] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06]"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{mode.label}</span>
                    {isSelected && <IoCheckmark className="w-3.5 h-3.5 -mt-0.5" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Contrast / Glass Transparency Mode */}
          <div className="pt-2 border-t border-slate-100 dark:border-white/[0.05] space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                Transparency Mode
              </h4>
              <span className="text-[11px] font-medium text-slate-400 capitalize">
                {contrastMode || "solid"}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "solid", label: "Solid", desc: "100% Opaque" },
                { id: "medium", label: "Medium", desc: "Soft Glass" },
                { id: "transparent", label: "Transparent", desc: "Clear Glass" },
              ].map((cMode) => {
                const isSelected = (contrastMode || "solid") === cMode.id;
                return (
                  <button
                    key={cMode.id}
                    onClick={() => setContrastMode(cMode.id)}
                    className={`flex flex-col items-center gap-0.5 py-2 px-1.5 rounded-xl text-xs font-medium border transition-all focus:outline-none cursor-pointer ${
                      isSelected
                        ? "bg-blue-600 text-white border-blue-500 shadow-xs"
                        : "bg-slate-50 dark:bg-white/[0.03] border-slate-200 dark:border-white/[0.06] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06]"
                    }`}
                  >
                    <span className="font-semibold">{cMode.label}</span>
                    <span className={`text-[10px] ${isSelected ? "text-blue-100" : "text-slate-400"}`}>
                      {cMode.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

Controls.propTypes = {
  onBack: PropTypes.func,
};
