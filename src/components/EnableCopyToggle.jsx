import { useEffect, useState } from "react";
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
        className={`animated-button relative w-full h-[52px] rounded-xl flex items-center shadow-md transition-[filter,opacity] duration-150 overflow-hidden cursor-pointer ${
          !checked ? "grayscale opacity-80" : ""
        }`}
        style={{
          "--button-gradient-start": "#a855f7",
          "--button-gradient-end": "#6d28d9",
        }}
        onClick={handleClick}
      >
        <div className="flex items-center justify-between w-full px-4 pointer-events-none">
          <div className="flex flex-col items-start justify-center">
            <span className="font-bold text-[15px] text-white z-4 relative leading-tight">
              Enable Copy & Right Click
            </span>
            <span className="text-[11px] text-white/80 z-4 relative leading-normal">
              {checked ? "Copy & right-click unlocked" : "Click to activate"}
            </span>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              checked={checked}
              onChange={() => {}}
              className="pointer-events-none"
              style={{
                "--switch-color-off": "var(--toggle-switch-off)",
                "--switch-color-on": "var(--toggle-switch-on)",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
