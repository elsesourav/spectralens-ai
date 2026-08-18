import PropTypes from "prop-types";
import { FiX } from "react-icons/fi";

export default function WindowHeader({
  headerRef,
  appIconUrl,
  activeTab,
  isAlwaysActive,
  onToggleChat,
}) {
  return (
    <header
      ref={headerRef}
      className="relative flex items-center justify-between px-3.5 py-2.5 border-b border-slate-200/50 dark:border-white/[0.06] shrink-0 z-10 select-none cursor-grab active:cursor-grabbing"
      title="Drag to reposition window"
    >
      {/* Brand Identity & Status */}
      <div className="flex items-center gap-2 pointer-events-none">
        <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-blue-600/20 to-purple-600/20 border border-blue-500/30 flex items-center justify-center shadow-xs relative">
          <img
            src={appIconUrl}
            alt="Logo"
            className="size-5 object-contain pointer-events-none"
          />
          {isAlwaysActive && (
            <span
              className="absolute -bottom-0.5 -right-0.5 size-2 bg-emerald-500 rounded-full ring-1.5 ring-white dark:ring-[#14161e] shadow-xs"
              title="Always Active Tab: Active on this page"
            />
          )}
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-bold tracking-tight text-slate-900 dark:text-white leading-none">
            SpectraLens AI
          </span>
          <span className="text-[10px] font-medium text-slate-600 dark:text-slate-300 capitalize leading-tight mt-0.5">
            {activeTab}
          </span>
        </div>
      </div>

      {/* Header Actions: Minimize */}
      <div className="flex items-center">
        <button
          onClick={onToggleChat}
          title="Minimize window"
          className="p-1 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors focus:outline-none cursor-pointer"
        >
          <FiX className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}

WindowHeader.propTypes = {
  headerRef: PropTypes.object.isRequired,
  appIconUrl: PropTypes.string.isRequired,
  activeTab: PropTypes.string.isRequired,
  isAlwaysActive: PropTypes.bool.isRequired,
  onToggleChat: PropTypes.func.isRequired,
};
