import { IoSunny, IoMoon } from "react-icons/io5";
import { useTheme } from "../hooks/useThemeHook.jsx";
import { AppLogoIcon } from "./Icons.jsx";

export default function Header() {
   const { theme, setTheme } = useTheme();

   const isDarkMode =
      theme === "dark" ||
      (theme === "system" &&
         window.matchMedia("(prefers-color-scheme: dark)").matches);

   const toggleTheme = () => {
      setTheme(isDarkMode ? "light" : "dark");
   };

   return (
      <div>
         <header className="relative w-full">
            <div className="bg-gradient-to-r from-blue-800 to-indigo-900 rounded-md shadow w-full px-4">
               <div className="flex h-16 items-center justify-between">
                  <div className="size-10 flex items-center justify-center">
                     <AppLogoIcon className="w-10 h-10 rounded-xl shadow-md" size={40} />
                  </div>
                  <h1 className="bg-gradient-to-l from-purple-500 via-orange-400 to-pink-500 inline-block text-transparent bg-clip-text font-black text-2xl text-shadow-lg/10 text-shadow-black">
                     SpectraLens AI
                  </h1>
                  <button
                     onClick={toggleTheme}
                     className="size-10 rounded-xl grid place-items-center transition-all duration-300 dark:bg-black/40 dark:hover:bg-black/50 bg-black/20 hover:bg-black/30 cursor-pointer focus:outline-none"
                     title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                  >
                     {isDarkMode ? (
                        <IoSunny className="size-6 text-amber-400 hover:rotate-45 transition-transform duration-300" />
                     ) : (
                        <IoMoon className="size-6 text-blue-400 hover:rotate-12 transition-transform duration-300" />
                     )}
                  </button>
               </div>
            </div>
         </header>
      </div>
   );
}
