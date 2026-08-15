/* eslint-disable no-undef */
import { useEffect, useState } from "react";
import extensionUtils from "./../utils/utilsModule.js";

export default function EnableCopyToggle() {
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      // Get the active tab's hostname
      const tab = await extensionUtils.getActiveTab();
      let hostname = "";
      if (tab && tab.url?.startsWith("http")) {
        try {
          hostname = new URL(tab.url).hostname;
        } catch {
          // ignore invalid url
        }
      }

      // Check if hostname is in the list of active hosts
      extensionUtils.chromeStorageGetLocal(
        extensionUtils.KEYS.ENABLE_COPY_HOSTS,
        (hosts) => {
          const activeHosts = hosts || [];
          if (
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
    if (tab && tab.url?.startsWith("http")) {
      try {
        hostname = new URL(tab.url).hostname;
      } catch {
        // ignore invalid url
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
          extensionUtils.chromeStorageSetLocal(
            extensionUtils.KEYS.ENABLE_COPY_HOSTS,
            hosts,
            () => {
              // 1. Send tab message
              try {
                if (chrome.tabs?.sendMessage && tab.id) {
                  chrome.tabs.sendMessage(
                    tab.id,
                    { action: "enable_function" },
                    () => {
                      void chrome.runtime.lastError;
                    }
                  );
                }
              } catch {
                // Ignore if tab is not reachable
              }
              // 2. Dispatch custom event across all frames
              try {
                if (chrome.scripting?.executeScript && tab.id) {
                  chrome.scripting
                    .executeScript({
                      target: { tabId: tab.id, allFrames: true },
                      func: () =>
                        window.dispatchEvent(
                          new CustomEvent("__enableCopy__enable")
                        ),
                    })
                    .catch(() => {});
                }
              } catch {
                // Ignore if tab is not reachable
              }
            }
          );
        } else {
          hosts = hosts.filter((h) => h !== hostname && h !== "*");
          extensionUtils.chromeStorageSetLocal(
            extensionUtils.KEYS.ENABLE_COPY_HOSTS,
            hosts,
            () => {
              // 1. Send tab message
              try {
                if (chrome.tabs?.sendMessage && tab.id) {
                  chrome.tabs.sendMessage(
                    tab.id,
                    { action: "disable_function" },
                    () => {
                      void chrome.runtime.lastError;
                    }
                  );
                }
              } catch {
                // Ignore if tab is not reachable
              }
              // 2. Dispatch custom event across all frames
              try {
                if (chrome.scripting?.executeScript && tab.id) {
                  chrome.scripting
                    .executeScript({
                      target: { tabId: tab.id, allFrames: true },
                      func: () =>
                        window.dispatchEvent(
                          new CustomEvent("__enableCopy__disable")
                        ),
                    })
                    .catch(() => {});
                }
              } catch {
                // Ignore if tab is not reachable
              }
            }
          );
        }
      }
    );
  };

  return (
    <div className="w-full mt-2">
      <div
        className={`animated-button relative w-full h-16 rounded-xl grid place-items-center shadow-lg transition-[filter,opacity] duration-150 overflow-hidden cursor-pointer ${
          !checked ? "grayscale opacity-80" : ""
        }`}
        style={{
          "--button-gradient-start": "#a855f7",
          "--button-gradient-end": "#6d28d9",
        }}
        onClick={handleClick}
      >
        <div className="flex items-center justify-between w-full px-6 pointer-events-none">
          <div className="flex flex-col items-start">
            <span className="font-bold text-xl text-white z-4 relative leading-tight">
              Enable Copy & Right Click
            </span>
            <span className="text-sm text-white/80 z-4 relative">
              {checked ? "Copy & right-click unlocked" : "Click to activate"}
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={checked}
              onChange={() => {}}
              className="scale-125 pointer-events-none"
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
