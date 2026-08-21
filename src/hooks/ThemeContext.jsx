import { createContext } from "react";

const initialState = {
   theme: "system",
   isDarkMode: true,
   contrastMode: "medium",
   contextKey: "menu",
   pageTheme: null,
   setTheme: () => null,
   setContrastMode: () => null,
};

export const ThemeProviderContext = createContext(initialState);
