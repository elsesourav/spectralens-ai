import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import ElementSelectorOverlay from "./ElementSelectorOverlay.jsx";
import "./selection.css";

export function App() {
   return (
      <StrictMode>
         <div className="w-full h-full bg-transparent">
            <ElementSelectorOverlay />
         </div>
      </StrictMode>
   );
}

createRoot(document.getElementById("root")).render(<App />);
