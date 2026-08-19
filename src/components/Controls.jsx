import { useCallback, useEffect, useState } from "react";
import PropTypes from "prop-types";
import AiModelPriorityList from "../features/settings/AiModelPriorityList.jsx";
import AiModelSwitchModal from "../features/settings/AiModelSwitchModal.jsx";
import BrowserPowersSection from "../features/settings/BrowserPowersSection.jsx";
import InactivityTimersSection from "../features/settings/InactivityTimersSection.jsx";
import ThemeAppearanceSection from "../features/settings/ThemeAppearanceSection.jsx";
import { useTheme } from "../hooks/useThemeHook.jsx";
import extensionUtils from "./../utils/utilsModule.js";
import Toast from "./Toast.jsx";
import {
  MAX_CONCURRENT_AI_PROVIDERS,
  MAX_PRIMARY_PROVIDER_TABS,
} from "./ChatBot.jsx";

const DEFAULT_AI_OPTIONS = [
  { id: "google", name: "Google AI", enabled: true },
  { id: "chatgpt", name: "ChatGPT", enabled: true },
  { id: "gemini", name: "Gemini", enabled: true },
  { id: "claude", name: "Claude", enabled: false },
  { id: "perplexity", name: "Perplexity", enabled: false },
  { id: "grok", name: "Grok AI", enabled: false },
];

export const DEFAULT_AUTO_MINIMIZE_DELAY = 60;
export const DEFAULT_AUTO_HIDE_DELAY = 60;

export default function Controls({ isMenuOpen = true }) {
  const { theme, setTheme, contrastMode, setContrastMode } = useTheme();

  const [aiList, setAiList] = useState(DEFAULT_AI_OPTIONS);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("info");
  const [isToastVisible, setIsToastVisible] = useState(false);
  const [confirmSwitchData, setConfirmSwitchData] = useState(null);

  useEffect(() => {
    if (!isMenuOpen) {
      setConfirmSwitchData(null);
      setIsToastVisible(false);
    }
  }, [isMenuOpen]);

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

  const [widgetEnabled, setWidgetEnabled] = useState(false);
  const [currentHostname, setCurrentHostname] = useState("");
  const [autoHideDelay, setAutoHideDelay] = useState(DEFAULT_AUTO_HIDE_DELAY);
  const [autoMinimizeDelay, setAutoMinimizeDelay] = useState(
    DEFAULT_AUTO_MINIMIZE_DELAY,
  );
  const [concurrentRequests, setConcurrentRequests] = useState(
    MAX_CONCURRENT_AI_PROVIDERS,
  );

  const [alwaysActiveTab, setAlwaysActiveTab] = useState(false);
  const [enableCopy, setEnableCopy] = useState(false);

  const [isInitialized, setIsInitialized] = useState(false);

  const enabledCount = aiList.filter((ai) => ai.enabled).length;

  useEffect(() => {
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

            let count = 0;
            const capped = merged.map((item) => {
              if (item.enabled) {
                count++;
                if (count > MAX_CONCURRENT_AI_PROVIDERS)
                  return { ...item, enabled: false };
              }
              return item;
            });

            // Always place enabled AI providers at the top
            const enabledItems = capped.filter((item) => item.enabled);
            const disabledItems = capped.filter((item) => !item.enabled);
            setAiList([...enabledItems, ...disabledItems]);
          }

          if (data.concurrentRequests !== undefined) {
            setConcurrentRequests(
              Math.min(
                MAX_CONCURRENT_AI_PROVIDERS,
                Math.max(1, Number(data.concurrentRequests)),
              ),
            );
          }

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
        setIsInitialized(true);
      },
    );

    const checkWidgetStatus = async () => {
      const tab = await extensionUtils.getActiveTab();
      let hostname = "";
      if (tab?.url?.startsWith("http")) {
        try {
          hostname = new URL(tab.url).hostname;
          setCurrentHostname(hostname);
        } catch {
        }
      }
      extensionUtils.chromeStorageGetLocal(
        extensionUtils.KEYS.MENU_HOSTS,
        (hosts = []) => {
          let hostList = hosts;
          if (typeof hostList === "string") {
            try {
              hostList = JSON.parse(hostList);
            } catch {
              hostList = [];
            }
          }
          if (!Array.isArray(hostList)) hostList = [];
          if (
            hostname &&
            (hostList.includes(hostname) || hostList.includes("*"))
          ) {
            setWidgetEnabled(true);
          } else {
            setWidgetEnabled(false);
          }
        },
      );
    };
    checkWidgetStatus();

    const checkAlwaysActive = async () => {
      const tab = await extensionUtils.getActiveTab();
      let hostname = "";
      if (tab?.url?.startsWith("http")) {
        try {
          hostname = new URL(tab.url).hostname;
        } catch {
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

    const checkEnableCopy = async () => {
      const tab = await extensionUtils.getActiveTab();
      let hostname = "";
      if (tab?.url?.startsWith("http")) {
        try {
          hostname = new URL(tab.url).hostname;
        } catch {
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

  const handleToggleModel = (id) => {
    const target = aiList.find((ai) => ai.id === id);
    if (!target) return;

    if (target.enabled) {
      setAiList((prev) => {
        const next = prev.map((item) =>
          item.id === id ? { ...item, enabled: false } : item,
        );
        const enabledItems = next.filter((item) => item.enabled);
        const disabledItems = next.filter((item) => !item.enabled);
        const sorted = [...enabledItems, ...disabledItems];
        saveControlsSettings(sorted);
        extensionUtils.pagePostMessage("IF_B_NEW_CHAT", {}, window.parent);
        extensionUtils.pagePostMessage("IF_C_RESET_TO_NEW_CHAT", {}, window.parent);
        return sorted;
      });
      return;
    }

    const activeList = aiList.filter((ai) => ai.enabled);
    if (activeList.length >= MAX_CONCURRENT_AI_PROVIDERS) {
      setConfirmSwitchData({
        targetProvider: target,
        activeProviders: activeList,
        selectedReplaceId:
          activeList[activeList.length - 1]?.id || activeList[0]?.id,
        maxLimit: MAX_CONCURRENT_AI_PROVIDERS,
      });
      return;
    }

    setAiList((prev) => {
      const next = prev.map((item) =>
        item.id === id ? { ...item, enabled: true } : item,
      );
      const enabledItems = next.filter((item) => item.enabled);
      const disabledItems = next.filter((item) => !item.enabled);
      const sorted = [...enabledItems, ...disabledItems];
      saveControlsSettings(sorted);
      extensionUtils.pagePostMessage("IF_B_NEW_CHAT", {}, window.parent);
      extensionUtils.pagePostMessage("IF_C_RESET_TO_NEW_CHAT", {}, window.parent);
      showToast(`Activated ${target.name}`, "success");
      return sorted;
    });
  };

  const executeProviderSwitch = (replaceId, newTarget) => {
    const oldTarget = aiList.find((item) => item.id === replaceId);
    setAiList((prev) => {
      const updated = prev.map((item) => {
        if (item.id === newTarget.id) return { ...item, enabled: true };
        if (item.id === replaceId) return { ...item, enabled: false };
        return item;
      });

      const enabledItems = updated.filter((item) => item.enabled);
      const disabledItems = updated.filter((item) => !item.enabled);
      const nextList = [...enabledItems, ...disabledItems];

      saveControlsSettings(nextList);
      extensionUtils.pagePostMessage("IF_B_NEW_CHAT", {}, window.parent);
      extensionUtils.pagePostMessage("IF_C_RESET_TO_NEW_CHAT", {}, window.parent);
      return nextList;
    });

    setConfirmSwitchData(null);
    showToast(
      `Switched "${oldTarget?.name || "model"}" to "${newTarget.name}" (Max 3 active)`,
      "success",
    );
  };

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

  const handleToggleWidget = () => {
    setWidgetEnabled(!widgetEnabled);
    extensionUtils.runtimeSendMessage("P_B_TOGGLE");
  };

  const handleToggleAlwaysActive = () => {
    setAlwaysActiveTab(!alwaysActiveTab);
    extensionUtils.runtimeSendMessage("P_B_TOGGLE_ALWAYS_ACTIVE");
  };

  const handleToggleEnableCopy = async () => {
    const nextState = !enableCopy;
    setEnableCopy(nextState);

    const tab = await extensionUtils.getActiveTab();
    let hostname = "";
    if (tab?.url?.startsWith("http")) {
      try {
        hostname = new URL(tab.url).hostname;
      } catch {
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
            try {
              if (
                extensionUtils.isExtensionContextValid() &&
                chrome?.tabs?.sendMessage &&
                tab.id
              ) {
                chrome.tabs.sendMessage(
                  tab.id,
                  { action: nextState ? "enable_function" : "disable_function" },
                  () => {
                    void chrome?.runtime?.lastError;
                  },
                );
              }
            } catch {}
          },
        );
      },
    );
  };

  const cardBgClass =
    contrastMode === "solid"
      ? "bg-white dark:bg-[#191c25] border-slate-200/90 dark:border-white/[0.08]"
      : contrastMode === "medium"
        ? "bg-white/95 dark:bg-[#191c25]/95 border-slate-200/60 dark:border-white/[0.07]"
        : "bg-white/80 dark:bg-white/[0.06] border-slate-200/30 dark:border-white/[0.05]";

  return (
    <div className="flex flex-col h-full bg-transparent text-slate-900 dark:text-slate-100 overflow-hidden">
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3.5 space-y-4">
        {/* 1. AI Models Priority & Limits */}
        <AiModelPriorityList
          aiList={aiList}
          enabledCount={enabledCount}
          maxActive={MAX_CONCURRENT_AI_PROVIDERS}
          cardBg={cardBgClass}
          onToggleModel={handleToggleModel}
          onMoveUp={handleMoveUp}
          onMoveDown={handleMoveDown}
        />

        {/* 2. Appearance & Theme Customization */}
        <ThemeAppearanceSection
          theme={theme}
          contrastMode={contrastMode}
          cardBg={cardBgClass}
          onChangeTheme={setTheme}
          onChangeContrastMode={setContrastMode}
        />

        {/* 3. In-Page & Browser Powers */}
        <BrowserPowersSection
          widgetEnabled={widgetEnabled}
          currentHostname={currentHostname}
          alwaysActiveTab={alwaysActiveTab}
          enableCopy={enableCopy}
          cardBg={cardBgClass}
          onToggleWidget={handleToggleWidget}
          onToggleAlwaysActive={handleToggleAlwaysActive}
          onToggleEnableCopy={handleToggleEnableCopy}
        />

        {/* 4. Inactivity & Auto-Dismiss Timers */}
        <InactivityTimersSection
          autoMinimizeDelay={autoMinimizeDelay}
          autoHideDelay={autoHideDelay}
          cardBg={cardBgClass}
          onUpdateMinimizeDelay={(val) => {
            setAutoMinimizeDelay(val);
            saveControlsSettings(aiList, concurrentRequests, autoHideDelay, val);
          }}
          onUpdateHideDelay={(val) => {
            setAutoHideDelay(val);
            saveControlsSettings(aiList, concurrentRequests, val, autoMinimizeDelay);
          }}
        />
      </div>

      <AiModelSwitchModal
        confirmSwitchData={confirmSwitchData}
        contrastMode={contrastMode}
        onClose={() => setConfirmSwitchData(null)}
        onSelectReplaceId={(id) =>
          setConfirmSwitchData((prev) => ({ ...prev, selectedReplaceId: id }))
        }
        onConfirmSwitch={executeProviderSwitch}
      />

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
