import PropTypes from "prop-types";
import { useEffect, useState } from "react";
import {
  IoAlertCircleOutline,
  IoChatbubblesOutline,
  IoChevronForward,
  IoTimeOutline,
  IoTrashOutline,
} from "react-icons/io5";
import { useTheme } from "../hooks/useThemeHook.jsx";
import UTILS from "../utils/utilsModule.js";
import { HistoryIcon, ProviderIcon } from "./Icons.jsx";

const PAGE_SIZE = 20;

export default function HistoryView({ onLoadQuery, isMenuOpen = true }) {
  const { contrastMode } = useTheme();
  const [history, setHistory] = useState([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [loadingSessionId, setLoadingSessionId] = useState(null);

  useEffect(() => {
    const loadHistory = () => {
      UTILS.getHistoryIndex((indexData) => {
        if (indexData && Array.isArray(indexData)) {
          setHistory(indexData);
        }
      });
    };

    loadHistory();

    // Listen for storage changes so history index updates live
    if (typeof chrome !== "undefined" && chrome.storage?.onChanged) {
      const listener = (changes, areaName) => {
        if (
          areaName === "local" &&
          changes[UTILS.KEYS.HISTORY_INDEX]
        ) {
          loadHistory();
        }
      };
      chrome.storage.onChanged.addListener(listener);
      return () => {
        chrome.storage.onChanged.removeListener(listener);
      };
    }
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

  const handleClearHistory = async () => {
    await UTILS.clearAllHistory();
    setHistory([]);
    setVisibleCount(PAGE_SIZE);
    setShowConfirmClear(false);
  };

  const handleSelectHistoryItem = async (item) => {
    if (!item) return;
    if (item.turns && Array.isArray(item.turns) && item.turns.length > 0) {
      onLoadQuery && onLoadQuery(item);
      return;
    }

    setLoadingSessionId(item.id);
    try {
      const fullChat = await UTILS.getChatSession(item.id);
      if (fullChat) {
        onLoadQuery && onLoadQuery(fullChat);
      } else {
        onLoadQuery && onLoadQuery(item);
      }
    } finally {
      setLoadingSessionId(null);
    }
  };

  const formatDateTimeBadge = (timestamp) => {
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

  const visibleHistory = history.slice(0, visibleCount);
  const hasMore = history.length > visibleCount;

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
          <>
            {visibleHistory.map((item, idx) => {
              const itemProviders =
                Array.isArray(item.providers) && item.providers.length > 0
                  ? item.providers
                  : Array.isArray(item.turns)
                    ? Array.from(
                        new Set(
                          item.turns.flatMap((t) =>
                            Object.keys(t.answers || {}),
                          ),
                        ),
                      )
                    : Object.keys(item.answers || {});

              const turnCount =
                item.turnCount ||
                (Array.isArray(item.turns) ? item.turns.length : 1);

              const isLoadingThis = loadingSessionId === item.id;

              return (
                <div
                  key={item.id || idx}
                  onClick={() => handleSelectHistoryItem(item)}
                  className={`group relative flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer shadow-xs ${
                    contrastMode === "solid"
                      ? "bg-white dark:bg-[#191c25] hover:bg-blue-50/70 dark:hover:bg-[#202430]/90 border-slate-200/90 dark:border-white/[0.08]"
                      : contrastMode === "medium"
                        ? "bg-white/95 dark:bg-[#191c25]/95 hover:bg-blue-50/70 dark:hover:bg-white/[0.12] border-slate-200/60 dark:border-white/[0.07]"
                        : "bg-white/80 dark:bg-white/[0.08] hover:bg-white/90 dark:hover:bg-white/[0.12] border-slate-200/40 dark:border-white/[0.06]"
                  } ${isLoadingThis ? "opacity-70 pointer-events-none" : ""}`}
                >
                  <div className="flex flex-col gap-1.5 pr-2 overflow-hidden flex-1">
                    <span className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2 leading-relaxed">
                      {item.question?.trim() ||
                        (item.image || item.questionImage
                          ? "Visual Screenshot Query"
                          : item.page || item.questionPage
                            ? "Web Page Analysis"
                            : "Conversation Session")}
                    </span>

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                        <IoTimeOutline className="w-3 h-3 shrink-0" />
                        <span>
                          {formatDateTimeBadge(item.timestamp || item.date)}
                        </span>
                      </span>

                      {turnCount > 1 && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1">
                          <IoChatbubblesOutline className="w-2.5 h-2.5" />
                          <span>{turnCount} turns</span>
                        </span>
                      )}

                      {itemProviders.length > 0 && (
                        <div className="flex items-center gap-1 ml-auto">
                          {itemProviders.slice(0, 4).map((pId) => (
                            <div
                              key={pId}
                              className="w-4 h-4 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center p-0.5"
                              title={pId}
                            >
                              <ProviderIcon
                                id={pId}
                                size={11}
                                className="w-3 h-3"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <IoChevronForward className="w-4 h-4 text-slate-500 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all shrink-0 ml-1.5" />
                </div>
              );
            })}

            {/* Load More Button when items exceed 15 */}
            {hasMore && (
              <div className="pt-1.5 pb-1 flex justify-center">
                <button
                  type="button"
                  onClick={() =>
                    setVisibleCount((prev) =>
                      Math.min(prev + PAGE_SIZE, history.length),
                    )
                  }
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-dashed border-slate-300 dark:border-white/20 bg-slate-100/80 dark:bg-white/[0.04] hover:bg-blue-50 dark:hover:bg-blue-500/15 hover:border-blue-400 dark:hover:border-blue-500/50 text-slate-700 dark:text-slate-300 hover:text-blue-600 text-xs font-bold transition-all cursor-pointer shadow-xs focus:outline-none"
                  title="Open more history"
                >
                  <span className="tracking-widest font-black text-sm leading-none">
                    ...
                  </span>
                  <span>Show More ({history.length - visibleCount} more)</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Confirmation Dialog Modal */}
      {showConfirmClear && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/75 p-4 animate-fade-in"
          onClick={() => setShowConfirmClear(false)}
        >
          <div
            className={`w-full max-w-[290px] rounded-2xl p-4.5 border shadow-2xl space-y-3.5 animate-scale-up ${
              contrastMode === "solid"
                ? "bg-white dark:bg-[#191c25] border-slate-200/90 dark:border-white/10"
                : "bg-white/95 dark:bg-[#191c25]/95 border-slate-200/80 dark:border-white/10"
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
