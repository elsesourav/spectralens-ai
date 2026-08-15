import { useEffect } from "react";
import PropTypes from "prop-types";
import { IoInformationCircleOutline } from "react-icons/io5";

export default function Toast({ message, isVisible, onClose, duration = 2500 }) {
  useEffect(() => {
    if (!isVisible) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [isVisible, duration, onClose]);

  if (!isVisible && !message) return null;

  return (
    <div
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 pointer-events-none ${
        isVisible
          ? "opacity-100 translate-y-0 scale-100"
          : "opacity-0 translate-y-3 scale-95"
      }`}
    >
      <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/90 dark:bg-[#12141c]/95 text-white backdrop-blur-md border border-white/15 shadow-2xl text-xs font-semibold select-none">
        <IoInformationCircleOutline className="w-4 h-4 text-blue-400 shrink-0" />
        <span>{message}</span>
      </div>
    </div>
  );
}

Toast.propTypes = {
  message: PropTypes.string,
  isVisible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  duration: PropTypes.number,
};
