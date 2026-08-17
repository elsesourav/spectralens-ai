import { useCallback, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { BsWindowSidebar } from "react-icons/bs";
import {
  IoDesktopOutline,
  IoFlashOutline,
  IoMoonOutline,
  IoShieldCheckmarkOutline,
  IoSunnyOutline,
} from "react-icons/io5";
import { useTheme } from "../hooks/useThemeHook.jsx";
import extensionUtils from "./../utils/utilsModule.js";
import { ChevronDownIcon, ChevronUpIcon, ProviderIcon } from "./Icons.jsx";
import Toast from "./Toast.jsx";

const DEFAULT_AI_OPTIONS = [
  { id: "google", name: "Google AI", enabled: true },
  { id: "bing", name: "Bing AI", enabled: true },
  { id: "gemini", name: "Gemini", enabled: true },
  { id: "perplexity", name: "Perplexity", enabled: false },
  { id: "grok", name: "Grok AI", enabled: false },
];

export default function Controls({ isMenuOpen = true }) {
  const { theme, setTheme, contrastMode, setContrastMode } = useTheme();

  const [aiList, setAiList] = useState(DEFAULT_AI_OPTIONS);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("info");
  const [isToastVisible, setIsToastVisible] = useState(false);
  const [confirmSwitchData, setConfirmSwitchData] = useState(null);

  // Auto-close confirmation dialog if menu window is minimized or closed
  useEffect(() => {
    if (!isMenuOpen) {
      setConfirmSwitchData(null);
      setIsToastVisible(false);
    }
  }, [isMenuOpen]);

  // Auto-close confirmation dialog on tab change or component unmount
  useEffect(() => {
    return () => {
      setConfirmSwitchData(null);
      setIsToastVisible(false);
    };
  }, []);

  const showToast = (msg, type = "info") => {
    setToastType(type);
    setToastMessage(msg);
    setIsToastVisible(true);
  };

  // Widget settings
  const [widgetEnabled, setWidgetEnabled] = useState(false);
  const [currentHostname, setCurrentHostname] = useState("");
  const [autoHideDelay, setAutoHideDelay] = useState(0);
  const [autoMinimizeDelay, setAutoMinimizeDelay] = useState(0);
  const [concurrentRequests, setConcurrentRequests] = useState(3);

  // Core feature states
  const [alwaysActiveTab, setAlwaysActiveTab] = useState(false);
  const [enableCopy, setEnableCopy] = useState(false);

  const [isInitialized, setIsInitialized] = useState(false);

  const enabledCount = aiList.filter((ai) => ai.enabled).length;

  // Load Settings from Chrome Storage
  useEffect(() => {
    // 1. Controls Data
    extensionUtils.chromeStorageGetLocal(
      extensionUtils.KEYS.CONTROLS,
      (data) => {
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
            setConcurrentRequests(
              Math.min(3, Math.max(1, Number(data.concurrentRequests))),
            );
          }

          if (data.autoHideDelay !== undefined) {
            setAutoHideDelay(Number(data.autoHideDelay));
          }

          if (data.autoMinimizeDelay !== undefined) {
            setAutoMinimizeDelay(Number(data.autoMinimizeDelay));
          }
        }
        setIsInitialized(true);
      },
    );

    // 2. Widget Toggle (Check active tab host)
    const checkWidgetStatus = async () => {
      const tab = await extensionUtils.getActiveTab();
      let hostname = "";
      if (tab?.url?.startsWith("http")) {
        try {
          hostname = new URL(tab.url).hostname;
          setCurrentHostname(hostname);
        } catch {
          // Ignore
        }
      }
      extensionUtils.chromeStorageGetLocal(
        extensionUtils.KEYS.MENU_HOSTS,
        (hosts = []) => {
          let activeHosts = hosts;
          if (typeof activeHosts === "string") {
            try {
              activeHosts = JSON.parse(activeHosts);
            } catch {
              activeHosts = [];
            }
          }
          if (!Array.isArray(activeHosts)) activeHosts = [];
          if (
            hostname &&
            (activeHosts.includes(hostname) || activeHosts.includes("*"))
          ) {
            setWidgetEnabled(true);
          } else {
            setWidgetEnabled(false);
          }
        },
      );
    };
    checkWidgetStatus();

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
      extensionUtils.chromeStorageGetLocal(
        extensionUtils.KEYS.ALWAYS_ACTIVE_HOSTS,
        (hosts = []) => {
          const activeHosts = Array.isArray(hosts) ? hosts : [];
          if (
            hostname &&
            (activeHosts.includes(hostname) || activeHosts.includes("*"))
          ) {
            setAlwaysActiveTab(true);
          } else {
            setAlwaysActiveTab(false);
          }
        },
      );
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
      extensionUtils.chromeStorageGetLocal(
        extensionUtils.KEYS.ENABLE_COPY_HOSTS,
        (hosts) => {
          let activeHosts = hosts;
          if (typeof activeHosts === "string") {
            try {
              activeHosts = JSON.parse(activeHosts);
            } catch {
              activeHosts = [];
            }
          }
          if (
            Array.isArray(activeHosts) &&
            hostname &&
            (activeHosts.includes(hostname) || activeHosts.includes("*"))
          ) {
            setEnableCopy(true);
          } else {
            setEnableCopy(false);
          }
        },
      );
    };
    checkEnableCopy();
  }, []);

  // Save Settings helper
  const saveControlsSettings = useCallback(
    (
      newAiList = aiList,
      newConcurrent = concurrentRequests,
      newHideDelay = autoHideDelay,
      newMinDelay = autoMinimizeDelay,
    ) => {
      if (!isInitialized) return;
      extensionUtils.chromeStorageGetLocal(
        extensionUtils.KEYS.CONTROLS,
        (existingControls = {}) => {
          const controls =
            existingControls && typeof existingControls === "object"
              ? existingControls
              : {};
          const controlsData = {
            ...controls,
            aiProviders: newAiList,
            concurrentRequests: newConcurrent,
            autoHideDelay: newHideDelay,
            autoMinimizeDelay: newMinDelay,
          };
          extensionUtils.chromeStorageSetLocal(
            extensionUtils.KEYS.CONTROLS,
            controlsData,
          );
        },
      );
    },
    [
      aiList,
      concurrentRequests,
      autoHideDelay,
      autoMinimizeDelay,
      isInitialized,
    ],
  );

  // Toggle Provider: if 3 already active and turning on 4th, open theme-aware confirmation modal
  const handleToggleProvider = (providerId) => {
    const target = aiList.find((p) => p.id === providerId);
    if (!target) return;

    if (target.enabled) {
      // Disabling provider is always direct
      setAiList((prevList) => {
        const updated = prevList.map((p) =>
          p.id === providerId ? { ...p, enabled: false } : p,
        );
        saveControlsSettings(updated);
        return updated;
      });
      return;
    }

    // Enabling a model:
    const activeList = aiList.filter((p) => p.enabled);
    if (activeList.length >= 3) {
      // Open confirmation switcher modal so user selects which active model to replace
      setConfirmSwitchData({
        targetProvider: target,
        activeProviders: activeList,
        selectedReplaceId: activeList[2]?.id || activeList[0]?.id,
      });
      return;
    }

    // Less than 3 active models: direct enable
    setAiList((prevList) => {
      const updated = prevList.map((p) =>
        p.id === providerId ? { ...p, enabled: true } : p,
      );
      saveControlsSettings(updated);
      showToast(`Activated ${target.name}`, "success");
      return updated;
    });
  };

  // Confirm replacement of an active model with target model
  const executeProviderSwitch = (replaceId, targetProvider) => {
    const replaced = aiList.find((p) => p.id === replaceId);
    setAiList((prevList) => {
      const updated = prevList.map((p) => {
        if (p.id === targetProvider.id) return { ...p, enabled: true };
        if (p.id === replaceId) return { ...p, enabled: false };
        return p;
      });

      const newActive = updated.filter((p) => p.enabled);
      const newInactive = updated.filter((p) => !p.enabled);
      const ordered = [...newActive, ...newInactive];

      saveControlsSettings(ordered);
      return ordered;
    });

    setConfirmSwitchData(null);
    showToast(
      `Switched "${replaced?.name || "model"}" to "${targetProvider.name}" (Max 3 active)`,
      "success",
    );
  };

  // Move Priority Up / Down (Only active among enabled models)
  const handleMoveUp = (index) => {
    const item = aiList[index];
    if (!item?.enabled || index <= 0) return;
    const prevItem = aiList[index - 1];
    if (!prevItem?.enabled) return;

    setAiList((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[index - 1];
      next[index - 1] = temp;
      saveControlsSettings(next);
      return next;
    });
  };

  const handleMoveDown = (index) => {
    const item = aiList[index];
    if (!item?.enabled || index >= aiList.length - 1) return;
    const nextItem = aiList[index + 1];
    if (!nextItem?.enabled) return;

    setAiList((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[index + 1];
      next[index + 1] = temp;
      saveControlsSettings(next);
      return next;
    });
  };

  // Toggle In-Page Widget
  const handleToggleWidget = () => {
    setWidgetEnabled(!widgetEnabled);
    extensionUtils.runtimeSendMessage("P_B_TOGGLE");
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

    extensionUtils.chromeStorageGetLocal(
      extensionUtils.KEYS.ENABLE_COPY_HOSTS,
      (storedHosts) => {
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

        extensionUtils.chromeStorageSetLocal(
          extensionUtils.KEYS.ENABLE_COPY_HOSTS,
          hosts,
          () => {
            if (chrome?.tabs?.sendMessage && tab.id) {
              chrome.tabs.sendMessage(
                tab.id,
                { action: nextState ? "enable_function" : "disable_function" },
                () => {
                  void chrome.runtime.lastError;
                },
              );
            }
          },
        );
      },
    );
  };

  const cardBgClass =
    contrastMode === "solid"
      ? "bg-white dark:bg-[#191c25] border-slate-200/90 dark:border-white/[0.08]"
      : contrastMode === "medium"
        ? "bg-white/70 dark:bg-[#191c25]/70 backdrop-blur-md border-slate-200/60 dark:border-white/[0.07]"
        : "bg-white/30 dark:bg-white/[0.05] backdrop-blur-sm border-slate-200/30 dark:border-white/[0.05]";

  const itemBgClass =
    contrastMode === "solid"
      ? "bg-white dark:bg-[#191c25] border-slate-200/90 dark:border-white/[0.08]"
      : contrastMode === "medium"
        ? "bg-white/70 dark:bg-[#191c25]/70 backdrop-blur-md border-slate-200/60 dark:border-white/[0.07]"
        : "bg-white/30 dark:bg-white/[0.05] backdrop-blur-sm border-slate-200/30 dark:border-white/[0.05]";

  return (
    <div className="flex flex-col h-full bg-transparent text-slate-900 dark:text-slate-100 overflow-hidden">
      {/* Settings Scrollable Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3.5 space-y-4">
        {/* ======================================================== */}
        {/* SECTION 1: AI Provider Selection (Max 3 Enforcement)     */}
        {/* ======================================================== */}
        <section className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Active AI Models ({enabledCount}/3)
            </h3>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              {enabledCount >= 3
                ? "Max Active"
                : `${3 - enabledCount} slots open`}
            </span>
          </div>

          {/* Providers List with Up/Down Priority Ordering */}
          <div className="space-y-1.5">
            {aiList.map((ai, index) => {
              const isEnabled = ai.enabled;

              return (
                <div
                  key={ai.id}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${itemBgClass} shadow-xs ${
                    isEnabled ? "" : "opacity-70"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Up / Down Priority Buttons (Only active for enabled models) */}
                    <div className="flex flex-col items-center -space-y-0.5">
                      <button
                        onClick={() => handleMoveUp(index)}
                        disabled={
                          !isEnabled ||
                          index === 0 ||
                          !aiList[index - 1]?.enabled
                        }
                        className="p-0.5 rounded text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-200/60 dark:hover:bg-white/[0.06] disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-slate-400 transition-colors focus:outline-none cursor-pointer disabled:cursor-not-allowed"
                        title={
                          isEnabled ? "Increase Priority" : "Enable model first"
                        }
                      >
                        <ChevronUpIcon className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleMoveDown(index)}
                        disabled={
                          !isEnabled ||
                          index === aiList.length - 1 ||
                          !aiList[index + 1]?.enabled
                        }
                        className="p-0.5 rounded text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-200/60 dark:hover:bg-white/[0.06] disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-slate-400 transition-colors focus:outline-none cursor-pointer disabled:cursor-not-allowed"
                        title={
                          isEnabled ? "Decrease Priority" : "Enable model first"
                        }
                      >
                        <ChevronDownIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <ProviderIcon
                      id={ai.id}
                      className="w-5 h-5 shrink-0"
                      size={20}
                    />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {ai.name}
                    </span>
                  </div>

                  {/* Toggle Switch */}
                  <button
                    onClick={() => handleToggleProvider(ai.id)}
                    className={`relative w-11 h-6 rounded-full transition-colors duration-300 focus:outline-none cursor-pointer p-0.5 shadow-inner ${
                      isEnabled
                        ? "bg-blue-600 dark:bg-blue-500"
                        : "bg-slate-300 dark:bg-slate-700"
                    }`}
                  >
                    <span
                      className={`block w-5 h-5 rounded-full bg-white transition-transform duration-300 shadow-md ${
                        isEnabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* ======================================================== */}
        {/* SECTION 2: In-Page Floating Widget                       */}
        {/* ======================================================== */}
        <section
          className={`p-3.5 rounded-2xl border shadow-xs flex items-center justify-between ${cardBgClass}`}
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
              <BsWindowSidebar className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                Floating AI Widget
              </h4>
              <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                {widgetEnabled
                  ? `Active on ${currentHostname || "this tab"}`
                  : "Show draggable AI pill menu on web pages"}
              </p>
            </div>
          </div>

          <button
            onClick={handleToggleWidget}
            className={`relative w-11 h-6 rounded-full transition-colors duration-300 focus:outline-none cursor-pointer p-0.5 shadow-inner ${
              widgetEnabled
                ? "bg-blue-600 dark:bg-blue-500"
                : "bg-slate-300 dark:bg-slate-700"
            }`}
          >
            <span
              className={`block w-5 h-5 rounded-full bg-white transition-transform duration-300 shadow-md ${
                widgetEnabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </section>

        {/* SECTION 2b: Auto-Minimize Chat Window Settings */}
        <section
          className={`p-3.5 rounded-2xl border shadow-xs space-y-2.5 ${cardBgClass}`}
        >
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">
              Auto-Minimize Chat Window
            </h4>
            <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
              Inactivity timer to collapse open window to pill
            </p>
          </div>
          <div className="grid grid-cols-5 gap-1.5 pt-0.5">
            {[
              { label: "Never", val: 0 },
              { label: "20s", val: 20 },
              { label: "30s", val: 30 },
              { label: "60s", val: 60 },
              { label: "90s", val: 90 },
            ].map((opt) => (
              <button
                key={opt.val}
                onClick={() => {
                  setAutoMinimizeDelay(opt.val);
                  saveControlsSettings(
                    aiList,
                    concurrentRequests,
                    autoHideDelay,
                    opt.val,
                  );
                }}
                className={`py-1.5 px-1 rounded-lg text-xs font-bold text-center transition-all focus:outline-none cursor-pointer ${
                  autoMinimizeDelay === opt.val
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100/90 dark:bg-white/[0.05] text-slate-700 dark:text-slate-300 hover:bg-slate-200/90 dark:hover:bg-white/10 border border-slate-200/60 dark:border-white/[0.06]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>

        {/* SECTION 2c: Auto-Invisible Minimized Widget Settings */}
        <section
          className={`p-3.5 rounded-2xl border shadow-xs space-y-2.5 ${cardBgClass}`}
        >
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">
              Auto-Invisible Minimized Widget
            </h4>
            <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
              Inactivity timer to make pill invisible (applies after minimize)
            </p>
          </div>
          <div className="grid grid-cols-5 gap-1.5 pt-0.5">
            {[
              { label: "Never", val: 0 },
              { label: "5s", val: 5 },
              { label: "10s", val: 10 },
              { label: "30s", val: 30 },
              { label: "60s", val: 60 },
            ].map((opt) => (
              <button
                key={opt.val}
                onClick={() => {
                  setAutoHideDelay(opt.val);
                  saveControlsSettings(
                    aiList,
                    concurrentRequests,
                    opt.val,
                    autoMinimizeDelay,
                  );
                }}
                className={`py-1.5 px-1 rounded-lg text-xs font-bold text-center transition-all focus:outline-none cursor-pointer ${
                  autoHideDelay === opt.val
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100/90 dark:bg-white/[0.05] text-slate-700 dark:text-slate-300 hover:bg-slate-200/90 dark:hover:bg-white/10 border border-slate-200/60 dark:border-white/[0.06]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>

        {/* ======================================================== */}
        {/* SECTION 3: Core Browser Features (Toggles)               */}
        {/* ======================================================== */}
        <section className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Browser Powers
          </h3>

          {/* Always Active Tab */}
          <div
            className={`p-3 rounded-2xl border shadow-xs flex items-center justify-between ${cardBgClass}`}
          >
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500 shrink-0">
                <IoFlashOutline className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  Always Active Tab
                </h4>
                <p className="text-[10px] font-medium text-slate-600 dark:text-slate-300">
                  Prevents videos, timers & tabs from sleeping
                </p>
              </div>
            </div>

            <button
              onClick={handleToggleAlwaysActive}
              className={`relative w-11 h-6 rounded-full transition-colors duration-300 focus:outline-none cursor-pointer p-0.5 shadow-inner ${
                alwaysActiveTab
                  ? "bg-orange-500"
                  : "bg-slate-300 dark:bg-slate-700"
              }`}
            >
              <span
                className={`block w-5 h-5 rounded-full bg-white transition-transform duration-300 shadow-md ${
                  alwaysActiveTab ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Enable Copy */}
          <div
            className={`p-3 rounded-2xl border shadow-xs flex items-center justify-between ${cardBgClass}`}
          >
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500 shrink-0">
                <IoShieldCheckmarkOutline className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  Enable Copy & Right-Click
                </h4>
                <p className="text-[10px] font-medium text-slate-600 dark:text-slate-300">
                  Bypasses copy-protection & context blockers
                </p>
              </div>
            </div>

            <button
              onClick={handleToggleEnableCopy}
              className={`relative w-11 h-6 rounded-full transition-colors duration-300 focus:outline-none cursor-pointer p-0.5 shadow-inner ${
                enableCopy ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700"
              }`}
            >
              <span
                className={`block w-5 h-5 rounded-full bg-white transition-transform duration-300 shadow-md ${
                  enableCopy ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </section>

        {/* ======================================================== */}
        {/* SECTION 4: Appearance & Contrast Mode                    */}
        {/* ======================================================== */}
        <section
          className={`p-3.5 rounded-2xl border shadow-xs space-y-3 ${cardBgClass}`}
        >
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">
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
                    onClick={() => {
                      setTheme(mode.id);
                    }}
                    className={`flex flex-col items-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold border transition-all focus:outline-none cursor-pointer ${
                      isSelected
                        ? "bg-blue-600 text-white border-blue-500 shadow-xs"
                        : "bg-slate-100/90 dark:bg-white/[0.05] border-slate-200/80 dark:border-white/[0.07] text-slate-800 dark:text-slate-200 hover:bg-slate-200/90 dark:hover:bg-white/10"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{mode.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Contrast / Glass Transparency Mode */}
          <div className="pt-2 border-t border-slate-100 dark:border-white/[0.05] space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                Transparency Mode
              </h4>
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 capitalize">
                {contrastMode || "solid"}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "solid", label: "Solid", desc: "100% Opaque" },
                { id: "medium", label: "Medium", desc: "Soft Glass" },
                {
                  id: "transparent",
                  label: "Transparent",
                  desc: "Clear Glass",
                },
              ].map((cMode) => {
                const isSelected = (contrastMode || "solid") === cMode.id;
                return (
                  <button
                    key={cMode.id}
                    onClick={() => {
                      setContrastMode(cMode.id);
                    }}
                    className={`flex flex-col items-center gap-0.5 py-2 px-1.5 rounded-xl text-xs border transition-all focus:outline-none cursor-pointer ${
                      isSelected
                        ? "bg-blue-600 text-white border-blue-500 shadow-xs"
                        : "bg-slate-100/90 dark:bg-white/[0.05] border-slate-200/80 dark:border-white/[0.07] text-slate-800 dark:text-slate-200 hover:bg-slate-200/90 dark:hover:bg-white/10"
                    }`}
                  >
                    <span className="font-bold">{cMode.label}</span>
                    <span
                      className={`text-[10px] font-medium ${isSelected ? "text-blue-100" : "text-slate-500 dark:text-slate-400"}`}
                    >
                      {cMode.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      {/* Confirmation Modal for >3 Providers */}
      {confirmSwitchData && (
        <div
          className="fixed inset-0 z-50 bg-black/50 dark:bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setConfirmSwitchData(null)}
        >
          <div
            className={`w-full max-w-[320px] rounded-2xl border shadow-2xl p-4.5 space-y-4 animate-scale-up ${
              contrastMode === "solid"
                ? "bg-white dark:bg-[#191c25] border-slate-200/90 dark:border-white/10"
                : "bg-white/95 dark:bg-[#191c25]/95 backdrop-blur-md border-slate-200/80 dark:border-white/10"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <ProviderIcon
                  id={confirmSwitchData.targetProvider.id}
                  className="w-5 h-5"
                  size={20}
                />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                  Switch Active AI Model
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
                  Max 3 models can run in parallel. Select which model to replace with{" "}
                  <strong className="text-blue-600 dark:text-blue-400 font-bold">
                    {confirmSwitchData.targetProvider.name}
                  </strong>:
                </p>
              </div>
            </div>

            {/* Active Models Radio Selection */}
            <div className="space-y-1.5 pt-1">
              {confirmSwitchData.activeProviders.map((activeModel) => {
                const isSelected =
                  confirmSwitchData.selectedReplaceId === activeModel.id;
                return (
                  <button
                    key={activeModel.id}
                    type="button"
                    onClick={() =>
                      setConfirmSwitchData((prev) => ({
                        ...prev,
                        selectedReplaceId: activeModel.id,
                      }))
                    }
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? "bg-blue-600/10 border-blue-500 text-blue-600 dark:text-blue-400 shadow-xs"
                        : "bg-slate-100/80 dark:bg-white/[0.04] border-slate-200/70 dark:border-white/[0.06] text-slate-700 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <ProviderIcon
                        id={activeModel.id}
                        className="w-4 h-4 shrink-0"
                        size={16}
                      />
                      <span>{activeModel.name}</span>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        isSelected
                          ? "border-blue-600 bg-blue-600 text-white"
                          : "border-slate-400 dark:border-slate-500"
                      }`}
                    >
                      {isSelected && (
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-white/[0.06]">
              <button
                type="button"
                onClick={() => setConfirmSwitchData(null)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  executeProviderSwitch(
                    confirmSwitchData.selectedReplaceId,
                    confirmSwitchData.targetProvider,
                  )
                }
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xs hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
              >
                Switch Model
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      <Toast
        message={toastMessage}
        isVisible={isToastVisible}
        onClose={() => setIsToastVisible(false)}
        type={toastType}
      />
    </div>
  );
}

Controls.propTypes = {
  isMenuOpen: PropTypes.bool,
};
