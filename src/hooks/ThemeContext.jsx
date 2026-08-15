import { createContext } from "react";

const initialState = {
   theme: "system",
   isDarkMode: true,
   contrastMode: "solid",
   setTheme: () => null,
   setContrastMode: () => null,
};

export const ThemeProviderContext = createContext(initialState);
