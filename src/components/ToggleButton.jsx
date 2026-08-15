import { useEffect, useState } from "react";
import extensionUtils from "./../utils/utilsModule.js";

export default function ToggleButton() {
  const [checked, setChecked] = useState(false);
  const [settings, setSettings] = useState({
    enable: false,
  });

  useEffect(() => {
    extensionUtils.chromeStorageGetLocal(
      extensionUtils.KEYS.SETTINGS,
      (storedSettings) => {
        if (storedSettings) {
          setSettings(storedSettings);
          setChecked(Boolean(storedSettings.enable));
        }
      }
    );
  }, []);

  const handleClick = () => {
    const nextState = !checked;
    setChecked(nextState);
    const updatedSettings = { ...settings, enable: nextState };
    setSettings(updatedSettings);
    extensionUtils.chromeStorageSetLocal(
      extensionUtils.KEYS.SETTINGS,
      updatedSettings,
      () => {
        extensionUtils.runtimeSendMessage("P_B_TOGGLE");
      }
    );
  };

  return (
    <div className="w-full">
      <div
        className={`animated-button relative w-full h-[52px] rounded-xl flex items-center shadow-md transition-[filter,opacity] duration-150 overflow-hidden cursor-pointer ${
          !checked ? "grayscale opacity-80" : ""
        }`}
        onClick={handleClick}
      >
        <div className="flex items-center justify-between w-full px-4 pointer-events-none">
          <div className="flex flex-col items-start justify-center">
            <span className="font-bold text-[15px] text-white z-4 relative leading-tight">
              Floating AI Menu
            </span>
            <span className="text-[11px] text-white/80 z-4 relative leading-normal">
              {checked ? "Active on web pages" : "Click to activate"}
            </span>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="main-toggle"
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
