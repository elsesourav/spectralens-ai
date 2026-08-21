import { SystemThemeIcon, DarkThemeIcon, LightThemeIcon } from "./Icons.jsx";
import { useTheme } from "../hooks/useThemeHook.jsx";
import appIconUrl from "../assets/icons/128.png";

export default function Header() {
   const { theme, setTheme } = useTheme();

   const toggleTheme = () => {
      let next = "dark";
      if (theme === "system") {
         next = "dark";
      } else if (theme === "dark") {
         next = "light";
      } else {
         next = "system";
      }
      setTheme(next);
   };

   return (
      <div>
         <header className="relative w-full">
            <div className="animated-header bg-gradient-to-r from-blue-800 to-indigo-900 rounded-md shadow w-full px-3.5">
               <div className="flex h-13 items-center justify-between">
                  <div className="size-9 flex items-center justify-center">
                     <img
                        src={appIconUrl}
                        alt="SpectraLens AI"
                        className="size-9 object-contain rounded-lg drop-shadow-md"
                     />
                  </div>
                  <h1 className="bg-gradient-to-l from-purple-500 via-orange-400 to-pink-500 inline-block text-transparent bg-clip-text font-black text-xl text-shadow-lg/10 text-shadow-black">
                     SpectraLens AI
                  </h1>
                  <button
                     onClick={toggleTheme}
                     className="size-9 rounded-xl grid place-items-center transition-all duration-300 dark:bg-black/40 dark:hover:bg-black/50 bg-black/20 hover:bg-black/30 cursor-pointer focus:outline-none"
                     title={
                        theme === "system"
                           ? "Theme: System (Click for Dark Mode)"
                           : theme === "dark"
                              ? "Theme: Dark (Click for Light Mode)"
                              : "Theme: Light (Click for System Mode)"
                     }
                  >
                     {theme === "system" ? (
                        <SystemThemeIcon className="size-5 text-slate-200 hover:scale-110 transition-transform duration-300" />
                     ) : theme === "dark" ? (
                        <DarkThemeIcon className="size-5 text-slate-200 hover:scale-110 transition-transform duration-300" />
                     ) : (
                        <LightThemeIcon className="size-5 text-slate-200 hover:scale-110 transition-transform duration-300" />
                     )}
                  </button>
               </div>
            </div>
         </header>
      </div>
   );
}
