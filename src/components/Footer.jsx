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
      <footer className="mt-2 pt-2 pb-0.5 border-t border-slate-200/80 dark:border-white/[0.08] flex flex-col items-center justify-center gap-1.5 shrink-0">
         {/* Icon Actions Bar */}
         <div className="flex items-center gap-2">
            <button
               onClick={() => openLink("https://elsesourav.web.app")}
               className="group flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/5 hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 border border-slate-200/80 dark:border-white/[0.06] transition-all duration-150 cursor-pointer focus:outline-none"
               title="Website: elsesourav.web.app"
            >
               <IoGlobeOutline size={13} className="group-hover:rotate-12 transition-transform duration-300 text-slate-500 group-hover:text-blue-500 dark:text-slate-400 dark:group-hover:text-blue-400" />
               <span>Website</span>
            </button>

            <button
               onClick={() => openLink("mailto:elsesourav.auth@gmail.com")}
               className="group flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/5 hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 border border-slate-200/80 dark:border-white/[0.06] transition-all duration-150 cursor-pointer focus:outline-none"
               title="Contact: elsesourav.auth@gmail.com"
            >
               <IoMailOutline size={13} className="group-hover:scale-110 transition-transform duration-300 text-slate-500 group-hover:text-blue-500 dark:text-slate-400 dark:group-hover:text-blue-400" />
               <span>Contact</span>
            </button>
         </div>

         {/* Copyright */}
         <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium tracking-wide">
            © {currentYear} SpectraLens AI. All rights reserved.
         </div>
      </footer>
   );
}
