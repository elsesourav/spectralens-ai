import { useEffect, useState } from "react";
import extensionUtils from "../utils/utilsModule.js";

export default function OptionsApp() {
   const [devMode, setDevMode] = useState(false);
   const [globalCopy, setGlobalCopy] = useState(false);
   const [copyHosts, setCopyHosts] = useState([]);
   const [isLoading, setIsLoading] = useState(true);

   useEffect(() => {
      extensionUtils.chromeStorageGetLocal(
         extensionUtils.KEYS.CONTROLS,
         (controlsData) => {
            if (controlsData && controlsData.devMode !== undefined) {
               setDevMode(controlsData.devMode);
            }
            
            extensionUtils.chromeStorageGetLocal(
               extensionUtils.KEYS.ENABLE_COPY_HOSTS,
               (hosts) => {
                  const activeHosts = hosts || [];
                  setCopyHosts(activeHosts);
                  setGlobalCopy(activeHosts.includes("*"));
                  setIsLoading(false);
               }
            );
         }
      );
   }, []);

   const handleToggleDevMode = (newVal) => {
      setDevMode(newVal);
      extensionUtils.chromeStorageGetLocal(
         extensionUtils.KEYS.CONTROLS,
         (controlsData) => {
            const data = controlsData || {};
            data.devMode = newVal;
            extensionUtils.chromeStorageSetLocal(
               extensionUtils.KEYS.CONTROLS,
               data
            );
         }
      );
   };

   const handleToggleGlobalCopy = (newVal) => {
      setGlobalCopy(newVal);
      extensionUtils.chromeStorageGetLocal(
         extensionUtils.KEYS.ENABLE_COPY_HOSTS,
         (storedHosts) => {
            let hosts = storedHosts || [];
            if (newVal) {
               if (!hosts.includes("*")) hosts.push("*");
            } else {
               hosts = hosts.filter((h) => h !== "*");
            }
            setCopyHosts(hosts);
            extensionUtils.chromeStorageSetLocal(
               extensionUtils.KEYS.ENABLE_COPY_HOSTS,
               hosts
            );
         }
      );
   };

   const handleClearCopyHosts = () => {
      setCopyHosts([]);
      setGlobalCopy(false);
      extensionUtils.chromeStorageSetLocal(
         extensionUtils.KEYS.ENABLE_COPY_HOSTS,
         []
      );
   };

   if (isLoading) {
      return <div className="p-8 text-center font-semibold text-gray-600 dark:text-gray-300">Loading settings...</div>;
   }

   return (
      <div className="max-w-2xl mx-auto p-8 mt-10">
         <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">SpectraLens AI - Options</h1>
         
         {/* Enable Copy Section */}
         <div className="bg-white dark:bg-[#1a1a1a] rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">Enable Copy Settings</h2>
            
            <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-gray-800 mb-4">
               <div className="flex flex-col flex-1 pr-6">
                  <span className="text-base font-bold text-gray-800 dark:text-gray-200">
                     Enable Copy Globally (All Websites)
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                     Automatically unblock text selection, copying, pasting, and right-click context menus on every website you visit.
                  </span>
               </div>
               
               <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                  <input
                     type="checkbox"
                     className="sr-only peer"
                     checked={globalCopy}
                     onChange={(e) => handleToggleGlobalCopy(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
               </label>
            </div>

            {copyHosts.length > 0 && !globalCopy && (
               <div className="p-4 rounded-lg bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-gray-800">
                  <div className="flex items-center justify-between mb-2">
                     <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Active Websites ({copyHosts.length}):
                     </span>
                     <button
                        onClick={handleClearCopyHosts}
                        className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 font-medium cursor-pointer"
                     >
                        Clear All
                     </button>
                  </div>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                     {copyHosts.map((host) => (
                        <span
                           key={host}
                           className="px-2.5 py-1 text-xs rounded-md bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                        >
                           {host}
                        </span>
                     ))}
                  </div>
               </div>
            )}
         </div>

         {/* Advanced Settings Section */}
         <div className="bg-white dark:bg-[#1a1a1a] rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">Advanced Settings</h2>
            
            <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-gray-800">
               <div className="flex flex-col flex-1 pr-6">
                  <span className="text-base font-bold text-gray-800 dark:text-gray-200">
                     Developer Mode
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                     Show detailed error logs in the extension console for debugging and troubleshooting. Not recommended for daily use.
                  </span>
               </div>
               
               <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                  <input
                     type="checkbox"
                     className="sr-only peer"
                     checked={devMode}
                     onChange={(e) => handleToggleDevMode(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
               </label>
            </div>
         </div>
      </div>
   );
}
