import { useCallback, useEffect, useRef, useState } from "react";
import { FaCheck } from "react-icons/fa";
import { ImCross } from "react-icons/im";
import ElementSelector from "../components/ElementSelector";

export default function Select() {
   const selectorRef = useRef(null);
   const containerRef = useRef(null);
   const [isSelecting, setIsSelecting] = useState(false);

   const handleCancel = useCallback(() => {
      window.parent.postMessage({ type: "IF_C_SELECT_CANCEL" }, "*");
   }, []);

   const handleCapture = useCallback(() => {
      if (!selectorRef.current) {
         handleCancel();
         return;
      }

      const coordinates = selectorRef.current.getCoordinates();
      if (!coordinates || (coordinates.width <= 5 && coordinates.height <= 5)) {
         handleCancel();
         return;
      }

      window.parent.postMessage(
         { type: "IF_C_SELECT_COORDS", data: { coordinates } },
         "*"
      );
   }, [handleCancel]);

   const handleSelectionComplete = useCallback(() => {
      setTimeout(() => {
         if (selectorRef.current) {
            const is = selectorRef.current.hasActiveSelection();
            setIsSelecting(is);
         }
      }, 0);
   }, []);

   useEffect(() => {
      const handleKeyUp = (e) => {
         if (e.key === "Escape") handleCancel();
         if (e.key === "Enter") handleCapture();
      };

      document.addEventListener("keyup", handleKeyUp);

      if (containerRef.current) {
         containerRef.current.focus();
      }

      return () => {
         document.removeEventListener("keyup", handleKeyUp);
      };
   }, [handleCancel, handleCapture]);

   return (
      <>
         <ElementSelector
            ref={selectorRef}
            className="relative z-1 w-[100svw] h-[100svh] cursor-pointer"
            onSelectionChange={() => {
               if (selectorRef.current) {
                  const hasSelection = selectorRef.current.hasActiveSelection();
                  setIsSelecting(hasSelection);
               }
            }}
            onSelectionComplete={handleSelectionComplete}
            minSelectionSize={5}
         ></ElementSelector>

         <div className="absolute z-2 bottom-2 right-2 gap-2 flex">
            <button
               className={`group inline-flex items-center justify-center rounded-lg border border-green-600 bg-green-600 w-14 h-10 text-white hover:bg-transparent hover:text-green-600 focus:ring-3 focus:outline-hidden cursor-pointer transition-all duration-200 ${
                  isSelecting
                     ? "opacity-100 pointer-events-auto"
                     : "opacity-0 pointer-events-none"
               }`}
               onClick={handleCapture}
            >
               <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  className="absolute size-10 opacity-100 fill-white group-hover:opacity-0 transition-all duration-200"
               >
                  <path d="M19,6a1,1,0,0,0-1,1v4a1,1,0,0,1-1,1H7.41l1.3-1.29A1,1,0,0,0,7.29,9.29l-3,3a1,1,0,0,0-.21.33,1,1,0,0,0,0,.76,1,1,0,0,0,.21.33l3,3a1,1,0,0,0,1.42,0,1,1,0,0,0,0-1.42L7.41,14H17a3,3,0,0,0,3-3V7A1,1,0,0,0,19,6Z" />
               </svg>
               <FaCheck className="absolute size-6 opacity-0 group-hover:opacity-100 transition-all duration-200" />
            </button>
            <button
               className="group inline-flex items-center justify-center rounded-lg border border-red-600 bg-red-600 w-14 h-10 text-white hover:bg-transparent hover:text-red-600 focus:ring-3 focus:outline-hidden cursor-pointer transition-all duration-200"
               onClick={handleCancel}
            >
               <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 15 15"
                  className="absolute size-10 opacity-100 fill-white group-hover:opacity-0 transition-all duration-200"
               >
                  <path
                     className="fill-amber-50"
                     clipRule="evenodd"
                     d="m2 5.5c0-.27614.22386-.5.5-.5h2c.27614 0 .5.22386.5.5s-.22386.5-.5.5h-1.5v1h.5c.27614 0 .5.22386.5.5s-.22386.5-.5.5h-.5v1h1.5c.27614 0 .5.22386.5.5s-.22386.5-.5.5h-2c-.27614 0-.5-.22386-.5-.5zm4 0c0-.27614.22386-.5.5-.5h2c.27614 0 .5.22386.5.5s-.22386.5-.5.5h-1.5v1h1.5c.27614 0 .5.22386.5.5v2c0 .27614-.22386.5-.5.5h-2c-.27614 0-.5-.22386-.5-.5s.22386-.5.5-.5h1.5v-1h-1.5c-.27614 0-.5-.22386-.5-.5zm4 0c0-.27614.2239-.5.5-.5h2c.2761 0 .5.22386.5.5s-.2239.5-.5.5h-1.5v3h1.5c.2761 0 .5.22386.5.5s-.2239.5-.5.5h-2c-.2761 0-.5-.22386-.5-.5z"
                     fillRule="evenodd"
                  />
               </svg>
               <ImCross className="absolute size-5 opacity-0 group-hover:opacity-100 transition-all duration-200" />
            </button>
         </div>
      </>
   );
}
