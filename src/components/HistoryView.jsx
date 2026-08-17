import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { HistoryIcon } from "./Icons.jsx";
import {
  IoTrashOutline,
  IoTimeOutline,
  IoChevronForward,
  IoAlertCircleOutline,
} from "react-icons/io5";
import UTILS from "../utils/utilsModule.js";
import { useTheme } from "../hooks/useThemeHook.jsx";

export default function HistoryView({ onLoadQuery, isMenuOpen = true }) {
  const { contrastMode } = useTheme();
  const [history, setHistory] = useState([]);
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  useEffect(() => {
    UTILS.chromeStorageGetLocal(UTILS.KEYS.HISTORY, (data) => {
      if (data && Array.isArray(data)) {
        setHistory(data);
      }
    });
  }, []);

  // Auto-close confirmation dialog if menu window is minimized or closed
  useEffect(() => {
    if (!isMenuOpen) {
      setShowConfirmClear(false);
    }
  }, [isMenuOpen]);

  // Clean up confirmation dialog on tab switch or component unmount
  useEffect(() => {
    return () => {
      setShowConfirmClear(false);
    };
  }, []);

  const handleClearHistory = () => {
    setHistory([]);
    UTILS.chromeStorageSetLocal(UTILS.KEYS.HISTORY, []);
    setShowConfirmClear(false);
  };

  const formatDateTime = (timestamp) => {
    if (!timestamp) return "";
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return "";

      const timeStr = date.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      });

      const day = date.getDate();
      const monthStr = date.toLocaleString("en-US", { month: "short" });
      const year = date.getFullYear();
      const currentYear = new Date().getFullYear();

      if (year === currentYear) {
        return `${timeStr} • ${day} ${monthStr}`;
      }
      return `${timeStr} • ${day} ${monthStr} ${year}`;
    } catch {
      return "";
    }
  };

  return (
    <div className="flex flex-col h-full bg-transparent text-slate-900 dark:text-slate-100 overflow-hidden">
      {/* View Header */}
      <div
        className={`flex items-center justify-between px-4 py-3.5 border-b shrink-0 ${
          contrastMode === "solid"
            ? "bg-slate-100 dark:bg-[#14161e] border-slate-200/90 dark:border-white/[0.08]"
            : "bg-transparent border-slate-200/50 dark:border-white/[0.06]"
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <HistoryIcon className="w-5 h-5" size={20} />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
              Chat History
            </h2>
            <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
              {history.length}{" "}
              {history.length === 1 ? "saved query" : "saved queries"}
            </p>
          </div>
        </div>

        {history.length > 0 && (
          <button
            onClick={() => setShowConfirmClear(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 dark:hover:bg-rose-500/20 transition-all font-bold focus:outline-none cursor-pointer"
          >
            <IoTrashOutline className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* History Items List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3.5 space-y-2">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
            <div className="w-12 h-12 rounded-2xl bg-slate-200/70 dark:bg-white/[0.06] flex items-center justify-center text-slate-500 dark:text-slate-400 mb-3 border border-slate-200/80 dark:border-white/[0.06]">
              <IoTimeOutline className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
              No History Yet
            </h3>
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300 max-w-[220px]">
              Ask your multi-AI assistants any questions and your queries will
              be saved here automatically.
            </p>
          </div>
        ) : (
          history.map((item, idx) => (
            <div
              key={idx}
              onClick={() => onLoadQuery && onLoadQuery(item)}
              className={`group relative flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer shadow-xs ${
                contrastMode === "solid"
                  ? "bg-white dark:bg-[#191c25] hover:bg-blue-50/70 dark:hover:bg-[#202430]/90 border-slate-200/90 dark:border-white/[0.08]"
                  : contrastMode === "medium"
                    ? "bg-white/80 dark:bg-[#191c25]/75 backdrop-blur-md hover:bg-blue-50/70 dark:hover:bg-white/[0.12] border-slate-200/60 dark:border-white/[0.07]"
                    : "bg-white/50 dark:bg-white/[0.06] backdrop-blur-sm hover:bg-white/70 dark:hover:bg-white/[0.12] border-slate-200/40 dark:border-white/[0.06]"
              }`}
            >
              <div className="flex flex-col gap-1 pr-2 overflow-hidden flex-1">
                <span className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2 leading-relaxed">
                  {item.question}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                  <IoTimeOutline className="w-3 h-3 shrink-0" />
                  <span>{formatDateTime(item.timestamp || item.date)}</span>
                </span>
              </div>
              <IoChevronForward className="w-4 h-4 text-slate-500 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all shrink-0" />
            </div>
          ))
        )}
      </div>

      {/* Confirmation Dialog Modal */}
      {showConfirmClear && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/75 backdrop-blur-xs p-4 animate-fade-in"
          onClick={() => setShowConfirmClear(false)}
        >
          <div
            className={`w-full max-w-[290px] rounded-2xl p-4.5 border shadow-2xl space-y-3.5 animate-scale-up ${
              contrastMode === "solid"
                ? "bg-white dark:bg-[#191c25] border-slate-200/90 dark:border-white/10"
                : "bg-white/95 dark:bg-[#191c25]/95 backdrop-blur-md border-slate-200/80 dark:border-white/10"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 text-rose-500">
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 shrink-0">
                <IoAlertCircleOutline className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                  Clear Chat History?
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
                  This will permanently remove all {history.length} saved query{" "}
                  {history.length === 1 ? "session" : "sessions"}.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-white/[0.06]">
              <button
                type="button"
                onClick={() => setShowConfirmClear(false)}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearHistory}
                className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white transition-all shadow-xs hover:scale-[1.02] active:scale-95 cursor-pointer"
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

HistoryView.propTypes = {
  onLoadQuery: PropTypes.func,
  isMenuOpen: PropTypes.bool,
};
