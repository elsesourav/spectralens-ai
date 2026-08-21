import PropTypes from "prop-types";
import { useMemo, useState } from "react";
import {
  IoChevronDownOutline,
  IoChevronUpOutline,
  IoColorPaletteOutline,
  IoCopyOutline,
  IoFlashOutline,
  IoHardwareChipOutline,
  IoHelpCircleOutline,
  IoKeypadOutline,
  IoOpenOutline,
  IoScanOutline,
  IoSearchOutline,
  IoShieldCheckmarkOutline,
  IoSparkles,
  IoTimeOutline,
} from "react-icons/io5";
import appIconUrl from "../assets/icons/128.png";
import { useTheme } from "../hooks/useThemeHook.jsx";
import {
  ChatGptIcon,
  ClaudeIcon,
  GeminiIcon,
  GoogleIcon,
  GrokIcon,
  PerplexityIcon,
} from "./Icons.jsx";

const CATEGORIES = [
  { id: "all", label: "All Topics" },
  { id: "quickstart", label: "Quick Start" },
  { id: "shortcuts", label: "Shortcuts" },
  { id: "providers", label: "AI Models" },
  { id: "features", label: "Features" },
  { id: "faq", label: "FAQ & Tips" },
];

const SHORTCUTS = [
  {
    keys: ["⌥ Option / Alt", "A"],
    action: "Toggle Floating AI Widget",
    desc: "Instantly open or minimize the in-page SpectraLens AI Assistant anywhere.",
  },
  {
    keys: ["Esc"],
    action: "Close / Dismiss",
    desc: "Exit the Element Selector or minimize active overlay views.",
  },
  {
    keys: ["Enter"],
    action: "Send Message",
    desc: "Submit your prompt to all selected AI engines.",
  },
  {
    keys: ["Shift", "Enter"],
    action: "New Line",
    desc: "Insert a line break without sending the prompt.",
  },
  {
    keys: ["Ctrl / ⌘", "Shift", "S"],
    action: "Visual Element Selector",
    desc: "Activate crosshair scanner to point, click, and inspect any element.",
  },
];

const PROVIDERS = [
  {
    id: "chatgpt",
    name: "ChatGPT (OpenAI)",
    icon: ChatGptIcon,
    url: "https://chatgpt.com",
    loginUrl: "https://chatgpt.com/auth/login",
    desc: "GPT-4o & GPT-4 models for advanced reasoning, coding, and synthesis.",
    color: "text-[#10a37f]",
    badge: "Official Web",
  },
  {
    id: "claude",
    name: "Claude (Anthropic)",
    icon: ClaudeIcon,
    url: "https://claude.ai",
    loginUrl: "https://claude.ai/login",
    desc: "Claude 3.5 Sonnet for deep analytical thinking and nuanced writing.",
    color: "text-[#D97757]",
    badge: "Official Web",
  },
  {
    id: "gemini",
    name: "Gemini (Google)",
    icon: GeminiIcon,
    url: "https://gemini.google.com",
    loginUrl: "https://accounts.google.com",
    desc: "Gemini 1.5 Pro & Flash with massive context windows and Google Search.",
    color: "text-blue-500",
    badge: "Official Web",
  },
  {
    id: "grok",
    name: "Grok (xAI)",
    icon: GrokIcon,
    url: "https://grok.com",
    loginUrl: "https://grok.com",
    desc: "Real-time search and unfiltered knowledge from xAI.",
    color: "text-slate-800 dark:text-slate-200",
    badge: "Official Web",
  },
  {
    id: "perplexity",
    name: "Perplexity AI",
    icon: PerplexityIcon,
    url: "https://www.perplexity.ai",
    loginUrl: "https://www.perplexity.ai/login",
    desc: "Direct web citations, up-to-date research summaries, and source links.",
    color: "text-[#20B2AA]",
    badge: "Official Web",
  },
  {
    id: "google",
    name: "Google Search Overview",
    icon: GoogleIcon,
    url: "https://www.google.com",
    loginUrl: "https://accounts.google.com",
    desc: "Instant live Google search AI answers and featured snippets.",
    color: "text-amber-500",
    badge: "Live Search",
  },
];

const FAQS = [
  {
    q: "Why do I see a 'Sign-in Required' card?",
    a: "SpectraLens AI uses your active web browser session to talk directly with AI providers without requiring expensive API keys. Simply click 'Sign in' on the provider card to log into your free or premium account in that provider's web tab.",
  },
  {
    q: "How does the Page Theme adaptation mode work?",
    a: "When the theme is set to 'Page / Tab Theme', SpectraLens AI automatically analyzes the host website's background palette and font metrics to seamlessly blend the in-page widget into GitHub, Reddit, Notion, Wikipedia, and dark/light websites.",
  },
  {
    q: "How does the Visual Element Selector work?",
    a: "Click the Crosshair icon in the chat input or in the Header. As you hover over the webpage, elements highlight with precise bounding boxes. Click any element to automatically extract its text, tables, or code and attach it into your prompt!",
  },
  {
    q: "Is my chat history and personal data private?",
    a: "100% Yes. SpectraLens AI operates completely on-device. Your history is stored securely in your local browser storage via a high-performance split-storage engine. Zero chat data or telemetry is collected by third-party servers.",
  },
  {
    q: "What is Universal Copy Unblocker?",
    a: "Some websites disable text selection, right-click context menus, and copying. SpectraLens AI includes a built-in unblocker that safely strips these restrictions so you can freely copy notes and research.",
  },
  {
    q: "Why did an AI worker tab close automatically?",
    a: "To conserve your computer's RAM and battery life, SpectraLens AI automatically cleans up background worker tabs once a prompt completes or when the host page is reloaded.",
  },
];

export default function GuideView({ isMenuOpen = true }) {
  const { contrastMode } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [expandedFaq, setExpandedFaq] = useState(null);

  const cardBgClass =
    contrastMode === "solid"
      ? "bg-slate-100 dark:bg-[#1a1d26] border-slate-200/90 dark:border-white/[0.08]"
      : contrastMode === "transparent"
        ? "bg-white/40 dark:bg-black/30 backdrop-blur-md border-slate-200/40 dark:border-white/[0.06]"
        : "bg-white/70 dark:bg-[#14161e]/70 backdrop-blur-xl border-slate-200/60 dark:border-white/[0.08]";

  const innerCardBg =
    contrastMode === "solid"
      ? "bg-white dark:bg-[#11131a] border-slate-200/80 dark:border-white/[0.06]"
      : "bg-slate-50/80 dark:bg-white/[0.03] border-slate-200/60 dark:border-white/[0.05]";

  const handleOpenExternal = (url) => {
    if (typeof chrome !== "undefined" && chrome.tabs?.create) {
      chrome.tabs.create({ url });
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const handleOpenOptions = (hash = "") => {
    if (typeof chrome !== "undefined" && chrome.runtime?.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else if (typeof chrome !== "undefined" && chrome.runtime?.id) {
      handleOpenExternal(
        `chrome-extension://${chrome.runtime.id}/options/options.html${hash}`,
      );
    }
  };

  const filteredFaqs = useMemo(() => {
    return FAQS.filter(
      (f) =>
        f.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.a.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [searchQuery]);

  const filteredProviders = useMemo(() => {
    return PROVIDERS.filter(
      (p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.desc.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [searchQuery]);

  const filteredShortcuts = useMemo(() => {
    return SHORTCUTS.filter(
      (s) =>
        s.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.keys.some((k) => k.toLowerCase().includes(searchQuery.toLowerCase())),
    );
  }, [searchQuery]);

  return (
    <div className="w-full h-full flex flex-col overflow-hidden select-none bg-transparent">
      {/* Header Bar */}
      <div className="p-3.5 pb-2 border-b border-slate-200/70 dark:border-white/[0.07] shrink-0 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-xs">
              <img
                src={appIconUrl}
                alt="SpectraLens AI"
                className="size-5 object-contain"
              />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                SpectraLens AI Guide
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  v2.9.73
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                User manual, keyboard shortcuts & feature walkthroughs
              </p>
            </div>
          </div>

          <button
            onClick={() => handleOpenOptions("#guide")}
            title="Open Full Desktop Guide"
            className="flex items-center gap-1 w-1/4 text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer focus:outline-none"
          >
            Full View
            <IoOpenOutline className="size-3.5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative w-full">
          <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search guides, shortcuts, features, FAQs..."
            className={`w-full pl-8 pr-3 py-1.5 rounded-xl text-xs border transition-all focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 ${innerCardBg}`}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              Clear
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
          {CATEGORIES.map((cat) => {
            const isSelected = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all focus:outline-none cursor-pointer ${
                  isSelected
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-200/60 dark:bg-white/[0.05] text-slate-600 dark:text-slate-300 hover:bg-slate-200/90 dark:hover:bg-white/10"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Scrollable Content Container */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3.5 space-y-4">
        {/* Section 1: Quick Start */}
        {(activeCategory === "all" || activeCategory === "quickstart") && (
          <section
            className={`p-3.5 rounded-2xl border shadow-xs space-y-3 ${cardBgClass}`}
          >
            <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
              <IoFlashOutline className="size-4" />
              <h3 className="text-xs font-bold uppercase tracking-wider">
                Quick Start Guide
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              <div
                className={`p-2.5 rounded-xl border flex items-start gap-2.5 ${innerCardBg}`}
              >
                <div className="size-6 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-black shrink-0">
                  1
                </div>
                <div className="text-xs space-y-0.5">
                  <span className="font-bold text-slate-800 dark:text-slate-100 block">
                    Ask Any AI Model
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Type your prompt in the chat input. Check or uncheck
                    provider icons (ChatGPT, Claude, Gemini, Grok, Perplexity,
                    Google) to query them simultaneously.
                  </p>
                </div>
              </div>

              <div
                className={`p-2.5 rounded-xl border flex items-start gap-2.5 ${innerCardBg}`}
              >
                <div className="size-6 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center text-xs font-black shrink-0">
                  2
                </div>
                <div className="text-xs space-y-0.5">
                  <span className="font-bold text-slate-800 dark:text-slate-100 block">
                    Inspect with Visual Element Selector
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Click the Crosshair button or press{" "}
                    <kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-white/10 text-[10px] font-mono">
                      Alt + A
                    </kbd>{" "}
                    to inspect and query text, tables, or charts directly from
                    the page.
                  </p>
                </div>
              </div>

              <div
                className={`p-2.5 rounded-xl border flex items-start gap-2.5 ${innerCardBg}`}
              >
                <div className="size-6 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-black shrink-0">
                  3
                </div>
                <div className="text-xs space-y-0.5">
                  <span className="font-bold text-slate-800 dark:text-slate-100 block">
                    Seamless Theme & Transparency
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Toggle between Host Page Theme, Dark Mode, and Light Mode
                    from the bottom sidebar button, and customize Glassmorphism
                    in Settings.
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Section 2: Keyboard Shortcuts */}
        {(activeCategory === "all" || activeCategory === "shortcuts") && (
          <section
            className={`p-3.5 rounded-2xl border shadow-xs space-y-3 ${cardBgClass}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                <IoKeypadOutline className="size-4" />
                <h3 className="text-xs font-bold uppercase tracking-wider">
                  Keyboard Shortcuts
                </h3>
              </div>
              <span className="text-[10px] text-slate-400">
                Fast Navigation
              </span>
            </div>

            <div className="space-y-2">
              {filteredShortcuts.map((sc, i) => (
                <div
                  key={i}
                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 ${innerCardBg}`}
                >
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      {sc.action}
                    </span>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      {sc.desc}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {sc.keys.map((k, ki) => (
                      <kbd
                        key={ki}
                        className="px-1.5 py-1 rounded-md text-[10px] font-bold font-mono bg-slate-200/80 dark:bg-white/10 text-slate-700 dark:text-slate-200 border border-slate-300/80 dark:border-white/10 shadow-2xs"
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Section 3: AI Providers */}
        {(activeCategory === "all" || activeCategory === "providers") && (
          <section
            className={`p-3.5 rounded-2xl border shadow-xs space-y-3 ${cardBgClass}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <IoHardwareChipOutline className="size-4" />
                <h3 className="text-xs font-bold uppercase tracking-wider">
                  Supported AI Models
                </h3>
              </div>
              <span className="text-[10px] text-slate-400">
                Zero API Key Needed
              </span>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              SpectraLens AI bridges directly with your signed-in web sessions
              so you get unlimited access using your existing free or pro
              accounts.
            </p>

            <div className="grid grid-cols-1 gap-2">
              {filteredProviders.map((p) => {
                const Icon = p.icon;
                return (
                  <div
                    key={p.id}
                    className={`p-2.5 rounded-xl border flex items-center justify-between gap-2.5 ${innerCardBg}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="size-8 rounded-lg bg-slate-200/70 dark:bg-white/10 flex items-center justify-center shrink-0">
                        <Icon className={`size-4.5 ${p.color}`} size={18} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {p.name}
                          </span>
                          <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-slate-200/70 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                            {p.badge}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          {p.desc}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleOpenExternal(p.loginUrl)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-600/10 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white transition-all cursor-pointer shrink-0 focus:outline-none"
                      title={`Sign in or open ${p.name}`}
                    >
                      Connect
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Section 4: Features Showcase */}
        {(activeCategory === "all" || activeCategory === "features") && (
          <section
            className={`p-3.5 rounded-2xl border shadow-xs space-y-3 ${cardBgClass}`}
          >
            <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
              <IoSparkles className="size-4" />
              <h3 className="text-xs font-bold uppercase tracking-wider">
                Core Extension Features
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div
                className={`p-2.5 rounded-xl border space-y-1 ${innerCardBg}`}
              >
                <div className="flex items-center gap-1.5 text-blue-500 font-bold text-xs">
                  <IoScanOutline className="size-3.5" />
                  Element Scan
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal">
                  Hover & click any DOM element to extract content directly into
                  prompts.
                </p>
              </div>

              <div
                className={`p-2.5 rounded-xl border space-y-1 ${innerCardBg}`}
              >
                <div className="flex items-center gap-1.5 text-emerald-500 font-bold text-xs">
                  <IoCopyOutline className="size-3.5" />
                  Copy Unblocker
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal">
                  Removes copy, selection, and right-click locks across all
                  protected pages.
                </p>
              </div>

              <div
                className={`p-2.5 rounded-xl border space-y-1 ${innerCardBg}`}
              >
                <div className="flex items-center gap-1.5 text-amber-500 font-bold text-xs">
                  <IoColorPaletteOutline className="size-3.5" />
                  Adaptive Theme
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal">
                  Harmonizes with host website colors + 3-stage glassmorphism
                  control.
                </p>
              </div>

              <div
                className={`p-2.5 rounded-xl border space-y-1 ${innerCardBg}`}
              >
                <div className="flex items-center gap-1.5 text-indigo-500 font-bold text-xs">
                  <IoTimeOutline className="size-3.5" />
                  Fast History
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal">
                  Local split storage engine for instant retrieval of multi-turn
                  sessions.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Section 5: FAQ & Troubleshooting */}
        {(activeCategory === "all" || activeCategory === "faq") && (
          <section
            className={`p-3.5 rounded-2xl border shadow-xs space-y-3 ${cardBgClass}`}
          >
            <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
              <IoHelpCircleOutline className="size-4" />
              <h3 className="text-xs font-bold uppercase tracking-wider">
                Frequently Asked Questions
              </h3>
            </div>

            <div className="space-y-2">
              {filteredFaqs.map((faq, i) => {
                const isExpanded = expandedFaq === i;
                return (
                  <div
                    key={i}
                    className={`rounded-xl border transition-all overflow-hidden ${innerCardBg}`}
                  >
                    <button
                      onClick={() => setExpandedFaq(isExpanded ? null : i)}
                      className="w-full p-2.5 text-left flex items-center justify-between gap-2 focus:outline-none cursor-pointer"
                    >
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {faq.q}
                      </span>
                      {isExpanded ? (
                        <IoChevronUpOutline className="size-3.5 text-slate-400 shrink-0" />
                      ) : (
                        <IoChevronDownOutline className="size-3.5 text-slate-400 shrink-0" />
                      )}
                    </button>
                    {isExpanded && (
                      <div className="px-2.5 pb-2.5 pt-0 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-white/[0.04]">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Section 6: Privacy & Options Link Footer */}
        <div
          className={`p-3 rounded-xl border flex items-center justify-between text-xs ${innerCardBg}`}
        >
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 text-[11px]">
            <IoShieldCheckmarkOutline className="size-4 text-emerald-500 shrink-0" />
            <span>100% On-Device & Zero Tracking</span>
          </div>

          <button
            onClick={() => handleOpenOptions("#settings")}
            className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer focus:outline-none"
          >
            Options Page →
          </button>
        </div>
      </div>
    </div>
  );
}

GuideView.propTypes = {
  isMenuOpen: PropTypes.bool,
};
