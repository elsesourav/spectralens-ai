/* eslint-disable no-undef */
import { useEffect, useState, useMemo } from "react";
import { ThemeProviderContext } from "./ThemeContext.jsx";

const CONTROLS_KEY = "Ai-Display-Controls";

export function ThemeProvider({
   children,
   defaultTheme = "system",
   defaultContrast = "solid",
   storageKey = "app-theme",
   contextKey = "menu",
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
      console.log(`[useTheme] Initializing (${contextKey}), current theme:`, theme, "contrast:", contrastMode);
      if (typeof chrome !== "undefined" && chrome.storage?.local) {
         if (contextKey === "popup") {
            chrome.storage.local.get(["popupTheme"]).then((res) => {
               if (res?.popupTheme && res.popupTheme !== theme) {
                  console.log("[useTheme] Initial popupTheme from storage:", res.popupTheme);
                  setThemeState(res.popupTheme);
               }
            });

            const popupListener = (changes) => {
               if (changes.popupTheme) {
                  const val = changes.popupTheme.newValue;
                  if (val) {
                     setThemeState((prev) => (prev !== val ? val : prev));
                  }
               }
            };
            chrome.storage.onChanged.addListener(popupListener);
            return () => chrome.storage.onChanged.removeListener(popupListener);
         } else {
            chrome.storage.local.get([CONTROLS_KEY]).then((res) => {
               if (res && res[CONTROLS_KEY]) {
                  const controls =
                     typeof res[CONTROLS_KEY] === "string"
                        ? JSON.parse(res[CONTROLS_KEY])
                        : res[CONTROLS_KEY];
                  if (controls?.chatbotTheme && controls.chatbotTheme !== theme) {
                     console.log("[useTheme] Initial theme from storage:", controls.chatbotTheme);
                     setThemeState(controls.chatbotTheme);
                  }
                  if (controls?.contrastMode && controls.contrastMode !== contrastMode) {
                     console.log("[useTheme] Initial contrast from storage:", controls.contrastMode);
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
                     setThemeState((prev) => {
                        if (prev !== controls.chatbotTheme) {
                           console.log("[useTheme] Storage changed theme to:", controls.chatbotTheme);
                           return controls.chatbotTheme;
                        }
                        return prev;
                     });
                  }
                  if (controls?.contrastMode) {
                     setContrastModeState((prev) => {
                        if (prev !== controls.contrastMode) {
                           console.log("[useTheme] Storage changed contrast to:", controls.contrastMode);
                           return controls.contrastMode;
                        }
                        return prev;
                     });
                  }
               }
            };
            chrome.storage.onChanged.addListener(listener);
            return () => chrome.storage.onChanged.removeListener(listener);
         }
      }
   }, [contextKey]);

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
      const handler = (e) => {
         console.log("[useTheme] System color scheme changed, isDark:", e.matches);
         setSystemDark(e.matches);
      };
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
      const body = window.document.body;
      const themeClass = isDarkMode ? "dark" : "light";
      console.log("[useTheme] Applying classes to document elements:", { theme, isDarkMode, themeClass, contrastMode, contextKey });

      if (root) {
         root.classList.remove("light", "dark");
         root.classList.add(themeClass);
         root.setAttribute("data-theme", themeClass);
         root.setAttribute("data-contrast", contrastMode);
         root.style.colorScheme = "normal";
      }
      if (body) {
         body.classList.remove("light", "dark");
         body.classList.add(themeClass);
         body.setAttribute("data-theme", themeClass);
         body.setAttribute("data-contrast", contrastMode);
         body.style.colorScheme = "normal";
      }
   }, [isDarkMode, contrastMode, theme, contextKey]);

   const setTheme = (newTheme) => {
      console.log("[useTheme] setTheme requested:", newTheme, "in context:", contextKey);
      localStorage.setItem(storageKey, newTheme);
      setThemeState(newTheme);

      if (typeof chrome !== "undefined" && chrome.storage?.local) {
         if (contextKey === "popup") {
            chrome.storage.local.set({ popupTheme: newTheme });
         } else {
            chrome.storage.local.get([CONTROLS_KEY]).then((res) => {
               const controls = res?.[CONTROLS_KEY]
                  ? typeof res[CONTROLS_KEY] === "string"
                     ? JSON.parse(res[CONTROLS_KEY])
                     : res[CONTROLS_KEY]
                  : {};
               if (controls.chatbotTheme !== newTheme) {
                  controls.chatbotTheme = newTheme;
                  console.log("[useTheme] Writing updated theme to storage:", controls);
                  chrome.storage.local.set({
                     [CONTROLS_KEY]: controls,
                  });
               }
            });
         }
      }
   };

   const setContrastMode = (newContrast) => {
      console.log("[useTheme] setContrastMode requested:", newContrast);
      localStorage.setItem("app-contrast", newContrast);
      setContrastModeState(newContrast);

      if (typeof chrome !== "undefined" && chrome.storage?.local) {
         chrome.storage.local.get([CONTROLS_KEY]).then((res) => {
            const controls = res?.[CONTROLS_KEY]
               ? typeof res[CONTROLS_KEY] === "string"
                  ? JSON.parse(res[CONTROLS_KEY])
                  : res[CONTROLS_KEY]
               : {};
            if (controls.contrastMode !== newContrast) {
               controls.contrastMode = newContrast;
               console.log("[useTheme] Writing updated contrast to storage:", controls);
               chrome.storage.local.set({
                  [CONTROLS_KEY]: controls,
               });
            }
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
