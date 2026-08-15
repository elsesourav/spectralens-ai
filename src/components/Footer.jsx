import { IoGlobeOutline, IoMailOutline } from "react-icons/io5";

export default function Footer() {
   const currentYear = new Date().getFullYear();

   const openLink = (url) => {
      // eslint-disable-next-line no-undef
      if (typeof chrome !== "undefined" && chrome.tabs?.create) {
         // eslint-disable-next-line no-undef
         chrome.tabs.create({ url });
      } else {
         window.open(url, "_blank");
      }
   };

   return (
      <footer className="mt-6 pt-4 pb-2 border-t border-gray-200/60 dark:border-white/10 flex flex-col items-center justify-center gap-2">
         {/* Icon Actions Bar */}
         <div className="flex items-center gap-2">
            <button
               onClick={() => openLink("https://elsesourav.web.app")}
               className="group flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100/80 dark:bg-white/5 hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 border border-gray-200/60 dark:border-white/5 transition-all duration-200 shadow-2xs cursor-pointer focus:outline-none"
               title="Website: elsesourav.web.app"
            >
               <IoGlobeOutline size={14} className="group-hover:rotate-12 transition-transform duration-300 text-gray-500 group-hover:text-blue-500 dark:text-gray-400 dark:group-hover:text-blue-400" />
               <span>Website</span>
            </button>

            <button
               onClick={() => openLink("mailto:elsesourav.auth@gmail.com")}
               className="group flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100/80 dark:bg-white/5 hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 border border-gray-200/60 dark:border-white/5 transition-all duration-200 shadow-2xs cursor-pointer focus:outline-none"
               title="Contact: elsesourav.auth@gmail.com"
            >
               <IoMailOutline size={14} className="group-hover:scale-110 transition-transform duration-300 text-gray-500 group-hover:text-blue-500 dark:text-gray-400 dark:group-hover:text-blue-400" />
               <span>Contact</span>
            </button>
         </div>

         {/* Copyright */}
         <div className="text-[11px] text-gray-400 dark:text-gray-500 font-medium tracking-wide">
            © {currentYear} SpectraLens AI. All rights reserved.
         </div>
      </footer>
   );
}

