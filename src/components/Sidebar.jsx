import PropTypes from "prop-types";
import {
  ChatIcon,
  HistoryIcon,
  SettingsIcon,
} from "./Icons.jsx";
import { IoSunny, IoMoon, IoAdd } from "react-icons/io5";
import { useTheme } from "../hooks/useThemeHook.jsx";

export default function Sidebar({ activeTab, onSelectTab, onNewChat }) {
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

  const handleNewChatClick = () => {
    if (onNewChat) {
      onNewChat();
    }
    onSelectTab("chat");
  };

  const activeIndex = navItems.findIndex((item) => item.id === activeTab);

  return (
    <aside className="w-[46px] h-full flex flex-col items-center justify-between py-2.5 bg-[#f1f5f9] dark:bg-[#14161e] border-r border-slate-200/80 dark:border-white/[0.07] shrink-0 select-none z-20">
      {/* Top Navigation */}
      <div className="flex flex-col items-center gap-2 w-full">
        {/* New Chat Button (Very First in Left Panel) */}
        <div className="px-1.5 w-full flex justify-center">
          <button
            onClick={handleNewChatClick}
            title="New Chat"
            className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white shadow-sm hover:scale-105 active:scale-95 transition-all duration-150 focus:outline-none cursor-pointer"
          >
            <IoAdd className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="w-5 h-[1px] bg-slate-200 dark:bg-white/10 my-0.5" />

        <nav className="relative flex flex-col w-full">
          {/* Animated Sliding Active Background with Carved Inverted Corners */}
          {activeIndex >= 0 && (
            <div
              className="absolute top-0 right-0 w-full h-10 bg-[#f8fafc] dark:bg-[#0e1015] rounded-l-2xl z-0 transition-transform duration-200 ease-out pointer-events-none before:content-[''] before:absolute before:-top-3 before:right-0 before:w-3 before:h-3 before:bg-transparent before:rounded-br-xl before:shadow-[3px_3px_0_0_#f8fafc] dark:before:shadow-[3px_3px_0_0_#0e1015] after:content-[''] after:absolute after:-bottom-3 after:right-0 after:w-3 after:h-3 after:bg-transparent after:rounded-tr-xl after:shadow-[3px_-3px_0_0_#f8fafc] dark:after:shadow-[3px_-3px_0_0_#0e1015]"
              style={{
                transform: `translateY(${activeIndex * 44}px)`,
              }}
            />
          )}

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <div
                key={item.id}
                className="relative w-full h-10 my-[2px] flex items-center justify-center z-10"
              >
                <button
                  onClick={() => onSelectTab(item.id)}
                  title={item.label}
                  className={`w-full h-full flex items-center justify-center transition-colors duration-150 focus:outline-none cursor-pointer ${
                    isActive
                      ? "text-blue-600 dark:text-blue-400 font-semibold"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                  }`}
                >
                  <Icon className="w-4 h-4" size={18} />
                </button>
              </div>
            );
          })}
        </nav>
      </div>

      {/* Bottom Controls: Theme Toggle */}
      <div className="flex flex-col items-center w-full px-1.5">
        <button
          onClick={handleToggleTheme}
          className="size-8 rounded-lg grid place-items-center transition-all duration-300 dark:bg-black/40 dark:hover:bg-black/50 bg-black/10 hover:bg-black/20 cursor-pointer focus:outline-none"
          title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {isDarkMode ? (
            <IoSunny className="size-4 text-amber-400 hover:rotate-45 transition-transform duration-300" />
          ) : (
            <IoMoon className="size-4 text-blue-500 hover:rotate-12 transition-transform duration-300" />
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
