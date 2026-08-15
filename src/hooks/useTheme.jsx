/* eslint-disable no-undef */
import { useEffect, useMemo, useState } from "react";
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
    () => localStorage.getItem(storageKey) || defaultTheme,
  );
  const [contrastMode, setContrastModeState] = useState(
    () => localStorage.getItem("app-contrast") || defaultContrast,
  );

  // Sync from chrome storage on mount and live change
  useEffect(() => {
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      if (contextKey === "popup") {
        chrome.storage.local.get(["popupTheme"]).then((res) => {
          if (res?.popupTheme && res.popupTheme !== theme) {
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
              setThemeState(controls.chatbotTheme);
            }
            if (
              controls?.contrastMode &&
              controls.contrastMode !== contrastMode
            ) {
              setContrastModeState(controls.contrastMode);
            }
          }
        });

        const listener = (changes) => {
          if (changes[CONTROLS_KEY]) {
            const val = changes[CONTROLS_KEY].newValue;
            const controls = typeof val === "string" ? JSON.parse(val) : val;
            if (controls?.chatbotTheme) {
              setThemeState((prev) => {
                if (prev !== controls.chatbotTheme) {
                  return controls.chatbotTheme;
                }
                return prev;
              });
            }
            if (controls?.contrastMode) {
              setContrastModeState((prev) => {
                if (prev !== controls.contrastMode) {
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

  // System / Page theme detection
  const [systemDark, setSystemDark] = useState(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return true;
  });

  // Page theme detected from host webpage (when inside in-page menu iframe)
  const [pageTheme, setPageTheme] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const pTheme = urlParams.get("pageTheme");
        if (pTheme) return pTheme;
      } catch {
        // ignore
      }
      return document.documentElement.getAttribute("data-page-theme") || null;
    }
    return null;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e) => {
      setSystemDark(e.matches);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (contextKey !== "menu") return;

    const handleMessage = (event) => {
      const pTheme =
        event?.data?.pageTheme ||
        event?.data?.data?.pageTheme ||
        (event?.data?.type === "IF_C_GET_CURRENT_CONTROLS" &&
          event?.data?.data?.pageTheme);
      if (pTheme) {
        setPageTheme(pTheme);
      }
    };

    window.addEventListener("message", handleMessage);

    // Request initial controls & page theme from content script
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: "IF_C_GET_CURRENT_CONTROLS" }, "*");
    }

    return () => window.removeEventListener("message", handleMessage);
  }, [contextKey]);

  const isDarkMode = useMemo(() => {
    if (theme === "dark") return true;
    if (theme === "light") return false;
    // When theme === "system" inside in-page menu, use host webpage theme:
    if (contextKey === "menu" && pageTheme) {
      return pageTheme === "dark";
    }
    return systemDark;
  }, [theme, contextKey, pageTheme, systemDark]);

  useEffect(() => {
    const root = window.document.documentElement;
    const body = window.document.body;
    const themeClass = isDarkMode ? "dark" : "light";

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
            chrome.storage.local.set({
              [CONTROLS_KEY]: controls,
            });
          }
        });
      }
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
        if (controls.contrastMode !== newContrast) {
          controls.contrastMode = newContrast;
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
