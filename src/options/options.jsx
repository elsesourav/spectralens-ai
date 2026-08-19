import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "../hooks/useTheme.jsx";
import OptionsApp from "./OptionsApp.jsx";
import "../popup/index.css";

createRoot(document.getElementById("root")).render(
   <StrictMode>
      <ThemeProvider defaultTheme="system" defaultContrast="medium" storageKey="app-theme">
         <OptionsApp />
      </ThemeProvider>
   </StrictMode>
);
