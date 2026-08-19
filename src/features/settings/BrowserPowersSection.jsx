import PropTypes from "prop-types";
import { BsWindowSidebar } from "react-icons/bs";
import {
  IoFlashOutline,
  IoShieldCheckmarkOutline,
  IoGlobeOutline,
} from "react-icons/io5";

export default function BrowserPowersSection({
  widgetEnabled,
  currentHostname,
  alwaysActiveTab,
  enableCopy,
  cardBg,
  onToggleWidget,
  onToggleAlwaysActive,
  onToggleEnableCopy,
}) {
  return (
    <section className="space-y-2.5">
      <div className="flex items-center gap-1.5">
        <IoGlobeOutline className="w-3.5 h-3.5 text-indigo-500" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
          Browser & Tab Powers
        </h3>
      </div>

      <div className="space-y-2">
        {/* Floating AI Widget Power */}
        <div
          className={`p-3 rounded-2xl border shadow-xs flex items-center justify-between transition-all ${cardBg}`}
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
              <BsWindowSidebar className="w-4 h-4" />
            </div>
            <div className="pr-1">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                Floating AI Widget
              </h4>
              <p className="text-[10px] font-medium text-slate-600 dark:text-slate-300 mt-0.5">
                {widgetEnabled
                  ? `Active on ${currentHostname || "this tab"}`
                  : "Show draggable AI pill menu on web pages"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onToggleWidget}
            className={`relative w-11 h-6 rounded-full transition-colors duration-300 focus:outline-none cursor-pointer p-0.5 shadow-inner shrink-0 ${
              widgetEnabled
                ? "bg-blue-600 dark:bg-blue-500"
                : "bg-slate-300 dark:bg-slate-700"
            }`}
            title={widgetEnabled ? "Hide floating widget" : "Show floating widget"}
          >
            <span
              className={`block w-5 h-5 rounded-full bg-white transition-transform duration-300 shadow-md ${
                widgetEnabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Always Active Tab */}
        <div
          className={`p-3 rounded-2xl border shadow-xs flex items-center justify-between transition-all ${cardBg}`}
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500 shrink-0">
              <IoFlashOutline className="w-4 h-4" />
            </div>
            <div className="pr-1">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                Always Active Tab
              </h4>
              <p className="text-[10px] font-medium text-slate-600 dark:text-slate-300 mt-0.5">
                Prevents background timers & tabs from sleeping
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onToggleAlwaysActive}
            className={`relative w-11 h-6 rounded-full transition-colors duration-300 focus:outline-none cursor-pointer p-0.5 shadow-inner shrink-0 ${
              alwaysActiveTab ? "bg-orange-500" : "bg-slate-300 dark:bg-slate-700"
            }`}
            title={alwaysActiveTab ? "Disable Always Active" : "Enable Always Active"}
          >
            <span
              className={`block w-5 h-5 rounded-full bg-white transition-transform duration-300 shadow-md ${
                alwaysActiveTab ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Enable Copy & Context Blocker Bypass */}
        <div
          className={`p-3 rounded-2xl border shadow-xs flex items-center justify-between transition-all ${cardBg}`}
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500 shrink-0">
              <IoShieldCheckmarkOutline className="w-4 h-4" />
            </div>
            <div className="pr-1">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                Enable Copy & Right-Click
              </h4>
              <p className="text-[10px] font-medium text-slate-600 dark:text-slate-300 mt-0.5">
                Bypasses text-select & right-click blockers
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onToggleEnableCopy}
            className={`relative w-11 h-6 rounded-full transition-colors duration-300 focus:outline-none cursor-pointer p-0.5 shadow-inner shrink-0 ${
              enableCopy ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700"
            }`}
            title={enableCopy ? "Disable copy unlocker" : "Enable copy unlocker"}
          >
            <span
              className={`block w-5 h-5 rounded-full bg-white transition-transform duration-300 shadow-md ${
                enableCopy ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>
    </section>
  );
}

BrowserPowersSection.propTypes = {
  widgetEnabled: PropTypes.bool.isRequired,
  currentHostname: PropTypes.string.isRequired,
  alwaysActiveTab: PropTypes.bool.isRequired,
  enableCopy: PropTypes.bool.isRequired,
  cardBg: PropTypes.string.isRequired,
  onToggleWidget: PropTypes.func.isRequired,
  onToggleAlwaysActive: PropTypes.func.isRequired,
  onToggleEnableCopy: PropTypes.func.isRequired,
};
