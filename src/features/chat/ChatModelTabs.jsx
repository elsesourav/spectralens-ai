import PropTypes from "prop-types";
import { ProviderIcon, ThreeDotsIcon } from "../../components/Icons.jsx";

export default function ChatModelTabs({
  primaryProviderTabs,
  overflowProviderTabs,
  selectedProvider,
  viewedProviders,
  answers,
  hasAnyActivity,
  contrastMode,
  isMoreMenuOpen,
  setIsMoreMenuOpen,
  onSelectProvider,
  moreMenuRef,
}) {
  const overflowHasAnswer = overflowProviderTabs.some((provider) => {
    const isSelected = hasAnyActivity && selectedProvider === provider.id;
    const provAnswer = answers[provider.id];
    return (
      Boolean(
        provAnswer?.content ||
          provAnswer?.answer ||
          (typeof provAnswer === "string" && provAnswer),
      ) &&
      !viewedProviders.has(provider.id) &&
      !isSelected
    );
  });

  return (
    <div className="flex items-center justify-between gap-1.5 px-3.5 py-2 border-b border-slate-200/50 dark:border-white/[0.06] bg-slate-50/50 dark:bg-black/10 shrink-0">
      {/* Primary Model Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-1 py-0.5">
        {primaryProviderTabs.map((provider) => {
          const isSelected = hasAnyActivity && selectedProvider === provider.id;
          const provAnswer = answers[provider.id];
          const hasAnswer =
            Boolean(
              provAnswer?.content ||
                provAnswer?.answer ||
                (typeof provAnswer === "string" && provAnswer),
            ) &&
            !viewedProviders.has(provider.id) &&
            !isSelected;

          return (
            <button
              key={provider.id}
              onClick={() => hasAnyActivity && onSelectProvider(provider.id)}
              disabled={!hasAnyActivity}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shrink-0 focus:outline-none ${
                hasAnyActivity ? "cursor-pointer" : "opacity-50 cursor-default"
              } ${
                isSelected
                  ? "bg-blue-600 text-white border-blue-500 shadow-xs scale-100"
                  : contrastMode === "solid"
                    ? "bg-slate-200/80 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 border-slate-200 dark:border-white/[0.06]"
                    : "bg-white/40 dark:bg-white/[0.05] text-slate-800 dark:text-slate-200 hover:bg-white/60 dark:hover:bg-white/10 border-slate-200/40 dark:border-white/[0.06]"
              }`}
            >
              <ProviderIcon id={provider.id} className="w-3.5 h-3.5 shrink-0" size={14} />
              <span>{provider.name}</span>
              {hasAnswer && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-xs shadow-emerald-500/80"></span>
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Overflow Menu for additional active models */}
      {overflowProviderTabs.length > 0 && (
        <div className="relative shrink-0" ref={moreMenuRef}>
          <button
            onClick={() => hasAnyActivity && setIsMoreMenuOpen((prev) => !prev)}
            disabled={!hasAnyActivity}
            title="More AI Models"
            className={`relative p-2 rounded-xl transition-all border focus:outline-none ${
              hasAnyActivity ? "cursor-pointer" : "opacity-50 cursor-default"
            } ${
              isMoreMenuOpen
                ? "bg-blue-600 text-white border-blue-500 shadow-xs"
                : contrastMode === "solid"
                  ? "bg-slate-200/80 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 border-slate-200 dark:border-white/[0.06]"
                  : "bg-white/40 dark:bg-white/[0.05] text-slate-800 dark:text-slate-200 hover:bg-white/60 dark:hover:bg-white/10 border-slate-200/40 dark:border-white/[0.06]"
            }`}
          >
            <ThreeDotsIcon className="w-4 h-4" size={16} />
            {overflowHasAnswer && (
              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-white dark:border-[#181920]"></span>
              </span>
            )}
          </button>

          {isMoreMenuOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-44 rounded-xl bg-white dark:bg-[#1a1d26] border border-slate-200 dark:border-white/10 shadow-xl py-1 z-30 animate-fade-in">
              {overflowProviderTabs.map((provider) => {
                const isSelected = hasAnyActivity && selectedProvider === provider.id;
                const provAnswer = answers[provider.id];
                const hasAnswer =
                  Boolean(
                    provAnswer?.content ||
                      provAnswer?.answer ||
                      (typeof provAnswer === "string" && provAnswer),
                  ) &&
                  !viewedProviders.has(provider.id) &&
                  !isSelected;

                return (
                  <button
                    key={provider.id}
                    onClick={() => {
                      onSelectProvider(provider.id);
                      setIsMoreMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-left transition-colors focus:outline-none cursor-pointer ${
                      isSelected
                        ? "bg-blue-600/15 text-blue-600 dark:text-blue-400 font-bold"
                        : "text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <ProviderIcon id={provider.id} className="w-4 h-4 shrink-0" size={16} />
                      <span className="truncate">{provider.name}</span>
                    </div>
                    {hasAnswer && (
                      <span className="relative flex h-2 w-2 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-xs shadow-emerald-500/80"></span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

ChatModelTabs.propTypes = {
  primaryProviderTabs: PropTypes.array.isRequired,
  overflowProviderTabs: PropTypes.array.isRequired,
  selectedProvider: PropTypes.string,
  viewedProviders: PropTypes.object.isRequired,
  answers: PropTypes.object.isRequired,
  hasAnyActivity: PropTypes.bool.isRequired,
  contrastMode: PropTypes.string,
  isMoreMenuOpen: PropTypes.bool.isRequired,
  setIsMoreMenuOpen: PropTypes.func.isRequired,
  onSelectProvider: PropTypes.func.isRequired,
  moreMenuRef: PropTypes.object.isRequired,
};
