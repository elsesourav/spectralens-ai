import { useEffect, useState } from "react";
import extensionUtils from "./../utils/utilsModule.js";

export default function AlwaysActiveToggle() {
  const [checked, setChecked] = useState(false);
  const [currentHostname, setCurrentHostname] = useState("");

  useEffect(() => {
    const checkStatus = async () => {
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
        extensionUtils.KEYS.ALWAYS_ACTIVE_HOSTS,
        (hosts = []) => {
          const activeHosts = Array.isArray(hosts) ? hosts : [];
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

  const handleClick = () => {
    setChecked(!checked);
    extensionUtils.runtimeSendMessage("P_B_TOGGLE_ALWAYS_ACTIVE");
  };

  return (
    <div className="w-full">
      <div
        className={`animated-button relative w-full h-[52px] rounded-xl flex items-center shadow-md transition-[filter,opacity] duration-150 overflow-hidden cursor-pointer ${
          !checked ? "grayscale opacity-80" : ""
        }`}
        style={{
          "--button-gradient-start": "#f97316",
          "--button-gradient-end": "#dc2626",
        }}
        onClick={handleClick}
      >
        <div className="flex items-center justify-between w-full px-4 pointer-events-none">
          <div className="flex flex-col items-start justify-center">
            <span className="font-bold text-[15px] text-white z-4 relative leading-tight">
              Always Active Tab
            </span>
            <span className="text-[11px] text-white/80 z-4 relative leading-normal">
              {checked
                ? `Active on ${currentHostname || "this tab"}`
                : "Prevent tab pausing & sleep"}
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
