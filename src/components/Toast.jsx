import { useEffect } from "react";
import PropTypes from "prop-types";
import {
  IoInformationCircleOutline,
  IoCheckmarkCircleOutline,
  IoAlertCircleOutline,
} from "react-icons/io5";
import { useTheme } from "../hooks/useThemeHook.jsx";

export default function Toast({
  message,
  isVisible,
  onClose,
  type = "info",
  duration = 2600,
}) {
  const { isDarkMode, contrastMode } = useTheme();

  useEffect(() => {
    if (!isVisible) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [isVisible, duration, onClose]);

  if (!isVisible && !message) return null;

  // Background and border styling based on active theme & contrast mode
  const themeContainerClass =
    contrastMode === "solid"
      ? isDarkMode
        ? "bg-[#181924] border-white/15 text-white shadow-2xl"
        : "bg-white border-slate-200/90 text-slate-900 shadow-2xl"
      : contrastMode === "medium"
        ? isDarkMode
          ? "bg-[#181924]/90 backdrop-blur-md border-white/15 text-white shadow-2xl"
          : "bg-white/90 backdrop-blur-md border-slate-200/80 text-slate-900 shadow-2xl"
        : isDarkMode
          ? "bg-[#14151e]/85 backdrop-blur-lg border-white/20 text-white shadow-2xl"
          : "bg-white/85 backdrop-blur-lg border-slate-300/80 text-slate-900 shadow-2xl";

  const getIcon = () => {
    if (type === "success") {
      return (
        <IoCheckmarkCircleOutline className="w-4 h-4 text-emerald-500 shrink-0" />
      );
    }
    if (type === "warning") {
      return (
        <IoAlertCircleOutline className="w-4 h-4 text-amber-500 shrink-0" />
      );
    }
    return (
      <IoInformationCircleOutline className="w-4 h-4 text-blue-500 dark:text-blue-400 shrink-0" />
    );
  };

  return (
    <div
      className={`fixed bottom-5 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 pointer-events-none ${
        isVisible
          ? "opacity-100 translate-y-0 scale-100 filter drop-shadow-xl"
          : "opacity-0 translate-y-4 scale-95 pointer-events-none"
      }`}
      style={{
        transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <div
        className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border ${themeContainerClass} text-xs font-semibold select-none transition-all duration-200`}
      >
        <div className="p-1 rounded-lg bg-blue-500/10 dark:bg-blue-400/15 shrink-0 flex items-center justify-center">
          {getIcon()}
        </div>
        <span className="leading-tight tracking-tight">{message}</span>
      </div>
    </div>
  );
}

Toast.propTypes = {
  message: PropTypes.string,
  isVisible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  type: PropTypes.oneOf(["info", "success", "warning"]),
  duration: PropTypes.number,
};
