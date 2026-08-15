import { useEffect, useState } from "react";
import { IoShieldCheckmarkOutline } from "react-icons/io5";
import extensionUtils from "./../utils/utilsModule.js";

export default function EnableCopyToggle() {
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
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
            setChecked(true);
          } else {
            setChecked(false);
          }
        }
      );
    };

    checkStatus();
  }, []);

  const handleClick = async () => {
    const nextState = !checked;
    setChecked(nextState);

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
            // eslint-disable-next-line no-undef
            if (typeof chrome !== "undefined" && chrome.tabs?.sendMessage && tab.id) {
              // eslint-disable-next-line no-undef
              chrome.tabs.sendMessage(
                tab.id,
                { action: nextState ? "enable_function" : "disable_function" },
                () => {
                  // eslint-disable-next-line no-undef
                  void chrome.runtime?.lastError;
                }
              );
            }
          }
        );
      }
    );
  };

  return (
    <div className="w-full">
      <div
        className="relative w-full h-[52px] rounded-xl flex items-center bg-white dark:bg-[#181a24] border border-slate-200/90 dark:border-white/[0.08] hover:border-indigo-400/40 dark:hover:border-white/[0.15] shadow-xs transition-all duration-200 overflow-hidden cursor-pointer select-none"
        onClick={handleClick}
      >
        <div className="flex items-center justify-between w-full px-3.5 pointer-events-none">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500 shrink-0">
              <IoShieldCheckmarkOutline className="w-4 h-4" />
            </div>
            <div className="flex flex-col items-start justify-center">
              <span className="font-bold text-[13px] text-slate-800 dark:text-slate-100 leading-tight">
                Enable Copy & Right-Click
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal">
                {checked ? "Copy protection bypassed" : "Allow text selection & copy"}
              </span>
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              checked={checked}
              onChange={() => {}}
              className="switch-blue pointer-events-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
