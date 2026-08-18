import PropTypes from "prop-types";

export default function ChatContextMentions({
  showMentionMenu,
  filteredMentionOptions,
  mentionSelectedIndex,
  mentionMenuRef,
  onSelectMention,
}) {
  if (!showMentionMenu || filteredMentionOptions.length === 0) {
    return null;
  }

  return (
    <div
      ref={mentionMenuRef}
      className="absolute bottom-full left-3 right-3 mb-2 bg-white/95 dark:bg-[#181b24]/95 backdrop-blur-xl border border-slate-200/90 dark:border-white/[0.12] rounded-2xl shadow-xl overflow-hidden z-50 p-1.5 animate-in slide-in-from-bottom-2 duration-150"
    >
      <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        Attach Context
      </div>
      <div className="flex flex-col gap-0.5">
        {filteredMentionOptions.map((option, index) => {
          const Icon = option.IconComponent;
          return (
            <button
              key={option.id}
              onClick={() => onSelectMention(option)}
              className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-left transition-all cursor-pointer ${
                index === mentionSelectedIndex
                  ? "bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 font-medium"
                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06]"
              }`}
            >
              <div className="w-6 h-6 rounded-lg bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                {Icon ? (
                  <Icon className="w-3.5 h-3.5" />
                ) : (
                  <span className="text-xs">{option.icon}</span>
                )}
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold">{option.cmd}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-200/60 dark:bg-white/10 text-slate-600 dark:text-slate-300 font-medium">
                    {option.badge}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                  {option.desc}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

ChatContextMentions.propTypes = {
  showMentionMenu: PropTypes.bool.isRequired,
  filteredMentionOptions: PropTypes.array.isRequired,
  mentionSelectedIndex: PropTypes.number.isRequired,
  mentionMenuRef: PropTypes.object.isRequired,
  onSelectMention: PropTypes.func.isRequired,
};
