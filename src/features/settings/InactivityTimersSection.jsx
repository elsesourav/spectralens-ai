import PropTypes from "prop-types";

export default function InactivityTimersSection({
  autoMinimizeDelay,
  autoHideDelay,
  cardBg,
  onUpdateMinimizeDelay,
  onUpdateHideDelay,
}) {
  const minimizeOptions = [
    { label: "Never", val: 0 },
    { label: "20s", val: 20 },
    { label: "30s", val: 30 },
    { label: "60s", val: 60 },
    { label: "90s", val: 90 },
  ];

  const hideOptions = [
    { label: "Never", val: 0 },
    { label: "5s", val: 5 },
    { label: "10s", val: 10 },
    { label: "30s", val: 30 },
    { label: "60s", val: 60 },
  ];

  return (
    <>
      {/* Auto-Minimize Timer */}
      <section className={`p-3.5 rounded-2xl border shadow-xs space-y-2.5 ${cardBg}`}>
        <div>
          <h4 className="text-xs font-bold text-slate-900 dark:text-white">
            Auto-Minimize Chat Window
          </h4>
          <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
            Inactivity timer to collapse open window to pill
          </p>
        </div>
        <div className="grid grid-cols-5 gap-1.5 pt-0.5">
          {minimizeOptions.map((opt) => (
            <button
              key={opt.val}
              onClick={() => onUpdateMinimizeDelay(opt.val)}
              className={`py-1.5 px-1 rounded-lg text-xs font-bold text-center transition-all focus:outline-none cursor-pointer ${
                autoMinimizeDelay === opt.val
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-slate-100/90 dark:bg-white/[0.05] text-slate-700 dark:text-slate-300 hover:bg-slate-200/90 dark:hover:bg-white/10 border border-slate-200/60 dark:border-white/[0.06]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      {/* Auto-Invisible Widget Timer */}
      <section className={`p-3.5 rounded-2xl border shadow-xs space-y-2.5 ${cardBg}`}>
        <div>
          <h4 className="text-xs font-bold text-slate-900 dark:text-white">
            Auto-Invisible Minimized Widget
          </h4>
          <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
            Inactivity timer to make pill invisible (applies after minimize)
          </p>
        </div>
        <div className="grid grid-cols-5 gap-1.5 pt-0.5">
          {hideOptions.map((opt) => (
            <button
              key={opt.val}
              onClick={() => onUpdateHideDelay(opt.val)}
              className={`py-1.5 px-1 rounded-lg text-xs font-bold text-center transition-all focus:outline-none cursor-pointer ${
                autoHideDelay === opt.val
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-slate-100/90 dark:bg-white/[0.05] text-slate-700 dark:text-slate-300 hover:bg-slate-200/90 dark:hover:bg-white/10 border border-slate-200/60 dark:border-white/[0.06]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>
    </>
  );
}

InactivityTimersSection.propTypes = {
  autoMinimizeDelay: PropTypes.number.isRequired,
  autoHideDelay: PropTypes.number.isRequired,
  cardBg: PropTypes.string.isRequired,
  onUpdateMinimizeDelay: PropTypes.func.isRequired,
  onUpdateHideDelay: PropTypes.func.isRequired,
};
