import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import AssistantWidget from "./AssistantWidget.jsx";
import { ThemeProvider } from "../hooks/useTheme.jsx";
import "./widgetWindow.css";

export function App() {
   return (
      <StrictMode>
         <ThemeProvider defaultTheme="system" storageKey="app-theme" contextKey="menu">
            <AssistantWidget />
         </ThemeProvider>
      </StrictMode>
   );
}

createRoot(document.getElementById("root")).render(<App />);
