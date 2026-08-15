/* eslint-disable no-undef */
import { useCallback, useEffect, useState } from "react";
import {
  IoChevronDownOutline,
  IoChevronUpOutline,
  IoDesktopOutline,
  IoFlashOutline,
  IoMoonOutline,
  IoShieldCheckmarkOutline,
  IoSunnyOutline,
} from "react-icons/io5";
import { useTheme } from "../hooks/useThemeHook.jsx";
import extensionUtils from "./../utils/utilsModule.js";
import { ProviderIcon } from "./Icons.jsx";
import Toast from "./Toast.jsx";

const DEFAULT_AI_OPTIONS = [
  { id: "google", name: "Google AI", enabled: true },
  { id: "bing", name: "Bing AI", enabled: true },
  { id: "gemini", name: "Gemini", enabled: true },
  { id: "perplexity", name: "Perplexity", enabled: false },
  { id: "grok", name: "Grok AI", enabled: false },
];

export default function Controls() {
  const { theme, setTheme, contrastMode, setContrastMode } = useTheme();

  const [aiList, setAiList] = useState(DEFAULT_AI_OPTIONS);
  const [toastMessage, setToastMessage] = useState("");
  const [isToastVisible, setIsToastVisible] = useState(false);

  const showToast = (msg) => {
    setToastMessage(msg);
    setIsToastVisible(true);
  };

  // Widget settings
  const [widgetEnabled, setWidgetEnabled] = useState(false);
  const [autoHideDelay, setAutoHideDelay] = useState(0);
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
        }
        setIsInitialized(true);
      },
    );

    // 2. Widget Toggle
    extensionUtils.chromeStorageGetLocal(
      extensionUtils.KEYS.SETTINGS,
      (settings) => {
        if (settings?.enable !== undefined) {
          setWidgetEnabled(Boolean(settings?.enable));
        }
      },
    );

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
      newDelay = autoHideDelay,
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
            autoHideDelay: newDelay,
          };
          console.log(
            "[Controls] Saving controls settings (without touching theme):",
            controlsData,
          );
          extensionUtils.chromeStorageSetLocal(
            extensionUtils.KEYS.CONTROLS,
            controlsData,
          );
        },
      );
    },
    [aiList, concurrentRequests, autoHideDelay, isInitialized],
  );

  // Toggle Provider: if 3 already active and turning on 4th, turn off 3rd and move new one to 3rd position
  const handleToggleProvider = (providerId) => {
    setAiList((prevList) => {
      const target = prevList.find((p) => p.id === providerId);
      if (!target) return prevList;

      const willEnable = !target.enabled;

      if (!willEnable) {
        // Disabling provider
        const updated = prevList.map((p) =>
          p.id === providerId ? { ...p, enabled: false } : p,
        );
        saveControlsSettings(updated);
        return updated;
      }

      // User is enabling a model:
      const activeList = prevList.filter((p) => p.enabled);

      if (activeList.length >= 3) {
        // Turn OFF the 3rd active model and activate the new model
        const thirdActive = activeList[2];

        const updated = prevList.map((p) => {
          if (p.id === providerId) return { ...p, enabled: true };
          if (p.id === thirdActive.id) return { ...p, enabled: false };
          return p;
        });

        // Ensure newly enabled model is placed in active slot 3
        const newActive = updated.filter((p) => p.enabled);
        const newInactive = updated.filter((p) => !p.enabled);
        const ordered = [...newActive, ...newInactive];

        saveControlsSettings(ordered);
        showToast(`Switched "${thirdActive.name}" to "${target.name}" (Max 3 active)`);
        return ordered;
      }

      // Less than 3 active models
      const updated = prevList.map((p) =>
        p.id === providerId ? { ...p, enabled: true } : p,
      );
      saveControlsSettings(updated);
      return updated;
    });
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
    const nextState = !widgetEnabled;
    setWidgetEnabled(nextState);
    const updatedSettings = { enable: nextState };
    extensionUtils.chromeStorageSetLocal(
      extensionUtils.KEYS.SETTINGS,
      updatedSettings,
      () => {
        extensionUtils.runtimeSendMessage("P_B_TOGGLE");
      },
    );
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
                        disabled={!isEnabled || index === 0 || !aiList[index - 1]?.enabled}
                        className="p-0.5 rounded text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-200/60 dark:hover:bg-white/[0.06] disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-slate-400 transition-colors focus:outline-none cursor-pointer disabled:cursor-not-allowed"
                        title={isEnabled ? "Increase Priority" : "Enable model first"}
                      >
                        <IoChevronUpOutline className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleMoveDown(index)}
                        disabled={!isEnabled || index === aiList.length - 1 || !aiList[index + 1]?.enabled}
                        className="p-0.5 rounded text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-200/60 dark:hover:bg-white/[0.06] disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-slate-400 transition-colors focus:outline-none cursor-pointer disabled:cursor-not-allowed"
                        title={isEnabled ? "Decrease Priority" : "Enable model first"}
                      >
                        <IoChevronDownOutline className="w-3.5 h-3.5" />
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
              <IoDesktopOutline className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                In-Page Floating Widget
              </h4>
              <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                Show draggable AI pill menu on web pages
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

        {/* SECTION 2b: Auto-Hide Widget Settings                     */}
        <section
          className={`p-3.5 rounded-2xl border shadow-xs space-y-2.5 ${cardBgClass}`}
        >
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">
              Auto-Hide Minimized Widget
            </h4>
            <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
              Inactivity timer to dim the minimized pill
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
                  setAutoHideDelay(opt.val);
                  saveControlsSettings(aiList, concurrentRequests, opt.val);
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
                      console.log("[Controls] Theme button clicked:", mode.id);
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
                      console.log(
                        "[Controls] Contrast button clicked:",
                        cMode.id,
                      );
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

      {/* Toast Notification */}
      <Toast
        message={toastMessage}
        isVisible={isToastVisible}
        onClose={() => setIsToastVisible(false)}
      />
    </div>
  );
}
