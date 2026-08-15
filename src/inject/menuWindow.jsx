import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Menu from "./Menu.jsx";
import { ThemeProvider } from "../hooks/useTheme.jsx";
import "./menuWindow.css";

export function App() {
   return (
      <StrictMode>
         <ThemeProvider defaultTheme="system" storageKey="app-theme">
            <Menu />
         </ThemeProvider>
      </StrictMode>
   );
}

createRoot(document.getElementById("root")).render(<App />);
