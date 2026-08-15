import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { HistoryIcon } from "./Icons.jsx";
import { IoTrashOutline, IoTimeOutline, IoChevronForward, IoAlertCircleOutline } from "react-icons/io5";
import UTILS from "../utils/utilsModule.js";
import { useTheme } from "../hooks/useThemeHook.jsx";

export default function HistoryView({ onLoadQuery }) {
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

  const handleClearHistory = () => {
    setHistory([]);
    UTILS.chromeStorageSetLocal(UTILS.KEYS.HISTORY, []);
    setShowConfirmClear(false);
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  return (
    <div className="flex flex-col h-full bg-transparent text-[#0f172a] dark:text-[#f8fafc] overflow-hidden">
      {/* View Header */}
      <div
        className={`flex items-center justify-between px-4 py-3.5 border-b shrink-0 ${
          contrastMode === "solid"
            ? "bg-slate-100 dark:bg-[#14161e] border-slate-200 dark:border-white/[0.08]"
            : contrastMode === "medium"
            ? "bg-slate-100/30 dark:bg-black/20 backdrop-blur-sm border-slate-200/40 dark:border-white/[0.06]"
            : "bg-transparent border-slate-200/20 dark:border-white/[0.04]"
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500 dark:text-blue-400">
            <HistoryIcon className="w-5 h-5" size={20} />
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-tight">Chat History</h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {history.length} {history.length === 1 ? "saved query" : "saved queries"}
            </p>
          </div>
        </div>

        {history.length > 0 && (
          <button
            onClick={() => setShowConfirmClear(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-rose-500 hover:bg-rose-500/10 dark:hover:bg-rose-500/20 transition-all font-medium focus:outline-none cursor-pointer"
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
            <div className="w-12 h-12 rounded-2xl bg-slate-100/60 dark:bg-white/[0.04] flex items-center justify-center text-slate-400 mb-3 border border-slate-200/80 dark:border-white/[0.06]">
              <IoTimeOutline className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              No History Yet
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[220px]">
              Ask your multi-AI assistants any questions and your queries will be saved here automatically.
            </p>
          </div>
        ) : (
          history.map((item, idx) => (
            <div
              key={idx}
              onClick={() => onLoadQuery && onLoadQuery(item)}
              className={`group relative flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer shadow-xs ${
                contrastMode === "solid"
                  ? "bg-white dark:bg-[#191c25] hover:bg-blue-50/70 dark:hover:bg-[#202430]/90 border-slate-200 dark:border-white/[0.08]"
                  : contrastMode === "medium"
                  ? "bg-white/35 dark:bg-white/[0.06] backdrop-blur-sm hover:bg-blue-50/70 dark:hover:bg-white/[0.12] border-slate-200/40 dark:border-white/[0.06]"
                  : "bg-white/[0.06] dark:bg-white/[0.02] hover:bg-white/15 dark:hover:bg-white/[0.06] border-slate-200/15 dark:border-white/[0.03]"
              }`}
            >
              <div className="flex flex-col gap-1 pr-2 overflow-hidden flex-1">
                <span className="text-xs font-medium text-slate-800 dark:text-slate-200 line-clamp-2 leading-relaxed">
                  {item.question}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                  <IoTimeOutline className="w-3 h-3" />
                  {formatTime(item.timestamp || item.date)}
                </span>
              </div>
              <IoChevronForward className="w-4 h-4 text-slate-400 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all shrink-0" />
            </div>
          ))
        )}
      </div>

      {/* Confirmation Dialog Modal */}
      {showConfirmClear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-[280px] bg-white dark:bg-[#191c25] rounded-2xl p-4 border border-slate-200 dark:border-white/10 shadow-2xl space-y-3">
            <div className="flex items-center gap-2.5 text-rose-500">
              <IoAlertCircleOutline className="w-5 h-5" />
              <h4 className="text-sm font-semibold">Clear Chat History?</h4>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              This will remove all {history.length} saved query sessions permanently.
            </p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => setShowConfirmClear(false)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleClearHistory}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition-all shadow-xs cursor-pointer"
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
};
