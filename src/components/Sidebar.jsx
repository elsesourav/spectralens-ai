import PropTypes from "prop-types";
import {
  ChatIcon,
  HistoryIcon,
  SettingsIcon,
} from "./Icons.jsx";
import { IoSunny, IoMoon } from "react-icons/io5";
import { useTheme } from "../hooks/useThemeHook.jsx";
import appIconUrl from "../assets/icons/icon.png";

export default function Sidebar({ activeTab, onSelectTab }) {
  const { isDarkMode, setTheme } = useTheme();

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
  ];

  const handleToggleTheme = () => {
    setTheme(isDarkMode ? "light" : "dark");
  };

  return (
    <aside className="w-[56px] h-full flex flex-col items-center justify-between py-3 bg-[#f1f5f9] dark:bg-[#14161e] border-r border-slate-200/80 dark:border-white/[0.07] shrink-0 select-none z-20">
      {/* Top App Logo & Navigation */}
      <div className="flex flex-col items-center gap-3.5 w-full">
        {/* App Logo */}
        <button
          onClick={() => onSelectTab("chat")}
          className="p-1 rounded-xl transition-transform hover:scale-105 active:scale-95 focus:outline-none cursor-pointer"
          title="SpectraLens AI"
        >
          <img
            src={appIconUrl}
            alt="SpectraLens AI"
            className="w-8 h-8 rounded-xl object-contain shadow-xs"
          />
        </button>

        {/* Navigation Tabs (Chat, History, Settings) */}
        <nav className="flex flex-col items-center gap-2 w-full px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                title={item.label}
                className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150 focus:outline-none cursor-pointer ${
                  isActive
                    ? "bg-blue-600/15 text-blue-600 dark:bg-[#232736] dark:text-blue-400 shadow-xs border border-blue-500/25"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/[0.06]"
                }`}
              >
                <Icon className="w-5 h-5" size={20} />

                {/* Left Active Pill Indicator */}
                {isActive && (
                  <span className="absolute left-[-8px] top-1/2 -translate-y-1/2 w-1 h-5 bg-blue-500 rounded-r-full" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Controls: Theme Toggle matching popup header theme changer */}
      <div className="flex flex-col items-center gap-2 w-full px-2">
        <button
          onClick={handleToggleTheme}
          className="size-9 rounded-xl grid place-items-center transition-all duration-300 dark:bg-black/40 dark:hover:bg-black/50 bg-black/10 hover:bg-black/20 cursor-pointer focus:outline-none"
          title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {isDarkMode ? (
            <IoSunny className="size-5 text-amber-400 hover:rotate-45 transition-transform duration-300" />
          ) : (
            <IoMoon className="size-5 text-blue-500 hover:rotate-12 transition-transform duration-300" />
          )}
        </button>
      </div>
    </aside>
  );
}

Sidebar.propTypes = {
  activeTab: PropTypes.string.isRequired,
  onSelectTab: PropTypes.func.isRequired,
};
