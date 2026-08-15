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
        className="relative w-full h-[52px] rounded-xl flex items-center bg-white dark:bg-[#181a24] border border-slate-200/90 dark:border-white/[0.08] hover:border-blue-400/40 dark:hover:border-white/[0.15] shadow-xs transition-all duration-200 overflow-hidden cursor-pointer select-none"
        onClick={handleClick}
      >
        <div className="flex items-center justify-between w-full px-4 pointer-events-none">
          <div className="flex flex-col items-start justify-center">
            <span className="font-bold text-[14px] text-slate-800 dark:text-slate-100 leading-tight">
              Floating AI Menu
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
              {checked ? "Active on web pages" : "Click to activate"}
            </span>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="main-toggle"
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
