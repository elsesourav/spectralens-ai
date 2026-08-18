import PropTypes from "prop-types";
import { ChatIcon, DragHandleIcon } from "../../components/Icons.jsx";

export default function FloatingPillLauncher({
  appIconUrl,
  isChatOpen,
  dragRef,
  isDraggingWidget,
  dragHover,
  setDragHover,
  chatHover,
  setChatHover,
  onDismissOnboarding,
  onToggleChat,
}) {
  return (
    <div
      className={`relative w-full h-full px-2.5 py-1.5 items-center justify-between select-none overflow-visible rounded-[24px] ${
        isChatOpen ? "hidden" : "flex"
      }`}
    >
      {/* Right-Side Soft Accent Ambient Tone */}
      <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-gradient-to-r from-transparent via-[#8b5cf6]/10 dark:via-[#8b5cf6]/15 to-[#3b82f6]/15 dark:to-[#3b82f6]/20 rounded-r-[24px] pointer-events-none" />

      {/* Brand Icon */}
      <div
        className="flex items-center justify-center shrink-0 select-none pointer-events-none"
        title="SpectraLens AI"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500/20 via-indigo-500/20 to-purple-500/20 ring-1.5 ring-blue-400/40 dark:ring-blue-400/50 flex items-center justify-center shadow-xs">
          <img
            src={appIconUrl}
            alt="SpectraLens AI"
            className="w-5 h-5 rounded-md object-contain pointer-events-none"
          />
        </div>
      </div>

      {/* Subtle Vertical Divider 1 */}
      <div className="w-[1px] h-4 bg-slate-300/40 dark:bg-white/10 shrink-0 pointer-events-none" />

      {/* Center 6-Dot Drag Handle */}
      <div className="relative flex items-center justify-center">
        <div
          ref={dragRef}
          onMouseEnter={() => setDragHover(true)}
          onMouseLeave={() => setDragHover(false)}
          onPointerDown={onDismissOnboarding}
          role="button"
          tabIndex={-1}
          title="Drag to move"
          aria-label="Drag SpectraLens AI widget"
          className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-150 select-none ${
            isDraggingWidget
              ? "cursor-grabbing bg-emerald-500/25 ring-1 ring-emerald-500/60 text-emerald-400 scale-95"
              : dragHover
                ? "cursor-grab bg-emerald-500/10 dark:bg-emerald-500/15 ring-1 ring-emerald-500/30 text-emerald-500 dark:text-emerald-400 shadow-xs"
                : "cursor-grab text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <DragHandleIcon className="w-4 h-4 transition-colors" size={16} />
        </div>
      </div>

      {/* Subtle Vertical Divider 2 */}
      <div className="w-[1px] h-4 bg-slate-300/40 dark:bg-white/10 shrink-0 pointer-events-none" />

      {/* Chat Launcher Button */}
      <div className="relative flex items-center justify-center">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDismissOnboarding();
            onToggleChat();
          }}
          onMouseEnter={() => setChatHover(true)}
          onMouseLeave={() => setChatHover(false)}
          title="Open SpectraLens AI"
          aria-label="Open SpectraLens AI"
          className={`w-8 h-8 rounded-full flex items-center justify-center p-1 border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-purple-400/70 cursor-pointer ${
            chatHover
              ? "bg-gradient-to-tr from-purple-600/30 to-blue-600/30 border-purple-400/60 ring-2 ring-purple-400/40 text-white scale-[1.03] shadow-md shadow-purple-500/20"
              : "bg-white/40 dark:bg-white/10 border-slate-300/80 dark:border-white/20 text-slate-800 dark:text-white active:scale-[0.97]"
          }`}
        >
          <ChatIcon className="w-4 h-4 text-slate-800 dark:text-white" size={16} />
        </button>
      </div>
    </div>
  );
}

FloatingPillLauncher.propTypes = {
  appIconUrl: PropTypes.string.isRequired,
  isChatOpen: PropTypes.bool.isRequired,
  dragRef: PropTypes.object.isRequired,
  isDraggingWidget: PropTypes.bool.isRequired,
  dragHover: PropTypes.bool.isRequired,
  setDragHover: PropTypes.func.isRequired,
  chatHover: PropTypes.bool.isRequired,
  setChatHover: PropTypes.func.isRequired,
  onDismissOnboarding: PropTypes.func.isRequired,
  onToggleChat: PropTypes.func.isRequired,
};
