/* eslint-disable no-undef */
import { useState } from "react";
import PropTypes from "prop-types";
import { ElementSelectorIcon } from "./Icons.jsx";
import { IoCheckmarkCircleOutline, IoScanOutline } from "react-icons/io5";
import UTILS from "../utils/utilsModule.js";
import { useTheme } from "../hooks/useThemeHook.jsx";

export default function SelectorView({ onTriggerComplete }) {
  const { contrastMode } = useTheme();
  const [isActivating, setIsActivating] = useState(false);

  const handleLaunchInspector = async () => {
    setIsActivating(true);
    try {
      const activeTab = await UTILS.getActiveTab();
      if (activeTab?.id) {
        if (typeof chrome !== "undefined" && chrome.tabs?.sendMessage) {
          chrome.tabs.sendMessage(activeTab.id, { type: "C_IF_OPEN_SELECT" }, () => {
            if (chrome.runtime?.lastError) {
              console.log("Could not send selection message:", chrome.runtime.lastError.message);
            }
          });
        }
      }
      if (onTriggerComplete) {
        setTimeout(() => {
          onTriggerComplete();
        }, 400);
      }
    } catch (e) {
      console.error("Error activating selector:", e);
    } finally {
      setTimeout(() => setIsActivating(false), 600);
    }
  };

  return (
    <div className="flex flex-col h-full bg-transparent text-slate-900 dark:text-slate-100 overflow-hidden">
      {/* View Header */}
      <div
        className={`flex items-center gap-2.5 px-4 py-3.5 border-b shrink-0 ${
          contrastMode === "solid"
            ? "bg-slate-100 dark:bg-[#14161e] border-slate-200/90 dark:border-white/[0.08]"
            : contrastMode === "medium"
              ? "bg-slate-100/60 dark:bg-black/35 backdrop-blur-md border-slate-200/60 dark:border-white/[0.07]"
              : "bg-slate-100/40 dark:bg-black/25 backdrop-blur-sm border-slate-200/50 dark:border-white/[0.06]"
        }`}
      >
        <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
          <ElementSelectorIcon className="w-5 h-5" size={20} />
        </div>
        <div>
          <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">Element Selector</h2>
          <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
            Target page content for AI contextual prompts
          </p>
        </div>
      </div>

      {/* Main Content & Instructions */}
      <div className="flex-1 p-4 overflow-y-auto custom-scrollbar flex flex-col justify-between">
        <div className="space-y-4">
          <div
            className={`p-3.5 rounded-2xl border shadow-xs space-y-2.5 ${
              contrastMode === "solid"
                ? "bg-white dark:bg-[#191c25] border-slate-200/90 dark:border-white/[0.08]"
                : contrastMode === "medium"
                  ? "bg-white/80 dark:bg-[#191c25]/75 backdrop-blur-md border-slate-200/60 dark:border-white/[0.07]"
                  : "bg-white/50 dark:bg-white/[0.06] backdrop-blur-sm border-slate-200/40 dark:border-white/[0.06]"
            }`}
          >
            <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <IoScanOutline className="w-4 h-4 text-blue-500" />
              How Element Selection Works
            </h3>
            <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-2 leading-relaxed font-normal">
              <li className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                  1
                </span>
                Click the button below to launch the on-page inspector.
              </li>
              <li className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                  2
                </span>
                Hover and drag a rectangle over any article, code snippet, or UI element.
              </li>
              <li className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                  3
                </span>
                Press <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-100 dark:bg-white/10 rounded">Enter</kbd> to inject into your next prompt.
              </li>
            </ul>
          </div>

          <div className="p-3.5 rounded-2xl bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/20 text-xs text-blue-700 dark:text-blue-300 space-y-1">
            <span className="font-semibold flex items-center gap-1">
              <IoCheckmarkCircleOutline className="w-4 h-4 text-blue-500" /> Instant Context Injection
            </span>
            <p className="text-[11px] leading-normal opacity-90">
              Selected text and HTML structure are attached to your question so all AI models analyze the exact page element.
            </p>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleLaunchInspector}
          disabled={isActivating}
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] text-white text-xs font-semibold shadow-md transition-all flex items-center justify-center gap-2 focus:outline-none cursor-pointer disabled:opacity-60"
        >
          <ElementSelectorIcon className="w-4 h-4" size={16} />
          <span>{isActivating ? "Activating Inspector..." : "Launch Page Inspector"}</span>
        </button>
      </div>
    </div>
  );
}

SelectorView.propTypes = {
  onTriggerComplete: PropTypes.func,
};
