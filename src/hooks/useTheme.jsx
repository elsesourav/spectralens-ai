/* eslint-disable no-undef */
import { useEffect, useState, useMemo } from "react";
import { ThemeProviderContext } from "./ThemeContext.jsx";

const CONTROLS_KEY = "Ai-Display-Controls";

export function ThemeProvider({
   children,
   defaultTheme = "system",
   defaultContrast = "solid",
   storageKey = "app-theme",
   ...props
}) {
   const [theme, setThemeState] = useState(
      () => localStorage.getItem(storageKey) || defaultTheme
   );
   const [contrastMode, setContrastModeState] = useState(
      () => localStorage.getItem("app-contrast") || defaultContrast
   );

   // Sync from chrome storage on mount and live change
   useEffect(() => {
      if (typeof chrome !== "undefined" && chrome.storage?.local) {
         chrome.storage.local.get([CONTROLS_KEY]).then((res) => {
            if (res && res[CONTROLS_KEY]) {
               const controls =
                  typeof res[CONTROLS_KEY] === "string"
                     ? JSON.parse(res[CONTROLS_KEY])
                     : res[CONTROLS_KEY];
               if (controls?.chatbotTheme) {
                  setThemeState(controls.chatbotTheme);
               }
               if (controls?.contrastMode) {
                  setContrastModeState(controls.contrastMode);
               }
            }
         });

         const listener = (changes) => {
            if (changes[CONTROLS_KEY]) {
               const val = changes[CONTROLS_KEY].newValue;
               const controls =
                  typeof val === "string" ? JSON.parse(val) : val;
               if (controls?.chatbotTheme) {
                  setThemeState(controls.chatbotTheme);
               }
               if (controls?.contrastMode) {
                  setContrastModeState(controls.contrastMode);
               }
            }
         };
         chrome.storage.onChanged.addListener(listener);
         return () => chrome.storage.onChanged.removeListener(listener);
      }
   }, []);

   // System theme detection
   const [systemDark, setSystemDark] = useState(() => {
      if (typeof window !== "undefined" && window.matchMedia) {
         return window.matchMedia("(prefers-color-scheme: dark)").matches;
      }
      return true;
   });

   useEffect(() => {
      if (typeof window === "undefined" || !window.matchMedia) return;
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = (e) => setSystemDark(e.matches);
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
   }, []);

   const isDarkMode = useMemo(() => {
      if (theme === "dark") return true;
      if (theme === "light") return false;
      return systemDark;
   }, [theme, systemDark]);

   useEffect(() => {
      const root = window.document.documentElement;
      root.classList.remove("light", "dark");
      root.classList.add(isDarkMode ? "dark" : "light");
      root.setAttribute("data-theme", isDarkMode ? "dark" : "light");
      root.setAttribute("data-contrast", contrastMode);
   }, [isDarkMode, contrastMode]);

   const setTheme = (newTheme) => {
      localStorage.setItem(storageKey, newTheme);
      setThemeState(newTheme);

      if (typeof chrome !== "undefined" && chrome.storage?.local) {
         chrome.storage.local.get([CONTROLS_KEY]).then((res) => {
            const controls = res?.[CONTROLS_KEY]
               ? typeof res[CONTROLS_KEY] === "string"
                  ? JSON.parse(res[CONTROLS_KEY])
                  : res[CONTROLS_KEY]
               : {};
            controls.chatbotTheme = newTheme;
            chrome.storage.local.set({
               [CONTROLS_KEY]: controls,
            });
         });
      }
   };

   const setContrastMode = (newContrast) => {
      localStorage.setItem("app-contrast", newContrast);
      setContrastModeState(newContrast);

      if (typeof chrome !== "undefined" && chrome.storage?.local) {
         chrome.storage.local.get([CONTROLS_KEY]).then((res) => {
            const controls = res?.[CONTROLS_KEY]
               ? typeof res[CONTROLS_KEY] === "string"
                  ? JSON.parse(res[CONTROLS_KEY])
                  : res[CONTROLS_KEY]
               : {};
            controls.contrastMode = newContrast;
            chrome.storage.local.set({
               [CONTROLS_KEY]: controls,
            });
         });
      }
   };

   const value = {
      theme,
      isDarkMode,
      contrastMode,
      setTheme,
      setContrastMode,
   };

   return (
      <ThemeProviderContext.Provider {...props} value={value}>
         {children}
      </ThemeProviderContext.Provider>
   );
}
