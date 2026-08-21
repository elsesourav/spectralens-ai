import PropTypes from "prop-types";
import { IoAdd } from "react-icons/io5";
import { useTheme } from "../hooks/useThemeHook.jsx";
import {
  ChatIcon,
  HistoryIcon,
  SettingsIcon,
  HelpIcon,
  SystemThemeIcon,
  DarkThemeIcon,
  LightThemeIcon,
} from "./Icons.jsx";

export default function Sidebar({ activeTab, onSelectTab, onNewChat }) {
  const { theme, setTheme, contrastMode } = useTheme();

  const navItems = [
    {
      id: "chat",
      label: "Chat",
      icon: ChatIcon,
    },
    {
      id: "history",
      label: "History",
      icon: HistoryIcon,
    },
    {
      id: "settings",
      label: "Settings",
      icon: SettingsIcon,
    },
    {
      id: "guide",
      label: "Guide & Help",
      icon: HelpIcon,
    },
  ];

  const handleToggleTheme = () => {
    // 3 states: system -> dark -> light -> system
    let next = "dark";
    if (theme === "system") {
      next = "dark";
    } else if (theme === "dark") {
      next = "light";
    } else {
      next = "system";
    }
    console.log("[Sidebar] handleToggleTheme clicked -> switching to:", next);
    setTheme(next);
  };

  const handleNewChatClick = () => {
    if (onNewChat) {
      onNewChat();
    }
    onSelectTab("chat");
  };

  const sidebarBgClass =
    contrastMode === "solid"
      ? "bg-slate-100 dark:bg-[#14161e] border-r border-slate-200/90 dark:border-white/[0.08]"
      : "bg-transparent border-r border-slate-200/50 dark:border-white/[0.06]";

  return (
    <aside
      className={`w-[48px] h-full flex flex-col items-center justify-between py-3 shrink-0 select-none z-20 ${sidebarBgClass}`}
    >
      {/* Top Navigation */}
      <div className="flex flex-col items-center gap-2 w-full px-1">
        {/* New Chat Button */}
        <button
          onClick={handleNewChatClick}
          title="New Chat"
          className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-white hover:bg-slate-200/80 dark:hover:bg-white/10 transition-all duration-150 focus:outline-none cursor-pointer"
        >
          <IoAdd className="w-5 h-5" />
        </button>

        <div className="w-6 h-[1px] bg-slate-200/80 dark:bg-white/10 my-0.5" />

        <nav className="flex flex-col items-center gap-2 w-full">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                title={item.label}
                className={`relative w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-150 focus:outline-none cursor-pointer ${
                  isActive
                    ? "bg-blue-600/15 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 shadow-xs border border-blue-500/30 font-semibold"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-white/10"
                }`}
              >
                <Icon className="w-4.5 h-4.5" size={19} />

                {/* Right-Side Active Color Indicator */}
                {isActive && (
                  <span className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-500 rounded-l-full shadow-xs" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Controls: Theme Toggle */}
      <div className="flex flex-col items-center w-full px-1">
        <button
          onClick={handleToggleTheme}
          className="size-9 rounded-xl grid place-items-center transition-all duration-300 bg-slate-200/80 dark:bg-white/10 hover:bg-slate-300/90 dark:hover:bg-white/15 cursor-pointer focus:outline-none"
          title={
            theme === "system"
              ? "Theme: Page / Tab Theme (Click for Dark Mode)"
              : theme === "dark"
                ? "Theme: Dark (Click for Light Mode)"
                : "Theme: Light (Click for Page / Tab Mode)"
          }
        >
          {theme === "system" ? (
            <SystemThemeIcon className="size-7 text-slate-700 dark:text-slate-200 hover:scale-110 transition-transform duration-300" />
          ) : theme === "dark" ? (
            <DarkThemeIcon className="size-7 text-slate-700 dark:text-slate-200 hover:scale-110 transition-transform duration-300" />
          ) : (
            <LightThemeIcon className="size-7 text-slate-700 dark:text-slate-200 hover:scale-110 transition-transform duration-300" />
          )}
        </button>
      </div>
    </aside>
  );
}

Sidebar.propTypes = {
  activeTab: PropTypes.string.isRequired,
  onSelectTab: PropTypes.func.isRequired,
  onNewChat: PropTypes.func,
};
