import { useEffect, useMemo, useRef, useState } from "react";
import {
  IoAnalyticsOutline,
  IoBookOutline,
  IoChatboxEllipsesOutline,
  IoChatbubblesOutline,
  IoCheckmarkCircle,
  IoChevronDownOutline,
  IoChevronUpOutline,
  IoCloudUploadOutline,
  IoCopyOutline,
  IoDocumentTextOutline,
  IoDownloadOutline,
  IoEyeOffOutline,
  IoFingerPrintOutline,
  IoFlameOutline,
  IoFlashOutline,
  IoFolderOpenOutline,
  IoGitNetworkOutline,
  IoGlobeOutline,
  IoHardwareChipOutline,
  IoInformationCircleOutline,
  IoKeyOutline,
  IoKeypadOutline,
  IoLockClosedOutline,
  IoMoonOutline,
  IoOpenOutline,
  IoOptionsOutline,
  IoPieChartOutline,
  IoRefreshOutline,
  IoScanOutline,
  IoSearchOutline,
  IoSendOutline,
  IoServerOutline,
  IoSettingsOutline,
  IoShieldCheckmarkOutline,
  IoSparkles,
  IoSpeedometerOutline,
  IoSunnyOutline,
  IoTrashOutline,
  IoWarningOutline,
} from "react-icons/io5";
import appIconUrl from "../assets/icons/128.png";
import {
  ChatGptIcon,
  ClaudeIcon,
  GeminiIcon,
  GoogleIcon,
  GrokIcon,
  PerplexityIcon,
} from "../components/Icons.jsx";
import { useTheme } from "../hooks/useThemeHook.jsx";
import extensionUtils from "../utils/utilsModule.js";

const TABS = [
  { id: "welcome", label: "Welcome & Tour", icon: IoSparkles },
  { id: "guide", label: "User Guide & Docs", icon: IoBookOutline },
  { id: "providers", label: "AI Models & Auth", icon: IoHardwareChipOutline },
  { id: "settings", label: "Copy & Settings", icon: IoSettingsOutline },
  { id: "shortcuts", label: "Shortcuts", icon: IoKeypadOutline },
  { id: "privacy", label: "Privacy & Data", icon: IoShieldCheckmarkOutline },
  {
    id: "uninstall",
    label: "Feedback & Survey",
    icon: IoChatboxEllipsesOutline,
  },
];

const PROVIDER_LIST = [
  {
    id: "chatgpt",
    name: "ChatGPT",
    company: "OpenAI",
    icon: ChatGptIcon,
    url: "https://chatgpt.com",
    loginUrl: "https://chatgpt.com/auth/login",
    desc: "GPT-4o & GPT-4 with reasoning and code synthesis.",
    color: "text-[#10a37f]",
  },
  {
    id: "claude",
    name: "Claude",
    company: "Anthropic",
    icon: ClaudeIcon,
    url: "https://claude.ai",
    loginUrl: "https://claude.ai/login",
    desc: "Claude 3.5 Sonnet for deep analysis and writing.",
    color: "text-[#D97757]",
  },
  {
    id: "gemini",
    name: "Gemini",
    company: "Google",
    icon: GeminiIcon,
    url: "https://gemini.google.com",
    loginUrl: "https://accounts.google.com",
    desc: "Gemini 1.5 Pro & Flash with massive context.",
    color: "text-blue-500",
  },
  {
    id: "grok",
    name: "Grok",
    company: "xAI",
    icon: GrokIcon,
    url: "https://grok.com",
    loginUrl: "https://grok.com",
    desc: "Real-time web knowledge and unfiltered answers.",
    color: "text-slate-800 dark:text-slate-200",
  },
  {
    id: "perplexity",
    name: "Perplexity",
    company: "Perplexity AI",
    icon: PerplexityIcon,
    url: "https://www.perplexity.ai",
    loginUrl: "https://www.perplexity.ai/login",
    desc: "Live search with direct web links and citations.",
    color: "text-[#20B2AA]",
  },
  {
    id: "google",
    name: "Google Search",
    company: "Google",
    icon: GoogleIcon,
    url: "https://www.google.com",
    loginUrl: "https://accounts.google.com",
    desc: "Instant live Google search AI answers & overviews.",
    color: "text-amber-500",
  },
];

const FAQS = [
  {
    q: "How does SpectraLens AI talk to AI models without API keys?",
    a: "SpectraLens AI operates by communicating with your existing signed-in web sessions on chatgpt.com, claude.ai, gemini.google.com, grok.com, and perplexity.ai. This means you can use your free or Plus/Pro subscription directly without paying extra for API tokens!",
  },
  {
    q: "Why do I see 'Sign-in Required' on a provider?",
    a: "If your browser session has expired or you haven't logged into that AI service on the web yet, simply click the 'Sign in' button to log in once. SpectraLens AI will automatically detect your active login session.",
  },
  {
    q: "How do I trigger the in-page Floating AI Widget?",
    a: "Press Option + A (Mac) or Alt + A (Windows/Linux) on any webpage, or click the SpectraLens AI icon in your browser toolbar.",
  },
  {
    q: "How does the Visual Element Selector work?",
    a: "Click the Crosshair icon in the chat input or window header. Hover over any webpage element (paragraphs, tables, code blocks, or cards) to highlight it, and click to attach its content directly into your AI prompt.",
  },
  {
    q: "Is my personal data or browsing history tracked?",
    a: "No. SpectraLens AI is strictly 100% on-device and privacy-first. All your chat sessions and settings are saved in your local Chrome storage on your machine. Zero telemetry or personal data is collected or transmitted to our servers.",
  },
  {
    q: "How does the Universal Copy Unblocker work?",
    a: "Some websites use JavaScript or CSS to disable text selection, copy-pasting, and right-click context menus. SpectraLens AI neutralizes these restrictions on-the-fly, allowing you to freely copy text on study, exam, or documentation websites.",
  },
];

export default function OptionsApp() {
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState("welcome");
  const [devMode, setDevMode] = useState(false);
  const [globalCopy, setGlobalCopy] = useState(false);
  const [copyHosts, setCopyHosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [historyCount, setHistoryCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [feedbackReason, setFeedbackReason] = useState("");
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);

  const fileInputRef = useRef(null);
  const [storageBytes, setStorageBytes] = useState(0);
  const [storageBreakdown, setStorageBreakdown] = useState({
    chatBytes: 0,
    chatCount: 0,
    settingsBytes: 0,
    hostsCount: 0,
  });
  const [storageKeysList, setStorageKeysList] = useState([]);
  const [showStorageAudit, setShowStorageAudit] = useState(false);
  const [importStatus, setImportStatus] = useState(null);

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const refreshStorageStats = () => {
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      if (chrome.storage.local.getBytesInUse) {
        try {
          chrome.storage.local.getBytesInUse(null, (bytes) => {
            setStorageBytes(bytes || 0);
          });
        } catch (e) {}
      }

      chrome.storage.local.get(null, (allData) => {
        const data = allData || {};
        const keys = Object.keys(data);
        const historyIndex = Array.isArray(data[extensionUtils.KEYS.HISTORY_INDEX])
          ? data[extensionUtils.KEYS.HISTORY_INDEX]
          : [];
        setHistoryCount(historyIndex.length);

        let chatBytesEstimate = 0;
        let settingsBytesEstimate = 0;
        const keyAudit = [];

        for (const [key, val] of Object.entries(data)) {
          const itemSize = JSON.stringify(val).length;
          let category = "Configuration";
          let purpose = "Extension preference";

          if (
            key.startsWith(extensionUtils.KEYS.CHAT_PREFIX) ||
            key === extensionUtils.KEYS.HISTORY_INDEX
          ) {
            chatBytesEstimate += itemSize;
            category = "Conversation Log";
            purpose = key === extensionUtils.KEYS.HISTORY_INDEX ? "Chat session catalogue" : "Full conversation transcript";
          } else if (
            key === extensionUtils.KEYS.ENABLE_COPY_HOSTS ||
            key === extensionUtils.KEYS.ALWAYS_ACTIVE_HOSTS ||
            key === extensionUtils.KEYS.MENU_HOSTS
          ) {
            settingsBytesEstimate += itemSize;
            category = "Site Whitelist";
            purpose = "Domain-specific feature rules";
          } else {
            settingsBytesEstimate += itemSize;
          }

          keyAudit.push({
            key,
            size: itemSize,
            category,
            purpose,
          });
        }

        const hosts = Array.isArray(data[extensionUtils.KEYS.ENABLE_COPY_HOSTS])
          ? data[extensionUtils.KEYS.ENABLE_COPY_HOSTS].length
          : 0;

        setStorageBreakdown({
          chatBytes: chatBytesEstimate,
          chatCount: historyIndex.length,
          settingsBytes: settingsBytesEstimate,
          hostsCount: hosts,
        });

        setStorageKeysList(keyAudit.sort((a, b) => b.size - a.size));
      });
    }
  };

  // Read URL Hash for direct tab navigation (e.g. #guide, #welcome, #uninstall)
  useEffect(() => {
    const applyHash = () => {
      const hash = window.location.hash.replace("#", "").toLowerCase();
      if (hash && TABS.some((t) => t.id === hash)) {
        setActiveTab(hash);
      }
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);

  // Load initial settings and history count + storage stats
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

            refreshStorageStats();
            setIsLoading(false);
          },
        );
      },
    );
  }, []);

  const handleSelectTab = (tabId) => {
    setActiveTab(tabId);
    window.location.hash = tabId;
  };

  const handleToggleDevMode = (newVal) => {
    setDevMode(newVal);
    extensionUtils.chromeStorageGetLocal(
      extensionUtils.KEYS.CONTROLS,
      (controlsData) => {
        const data = controlsData || {};
        data.devMode = newVal;
        extensionUtils.chromeStorageSetLocal(
          extensionUtils.KEYS.CONTROLS,
          data,
        );
      },
    );
  };

function ToggleSwitch({
  checked,
  onChange,
  activeColor = "bg-emerald-600",
  title = "",
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      title={title}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        checked ? activeColor : "bg-slate-300 dark:bg-slate-700"
      }`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

  const handleToggleGlobalCopy = (newVal) => {
    setGlobalCopy(newVal);
    extensionUtils.chromeStorageGetLocal(
      extensionUtils.KEYS.ENABLE_COPY_HOSTS,
      (storedHosts) => {
        let hosts = storedHosts || [];
        if (typeof hosts === "string") {
          try {
            hosts = JSON.parse(hosts);
          } catch (e) {
            hosts = [];
          }
        }
        if (!Array.isArray(hosts)) hosts = [];
        if (newVal) {
          if (!hosts.includes("*")) hosts.push("*");
        } else {
          hosts = hosts.filter((h) => h !== "*");
        }
        setCopyHosts(hosts);
        extensionUtils.chromeStorageSetLocal(
          extensionUtils.KEYS.ENABLE_COPY_HOSTS,
          hosts,
          () => {
            if (typeof chrome !== "undefined" && chrome.tabs?.query) {
              chrome.tabs.query({}, (tabs) => {
                for (const tab of tabs) {
                  if (tab.id && tab.url?.startsWith("http")) {
                    chrome.tabs
                      .sendMessage(tab.id, {
                        action: newVal
                          ? "enable_function"
                          : "disable_function",
                      })
                      .catch(() => {});
                  }
                }
              });
            }
          }
        );
      },
    );
  };

  const handleClearCopyHosts = () => {
    setCopyHosts([]);
    setGlobalCopy(false);
    extensionUtils.chromeStorageSetLocal(
      extensionUtils.KEYS.ENABLE_COPY_HOSTS,
      [],
    );
  };

  const handleRemoveHost = (hostToRemove) => {
    const updated = copyHosts.filter((h) => h !== hostToRemove);
    setCopyHosts(updated);
    setGlobalCopy(updated.includes("*"));
    extensionUtils.chromeStorageSetLocal(
      extensionUtils.KEYS.ENABLE_COPY_HOSTS,
      updated,
    );
  };

  const handleExportHistory = () => {
    if (typeof chrome === "undefined" || !chrome.storage?.local) return;
    chrome.storage.local.get(null, (allData) => {
      const data = allData || {};
      const historyIndex = Array.isArray(data[extensionUtils.KEYS.HISTORY_INDEX])
        ? data[extensionUtils.KEYS.HISTORY_INDEX]
        : [];

      const fullBackup = {
        version: "2.9.75",
        exportDate: new Date().toISOString(),
        historyIndex,
        sessions: {},
      };

      for (const item of historyIndex) {
        if (item?.id) {
          const chatKey = extensionUtils.KEYS.CHAT_PREFIX + item.id;
          if (data[chatKey]) {
            fullBackup.sessions[item.id] = data[chatKey];
          }
        }
      }

      const exportBlob = new Blob([JSON.stringify(fullBackup, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(exportBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `spectralens-ai-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  };

  const handleExportHistoryMarkdown = () => {
    if (typeof chrome === "undefined" || !chrome.storage?.local) return;
    chrome.storage.local.get(null, (allData) => {
      const data = allData || {};
      const historyIndex = Array.isArray(data[extensionUtils.KEYS.HISTORY_INDEX])
        ? data[extensionUtils.KEYS.HISTORY_INDEX]
        : [];

      if (historyIndex.length === 0) {
        alert("No saved conversation history to export.");
        return;
      }

      let mdContent = `# SpectraLens AI - Conversation History Export\n\n`;
      mdContent += `*Exported on: ${new Date().toLocaleString()}*\n`;
      mdContent += `*Total Sessions: ${historyIndex.length}*\n\n---\n\n`;

      historyIndex.forEach((item, idx) => {
        const sessionData = data[extensionUtils.KEYS.CHAT_PREFIX + item.id];
        const title = item.question || `Session #${idx + 1}`;
        const date = item.timestamp
          ? new Date(item.timestamp).toLocaleString()
          : "Unknown date";
        const providers = Array.isArray(item.providers)
          ? item.providers.join(", ")
          : "Multi-engine";

        mdContent += `## ${idx + 1}. ${title}\n`;
        mdContent += `**Date**: ${date} | **Models**: ${providers} | **Turns**: ${item.turnCount || 1}\n\n`;

        if (sessionData && Array.isArray(sessionData.turns)) {
          sessionData.turns.forEach((turn, tIdx) => {
            mdContent += `### Turn ${tIdx + 1}: ${turn.question || "Query"}\n\n`;
            if (turn.answers && typeof turn.answers === "object") {
              Object.entries(turn.answers).forEach(([prov, ans]) => {
                const answerText = typeof ans === "object" ? ans?.text : ans;
                if (answerText) {
                  mdContent += `#### [${prov.toUpperCase()}]\n${answerText}\n\n`;
                }
              });
            }
          });
        }
        mdContent += `---\n\n`;
      });

      const blob = new Blob([mdContent], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `spectralens-ai-history-${new Date().toISOString().slice(0, 10)}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  };

  const handleImportHistory = (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (!parsed || (!parsed.historyIndex && !Array.isArray(parsed))) {
          alert(
            "Invalid backup format. Please upload a valid SpectraLens AI JSON backup.",
          );
          return;
        }

        const incomingIndex =
          parsed.historyIndex || (Array.isArray(parsed) ? parsed : []);
        const incomingSessions = parsed.sessions || {};

        extensionUtils.getHistoryIndex((currentIndex) => {
          const mergedIndexMap = new Map();
          (currentIndex || []).forEach((item) => {
            if (item?.id) mergedIndexMap.set(item.id, item);
          });
          incomingIndex.forEach((item) => {
            if (item?.id) mergedIndexMap.set(item.id, item);
          });

          const finalIndex = Array.from(mergedIndexMap.values()).sort(
            (a, b) => (b.timestamp || 0) - (a.timestamp || 0),
          );

          const itemsToSet = {
            [extensionUtils.KEYS.HISTORY_INDEX]: finalIndex,
          };

          Object.entries(incomingSessions).forEach(
            ([sessionId, sessionData]) => {
              itemsToSet[extensionUtils.KEYS.CHAT_PREFIX + sessionId] =
                sessionData;
            },
          );

          chrome.storage.local.set(itemsToSet, () => {
            refreshStorageStats();
            setImportStatus(
              `Successfully imported & merged ${incomingIndex.length} sessions!`,
            );
            setTimeout(() => setImportStatus(null), 4000);
          });
        });
      } catch (err) {
        alert("Error reading backup JSON: " + err.message);
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = "";
  };

  const handleClearAllHistory = () => {
    if (
      window.confirm(
        "Are you sure you want to delete all saved chat history? This cannot be undone.",
      )
    ) {
      extensionUtils.clearAllHistory(() => {
        refreshStorageStats();
        alert("All chat history has been securely erased.");
      });
    }
  };

  const handleFactoryReset = () => {
    if (
      window.confirm(
        "⚠️ FACTORY RESET: Are you sure you want to erase ALL settings, whitelists, themes, and chat history? The extension will return to pristine install state.",
      )
    ) {
      if (typeof chrome !== "undefined" && chrome.storage?.local) {
        chrome.storage.local.clear(() => {
          setDevMode(false);
          setGlobalCopy(false);
          setCopyHosts([]);
          setHistoryCount(0);
          refreshStorageStats();
          alert("Extension has been reset to factory defaults.");
        });
      }
    }
  };

  const handleOpenExternal = (url) => {
    if (typeof chrome !== "undefined" && chrome.tabs?.create) {
      chrome.tabs.create({ url });
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const handleCopyCode = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSubmitFeedback = (e) => {
    e.preventDefault();
    if (!feedbackReason && !feedbackText) return;

    const payload = {
      id: Date.now(),
      reason: feedbackReason || "General Feedback",
      text: feedbackText || "No additional comments",
      timestamp: new Date().toISOString(),
      version: "2.9.76",
    };

    // Save feedback draft locally on machine
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      chrome.storage.local.get(["SpectraLens-Feedback-Drafts"], (res) => {
        const existing = Array.isArray(res?.["SpectraLens-Feedback-Drafts"])
          ? res["SpectraLens-Feedback-Drafts"]
          : [];
        chrome.storage.local.set({
          "SpectraLens-Feedback-Drafts": [payload, ...existing].slice(0, 50),
        });
      });
    }

    setFeedbackSubmitted(true);
  };

  const getFeedbackGithubUrl = () => {
    const title = encodeURIComponent(
      `[Feedback] ${feedbackReason || "SpectraLens AI User Suggestion"}`
    );
    const body = encodeURIComponent(
      `### Feedback Category\n${feedbackReason || "General"}\n\n### Suggestions / Details\n${feedbackText || "N/A"}\n\n---\n*SpectraLens Version*: 2.9.76\n*User Agent*: ${navigator.userAgent}`
    );
    return `https://github.com/elsesourav/spectralens-ai/issues/new?title=${title}&body=${body}`;
  };

  const getFeedbackMailtoUrl = () => {
    const subject = encodeURIComponent(
      `[SpectraLens AI Feedback] ${feedbackReason || "User Suggestion"}`
    );
    const body = encodeURIComponent(
      `Feedback Category: ${feedbackReason || "General"}\n\nSuggestions / Details:\n${feedbackText || "N/A"}\n\n---\nSpectraLens Version: 2.9.76`
    );
    return `mailto:elsesourav.auth@gmail.com?subject=${subject}&body=${body}`;
  };

  const filteredFaqs = useMemo(() => {
    if (!searchQuery) return FAQS;
    return FAQS.filter(
      (f) =>
        f.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.a.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [searchQuery]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0c0d12] text-slate-600 dark:text-slate-300">
        <div className="flex flex-col items-center gap-3">
          <div className="size-10 rounded-xl bg-blue-600 animate-pulse flex items-center justify-center shadow-lg">
            <img
              src={appIconUrl}
              alt="Loading"
              className="size-6 object-contain"
            />
          </div>
          <span className="text-sm font-semibold">
            Loading SpectraLens AI Hub...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-[#0c0d12] text-slate-900 dark:text-slate-100 selection:bg-blue-500 selection:text-white">
      {/* Left Sidebar Navigation */}
      <aside className="w-64 border-r border-slate-200/80 dark:border-white/[0.07] bg-white/70 dark:bg-[#11131a]/70 backdrop-blur-xl p-5 flex flex-col justify-between shrink-0 select-none">
        <div className="space-y-6">
          {/* Brand Header */}
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 p-0.5 shadow-md flex items-center justify-center shrink-0">
              <img
                src={appIconUrl}
                alt="SpectraLens AI"
                className="size-8 object-contain rounded-lg"
              />
            </div>
            <div>
              <h1 className="text-base font-black bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 bg-clip-text text-transparent leading-tight">
                SpectraLens AI
              </h1>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Documentation & Hub v2.9.73
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {TABS.map((t) => {
              const Icon = t.icon;
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => handleSelectTab(t.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all focus:outline-none cursor-pointer ${
                    isActive
                      ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05] hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Icon className="size-4 shrink-0" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer info & Theme Toggle */}
        <div className="pt-4 border-t border-slate-200/70 dark:border-white/[0.06] space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>Theme Mode</span>
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/[0.05] hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 transition-colors focus:outline-none cursor-pointer"
              title="Toggle Dark / Light Mode"
            >
              {theme === "dark" ? (
                <IoSunnyOutline className="size-4 text-amber-400" />
              ) : (
                <IoMoonOutline className="size-4 text-blue-500" />
              )}
            </button>
          </div>

          <div className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal">
            100% Local Browser Engine.
            <br />
            Zero Telemetry Tracking.
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto max-h-screen p-8 lg:p-12 custom-scrollbar">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* TAB 1: WELCOME & ONBOARDING */}
          {activeTab === "welcome" && (
            <div className="space-y-8 animate-fade-in">
              {/* Hero Banner */}
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 text-white p-8 lg:p-10 shadow-xl">
                <div className="relative z-10 space-y-3 max-w-2xl">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-bold tracking-wide">
                    <IoSparkles className="size-3.5 text-yellow-300" />
                    <span>Welcome to SpectraLens AI</span>
                  </div>
                  <h2 className="text-3xl lg:text-4xl font-black tracking-tight leading-tight">
                    Supercharge your browsing with Multi-Engine AI.
                  </h2>
                  <p className="text-sm lg:text-base text-blue-100 leading-relaxed">
                    Compare ChatGPT, Claude, Gemini, Grok, and Perplexity
                    side-by-side on any webpage, scan visual elements, unblock
                    restricted copy, and boost productivity.
                  </p>
                  <div className="pt-2 flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => handleSelectTab("guide")}
                      className="px-5 py-2.5 rounded-xl bg-white text-blue-700 text-xs font-extrabold shadow-md hover:bg-blue-50 transition-all cursor-pointer focus:outline-none"
                    >
                      Explore Features & Guide →
                    </button>
                    <button
                      onClick={() => handleSelectTab("providers")}
                      className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-extrabold backdrop-blur-md border border-white/20 transition-all cursor-pointer focus:outline-none"
                    >
                      Connect AI Accounts
                    </button>
                  </div>
                </div>

                {/* Decorative Background Circles */}
                <div className="absolute -right-16 -top-16 size-72 rounded-full bg-purple-500/30 blur-3xl pointer-events-none" />
                <div className="absolute -right-8 -bottom-8 size-64 rounded-full bg-blue-400/30 blur-2xl pointer-events-none" />
              </div>

              {/* 3-Step Quick Setup */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-white/[0.07] bg-white dark:bg-[#14161e] shadow-xs space-y-2.5">
                  <div className="size-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black text-sm">
                    1
                  </div>
                  <h3 className="text-sm font-bold">1. Pin the Extension</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Click the puzzle icon in Chrome’s top toolbar and pin
                    SpectraLens AI for instant one-click access.
                  </p>
                </div>

                <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-white/[0.07] bg-white dark:bg-[#14161e] shadow-xs space-y-2.5">
                  <div className="size-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-sm">
                    2
                  </div>
                  <h3 className="text-sm font-bold">2. Press Option + A</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Press{" "}
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 font-mono text-[11px]">
                      Alt+A
                    </kbd>{" "}
                    on any page to open the floating AI assistant widget
                    immediately.
                  </p>
                </div>

                <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-white/[0.07] bg-white dark:bg-[#14161e] shadow-xs space-y-2.5">
                  <div className="size-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-black text-sm">
                    3
                  </div>
                  <h3 className="text-sm font-bold">
                    3. Inspect & Scan Any Element
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Click the crosshair tool to point and click any chart,
                    paragraph, or code snippet directly into your prompt.
                  </p>
                </div>
              </div>

              {/* Core Value Highlights */}
              <div className="p-6 rounded-2xl border border-slate-200/80 dark:border-white/[0.07] bg-white dark:bg-[#14161e] space-y-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Why users love SpectraLens AI
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="flex items-start gap-3">
                    <IoCheckmarkCircle className="size-5 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">Zero API Costs</span>
                      <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                        Works directly with your active web sessions on ChatGPT,
                        Claude, Gemini, Grok, and Perplexity.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <IoCheckmarkCircle className="size-5 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">
                        Adaptive Theme Harmonization
                      </span>
                      <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                        In 'Page Theme' mode, the widget dynamically detects
                        host website colors to blend in naturally.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <IoCheckmarkCircle className="size-5 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">
                        Universal Copy Unblocker
                      </span>
                      <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                        Removes text selection and context menu restrictions on
                        restricted sites.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <IoCheckmarkCircle className="size-5 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">
                        100% On-Device Privacy
                      </span>
                      <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                        All session history and preferences remain purely on
                        your machine.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: USER GUIDE & DOCS */}
          {activeTab === "guide" && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">
                  User Guide & Documentation
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Comprehensive reference for all SpectraLens AI features and
                  capabilities.
                </p>
              </div>

              {/* Search input */}
              <div className="relative">
                <IoSearchOutline className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search guide topics, FAQs, and features..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#14161e] focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100"
                />
              </div>

              {/* Feature 1: Multi-Engine AI Chat */}
              <div className="p-6 rounded-2xl border border-slate-200/80 dark:border-white/[0.07] bg-white dark:bg-[#14161e] space-y-3">
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                  <IoFlashOutline className="size-5" />
                  <h3 className="text-sm font-bold uppercase tracking-wider">
                    1. Multi-Engine AI Querying
                  </h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  SpectraLens AI sends your prompt simultaneously to all
                  selected AI engines. You can toggle providers on/off using the
                  circular model badges in the bottom toolbar.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2">
                  {PROVIDER_LIST.map((p) => {
                    const Icon = p.icon;
                    return (
                      <div
                        key={p.id}
                        className="p-3 rounded-xl border border-slate-100 dark:border-white/[0.05] bg-slate-50 dark:bg-black/20 flex items-center gap-2.5"
                      >
                        <Icon className={`size-5 ${p.color}`} size={20} />
                        <div>
                          <span className="text-xs font-bold block">
                            {p.name}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {p.company}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Feature 2: Visual Element Selector */}
              <div className="p-6 rounded-2xl border border-slate-200/80 dark:border-white/[0.07] bg-white dark:bg-[#14161e] space-y-3">
                <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                  <IoSparkles className="size-5" />
                  <h3 className="text-sm font-bold uppercase tracking-wider">
                    2. Visual Element Scanner & OCR
                  </h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Instead of copying and pasting text manually, trigger the
                  crosshair tool. You can click any paragraph, table cell,
                  image, or code block. SpectraLens AI automatically parses
                  structured DOM elements into Markdown tables or clean code
                  blocks ready for prompt context.
                </p>
              </div>

              {/* Feature 3: FAQ Accordion */}
              <div className="p-6 rounded-2xl border border-slate-200/80 dark:border-white/[0.07] bg-white dark:bg-[#14161e] space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  Frequently Asked Questions
                </h3>
                <div className="space-y-2.5">
                  {filteredFaqs.map((faq, i) => {
                    const isExpanded = expandedFaq === i;
                    return (
                      <div
                        key={i}
                        className="rounded-xl border border-slate-100 dark:border-white/[0.05] bg-slate-50 dark:bg-black/20 overflow-hidden"
                      >
                        <button
                          onClick={() => setExpandedFaq(isExpanded ? null : i)}
                          className="w-full p-3.5 text-left flex items-center justify-between gap-3 focus:outline-none cursor-pointer"
                        >
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {faq.q}
                          </span>
                          {isExpanded ? (
                            <IoChevronUpOutline className="size-4 text-slate-400 shrink-0" />
                          ) : (
                            <IoChevronDownOutline className="size-4 text-slate-400 shrink-0" />
                          )}
                        </button>
                        {isExpanded && (
                          <div className="px-3.5 pb-3.5 pt-0 text-xs text-slate-500 dark:text-slate-400 leading-relaxed border-t border-slate-200/60 dark:border-white/[0.04]">
                            {faq.a}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AI PROVIDERS & AUTH */}
          {activeTab === "providers" && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">AI Models & Connectivity</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  SpectraLens AI bridges directly with your signed-in web
                  sessions without extra API costs.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PROVIDER_LIST.map((p) => {
                  const Icon = p.icon;
                  return (
                    <div
                      key={p.id}
                      className="p-5 rounded-2xl border border-slate-200/80 dark:border-white/[0.07] bg-white dark:bg-[#14161e] shadow-xs flex flex-col justify-between space-y-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="size-10 rounded-xl bg-slate-100 dark:bg-white/[0.06] flex items-center justify-center shrink-0">
                          <Icon className={`size-6 ${p.color}`} size={24} />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold">{p.name}</span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              Supported
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                            {p.desc}
                          </p>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-white/[0.05] flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">
                          Session bridge
                        </span>
                        <button
                          onClick={() => handleOpenExternal(p.loginUrl)}
                          className="flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer focus:outline-none"
                        >
                          Sign In / Open
                          <IoOpenOutline className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: COPY & SETTINGS */}
          {activeTab === "settings" && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">
                  Extension Controls & Copy Settings
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Configure browser powers, copy unblocker rules, and developer
                  modes.
                </p>
              </div>

              {/* Enable Copy Section */}
              <div className="p-6 rounded-2xl border border-slate-200/80 dark:border-white/[0.07] bg-white dark:bg-[#14161e] shadow-xs space-y-4">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <IoCopyOutline className="size-5" />
                  <h3 className="text-sm font-bold uppercase tracking-wider">
                    Universal Copy Unblocker
                  </h3>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-white/[0.05]">
                  <div className="space-y-1 max-w-lg">
                    <span className="text-sm font-bold block">
                      Enable Copy Globally (All Websites)
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 block">
                      Automatically strips anti-selection and anti-copy locks on
                      every website you visit.
                    </span>
                  </div>

                  <ToggleSwitch
                    checked={globalCopy}
                    onChange={handleToggleGlobalCopy}
                    activeColor="bg-emerald-600 shadow-sm shadow-emerald-500/30"
                    title="Toggle Global Copy Unblocker"
                  />
                </div>

                {/* Per-site whitelist */}
                {copyHosts.length > 0 && !globalCopy && (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-white/[0.05] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Active Sites ({copyHosts.length}):
                      </span>
                      <button
                        onClick={handleClearCopyHosts}
                        className="text-xs text-red-500 hover:text-red-700 font-bold cursor-pointer"
                      >
                        Clear All
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                      {copyHosts.map((host) => (
                        <span
                          key={host}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                        >
                          {host}
                          <button
                            onClick={() => handleRemoveHost(host)}
                            className="hover:text-red-500 cursor-pointer font-black"
                            title="Remove"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Developer Mode */}
              <div className="p-6 rounded-2xl border border-slate-200/80 dark:border-white/[0.07] bg-white dark:bg-[#14161e] shadow-xs space-y-4">
                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                  <IoSettingsOutline className="size-5" />
                  <h3 className="text-sm font-bold uppercase tracking-wider">
                    Advanced Developer Mode
                  </h3>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-white/[0.05]">
                  <div className="space-y-1 max-w-lg">
                    <span className="text-sm font-bold block">
                      Verbose Debug Logging
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 block">
                      Logs detailed adapter state and bridge execution to
                      browser DevTools.
                    </span>
                  </div>

                  <ToggleSwitch
                    checked={devMode}
                    onChange={handleToggleDevMode}
                    activeColor="bg-blue-600 shadow-sm shadow-blue-500/30"
                    title="Toggle Developer Mode"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: KEYBOARD SHORTCUTS */}
          {activeTab === "shortcuts" && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Keyboard Shortcuts</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Master fast navigation and control without touching your
                  mouse.
                </p>
              </div>

              <div className="p-6 rounded-2xl border border-slate-200/80 dark:border-white/[0.07] bg-white dark:bg-[#14161e] shadow-xs space-y-4">
                <div className="space-y-3">
                  {[
                    {
                      keys: ["⌥ Option", "A"],
                      label: "Toggle Floating AI Widget",
                      desc: "Opens or hides the in-page SpectraLens AI Assistant immediately.",
                    },
                    {
                      keys: ["Esc"],
                      label: "Dismiss / Close View",
                      desc: "Closes element selector or active modal overlays.",
                    },
                    {
                      keys: ["Enter"],
                      label: "Send Prompt",
                      desc: "Dispatches query to all checked AI engines.",
                    },
                    {
                      keys: ["Shift", "Enter"],
                      label: "Line Break",
                      desc: "Inserts a newline in multi-line prompt mode.",
                    },
                    {
                      keys: ["Ctrl / ⌘", "Shift", "S"],
                      label: "Visual Element Selector",
                      desc: "Activates crosshair inspection scanner.",
                    },
                  ].map((sc, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border border-slate-100 dark:border-white/[0.05] bg-slate-50 dark:bg-black/20 flex items-center justify-between gap-4"
                    >
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold block">
                          {sc.label}
                        </span>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {sc.desc}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {sc.keys.map((k, ki) => (
                          <kbd
                            key={ki}
                            className="px-2 py-1 rounded-md text-xs font-bold font-mono bg-slate-200 dark:bg-white/10 text-slate-800 dark:text-slate-200 border border-slate-300/80 dark:border-white/10 shadow-2xs"
                          >
                            {k}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2 flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">
                    Want to customize global browser shortcuts?
                  </span>
                  <button
                    onClick={() =>
                      handleOpenExternal("chrome://extensions/shortcuts")
                    }
                    className="flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    Open Chrome Shortcut Settings
                    <IoOpenOutline className="size-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: PRIVACY & DATA */}
          {activeTab === "privacy" && (
            <div className="space-y-6 animate-fade-in">
              {/* Hidden file input for importing backup */}
              <input
                type="file"
                ref={fileInputRef}
                accept=".json"
                onChange={handleImportHistory}
                className="hidden"
              />

              {/* Header Title */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold border border-emerald-500/20">
                    <IoShieldCheckmarkOutline className="size-3.5" />
                    <span>100% On-Device Privacy Architecture</span>
                  </div>
                  <h2 className="text-2xl font-black tracking-tight">
                    Privacy & Data Management
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    All prompt histories, settings, and domain rules reside
                    exclusively on your local computer.
                  </p>
                </div>

                <button
                  onClick={refreshStorageStats}
                  className="self-start sm:self-center flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#14161e] hover:bg-slate-50 dark:hover:bg-white/[0.05] text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                  title="Recalculate storage metrics"
                >
                  <IoRefreshOutline className="size-3.5 text-blue-500" />
                  <span>Refresh Storage</span>
                </button>
              </div>

              {/* Import status alert */}
              {importStatus && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fade-in">
                  <IoCheckmarkCircle className="size-4 text-emerald-500 shrink-0" />
                  <span>{importStatus}</span>
                </div>
              )}

              {/* 1. Storage Usage Meter & Analytics */}
              <div className="p-6 rounded-2xl border border-slate-200/80 dark:border-white/[0.07] bg-white dark:bg-[#14161e] shadow-xs space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <IoPieChartOutline className="size-5 text-blue-500" />
                      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                        Local Chrome Storage Quota
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Calculated footprint across conversation history, domain
                      whitelists, and app settings.
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xl font-black text-slate-900 dark:text-white block">
                      {formatBytes(
                        storageBytes ||
                          storageBreakdown.chatBytes +
                            storageBreakdown.settingsBytes,
                      )}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400">
                      of ~10.0 MB Chrome Quota
                    </span>
                  </div>
                </div>

                {/* Visual Storage Progress Bar */}
                <div className="space-y-2">
                  <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-white/[0.06] overflow-hidden flex">
                    <div
                      style={{
                        width: `${Math.max(
                          2,
                          Math.min(
                            100,
                            ((storageBreakdown.chatBytes || 500) /
                              (storageBytes || 1024 * 1024 * 10)) *
                              100 *
                              50,
                          ),
                        )}%`,
                      }}
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500"
                      title="Chat History"
                    />
                    <div
                      style={{
                        width: `${Math.max(
                          2,
                          Math.min(
                            100,
                            ((storageBreakdown.settingsBytes || 500) /
                              (storageBytes || 1024 * 1024 * 10)) *
                              100 *
                              50,
                          ),
                        )}%`,
                      }}
                      className="h-full bg-emerald-500 transition-all duration-500"
                      title="Settings & Whitelists"
                    />
                  </div>

                  {/* Legend */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-medium text-slate-500 dark:text-slate-400 pt-1">
                    <div className="flex items-center gap-4">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="size-2 rounded-full bg-blue-500" />
                        Chat Data (~{formatBytes(storageBreakdown.chatBytes)})
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="size-2 rounded-full bg-emerald-500" />
                        Settings (~{formatBytes(storageBreakdown.settingsBytes)})
                      </span>
                    </div>
                    <span className="text-slate-400 dark:text-slate-500">
                      Zero data synchronized with cloud
                    </span>
                  </div>
                </div>

                {/* 4 Stat Breakdown Metric Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="p-3.5 rounded-xl border border-slate-100 dark:border-white/[0.05] bg-slate-50 dark:bg-black/20 space-y-1">
                    <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                      <IoChatbubblesOutline className="size-4" />
                      <span className="text-[11px] font-bold uppercase">
                        Chats
                      </span>
                    </div>
                    <span className="text-base font-black block text-slate-900 dark:text-white">
                      {storageBreakdown.chatCount}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Sessions recorded
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-100 dark:border-white/[0.05] bg-slate-50 dark:bg-black/20 space-y-1">
                    <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                      <IoDocumentTextOutline className="size-4" />
                      <span className="text-[11px] font-bold uppercase">
                        Chat Size
                      </span>
                    </div>
                    <span className="text-base font-black block text-slate-900 dark:text-white">
                      {formatBytes(storageBreakdown.chatBytes)}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Local payload
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-100 dark:border-white/[0.05] bg-slate-50 dark:bg-black/20 space-y-1">
                    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                      <IoGlobeOutline className="size-4" />
                      <span className="text-[11px] font-bold uppercase">
                        Sites
                      </span>
                    </div>
                    <span className="text-base font-black block text-slate-900 dark:text-white">
                      {copyHosts.includes("*")
                        ? "Global (*)"
                        : storageBreakdown.hostsCount}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Domain rules
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-100 dark:border-white/[0.05] bg-slate-50 dark:bg-black/20 space-y-1">
                    <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
                      <IoServerOutline className="size-4" />
                      <span className="text-[11px] font-bold uppercase">
                        Engine
                      </span>
                    </div>
                    <span className="text-base font-black block text-slate-900 dark:text-white">
                      LevelDB
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Chrome Sandbox
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Core Privacy Guarantees (2x3 Detailed Grid) */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <IoShieldCheckmarkOutline className="size-5 text-emerald-500" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Zero-Telemetry Security Guarantees
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {/* Item 1 */}
                  <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-white/[0.07] bg-white dark:bg-[#14161e] space-y-2">
                    <div className="size-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <IoEyeOffOutline className="size-4" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      Zero Remote Telemetry
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      No background usage tracking, Google Analytics, Sentry
                      logging, or data brokers. 100% of telemetry calls are
                      forbidden by design.
                    </p>
                  </div>

                  {/* Item 2 */}
                  <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-white/[0.07] bg-white dark:bg-[#14161e] space-y-2">
                    <div className="size-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      <IoLockClosedOutline className="size-4" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      Local Device Sandboxing
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      All conversations and preferences are securely encrypted
                      inside your browser’s isolated local storage partition on
                      your physical drive.
                    </p>
                  </div>

                  {/* Item 3 */}
                  <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-white/[0.07] bg-white dark:bg-[#14161e] space-y-2">
                    <div className="size-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <IoGitNetworkOutline className="size-4" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      Direct AI Model Transport
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      Prompts stream directly between your browser and official
                      AI domains (OpenAI, Anthropic, Google, xAI, Perplexity)
                      with zero middleman servers.
                    </p>
                  </div>

                  {/* Item 4 */}
                  <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-white/[0.07] bg-white dark:bg-[#14161e] space-y-2">
                    <div className="size-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                      <IoKeyOutline className="size-4" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      No API Key Exposure
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      SpectraLens AI never asks for or stores sensitive paid API
                      secret keys. It operates seamlessly on your existing
                      active web session cookies.
                    </p>
                  </div>

                  {/* Item 5 */}
                  <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-white/[0.07] bg-white dark:bg-[#14161e] space-y-2">
                    <div className="size-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                      <IoScanOutline className="size-4" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      Targeted DOM Inspection
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      The visual element scanner only captures DOM elements you
                      deliberately click on. It never monitors keystrokes or
                      background page contents.
                    </p>
                  </div>

                  {/* Item 6 */}
                  <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-white/[0.07] bg-white dark:bg-[#14161e] space-y-2">
                    <div className="size-8 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                      <IoFlameOutline className="size-4" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      Instant Data Erasure
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      Full control over your data lifecycle. Wipe individual
                      conversations or purge all storage keys in one single click
                      with zero traces left.
                    </p>
                  </div>
                </div>
              </div>

              {/* 3. Data Backup, Export & Restore Management Tools */}
              <div className="p-6 rounded-2xl border border-slate-200/80 dark:border-white/[0.07] bg-white dark:bg-[#14161e] shadow-xs space-y-5">
                <div className="flex items-center gap-2">
                  <IoFolderOpenOutline className="size-5 text-indigo-500" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Backup, Export & Data Control
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {/* Export JSON */}
                  <button
                    onClick={handleExportHistory}
                    className="p-4 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-50/70 dark:bg-black/20 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all text-left space-y-2 cursor-pointer group focus:outline-none"
                  >
                    <div className="flex items-center justify-between">
                      <div className="size-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <IoDownloadOutline className="size-4" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                        .JSON
                      </span>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        Full Backup Export
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Download raw JSON database for backup or migrations.
                      </p>
                    </div>
                  </button>

                  {/* Export Markdown */}
                  <button
                    onClick={handleExportHistoryMarkdown}
                    className="p-4 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-50/70 dark:bg-black/20 hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-all text-left space-y-2 cursor-pointer group focus:outline-none"
                  >
                    <div className="flex items-center justify-between">
                      <div className="size-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <IoDocumentTextOutline className="size-4" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                        .MD
                      </span>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        Markdown Document
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Readable archive for Obsidian, Notion, or personal
                        notes.
                      </p>
                    </div>
                  </button>

                  {/* Import JSON */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-4 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-50/70 dark:bg-black/20 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 transition-all text-left space-y-2 cursor-pointer group focus:outline-none"
                  >
                    <div className="flex items-center justify-between">
                      <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <IoCloudUploadOutline className="size-4" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        RESTORE
                      </span>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        Import & Merge Backup
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Restore conversations from a previous JSON export.
                      </p>
                    </div>
                  </button>
                </div>

                {/* Danger Zone: Clear History & Factory Reset */}
                <div className="pt-3 border-t border-slate-100 dark:border-white/[0.05] flex flex-wrap items-center justify-between gap-3">
                  <button
                    onClick={handleClearAllHistory}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white text-xs font-bold transition-all cursor-pointer focus:outline-none"
                  >
                    <IoTrashOutline className="size-4" />
                    <span>Clear Chat History Only</span>
                  </button>

                  <button
                    onClick={handleFactoryReset}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-300 dark:border-red-800/60 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white text-xs font-bold transition-all cursor-pointer focus:outline-none"
                  >
                    <IoWarningOutline className="size-4" />
                    <span>Factory Reset All Extension Data</span>
                  </button>
                </div>
              </div>

              {/* 4. Live Storage Keys Inspector (Auditable Accordion) */}
              <div className="rounded-2xl border border-slate-200/80 dark:border-white/[0.07] bg-white dark:bg-[#14161e] shadow-xs overflow-hidden">
                <button
                  onClick={() => setShowStorageAudit(!showStorageAudit)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 focus:outline-none cursor-pointer hover:bg-slate-50/50 dark:hover:bg-white/[0.02]"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="size-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                      <IoFingerPrintOutline className="size-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                        Live Storage Keys Audit & Transparency Inspector
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        {storageKeysList.length} active keys currently stored in
                        Chrome LevelDB
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                    <span>
                      {showStorageAudit ? "Hide Inspector" : "View Keys"}
                    </span>
                    {showStorageAudit ? (
                      <IoChevronUpOutline className="size-4" />
                    ) : (
                      <IoChevronDownOutline className="size-4" />
                    )}
                  </div>
                </button>

                {showStorageAudit && (
                  <div className="p-5 pt-0 border-t border-slate-100 dark:border-white/[0.05] space-y-3">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-white/[0.06] text-[11px] font-bold text-slate-400 uppercase">
                            <th className="py-2.5 pr-4">Storage Key</th>
                            <th className="py-2.5 px-4">Category</th>
                            <th className="py-2.5 px-4">Estimated Size</th>
                            <th className="py-2.5 pl-4">Purpose</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                          {storageKeysList.map((item, idx) => (
                            <tr
                              key={idx}
                              className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]"
                            >
                              <td className="py-2.5 pr-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                                {item.key}
                              </td>
                              <td className="py-2.5 px-4">
                                <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/[0.06] text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                                  {item.category}
                                </span>
                              </td>
                              <td className="py-2.5 px-4 text-slate-500 font-mono text-[11px]">
                                {formatBytes(item.size)}
                              </td>
                              <td className="py-2.5 pl-4 text-slate-500 dark:text-slate-400 text-[11px]">
                                {item.purpose}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 7: UNINSTALL & FEEDBACK SURVEY */}
          {activeTab === "uninstall" && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">
                  Offboarding & Feedback Survey
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Help us improve SpectraLens AI. Tell us what we can do better!
                </p>
              </div>

              {feedbackSubmitted ? (
                <div className="p-8 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-center space-y-4">
                  <IoCheckmarkCircle className="size-12 mx-auto text-emerald-500" />
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold">
                      Thank you for your feedback!
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto">
                      Your feedback has been saved locally. Would you also like to dispatch it directly to GitHub or email?
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    <button
                      onClick={() => handleOpenExternal(getFeedbackGithubUrl())}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold shadow-md hover:opacity-90 cursor-pointer focus:outline-none"
                    >
                      <IoOpenOutline className="size-4" />
                      <span>Publish to GitHub Issues</span>
                    </button>

                    <button
                      onClick={() => handleOpenExternal(getFeedbackMailtoUrl())}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-md hover:bg-blue-700 cursor-pointer focus:outline-none"
                    >
                      <IoSendOutline className="size-4" />
                      <span>Send via Email</span>
                    </button>

                    <button
                      onClick={() => {
                        setFeedbackSubmitted(false);
                        setFeedbackReason("");
                        setFeedbackText("");
                      }}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-300 dark:hover:bg-white/20 cursor-pointer focus:outline-none"
                    >
                      <span>Submit Another Feedback</span>
                    </button>
                  </div>
                </div>
              ) : (
                <form
                  onSubmit={handleSubmitFeedback}
                  className="p-6 rounded-2xl border border-slate-200/80 dark:border-white/[0.07] bg-white dark:bg-[#14161e] shadow-xs space-y-5"
                >
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                      Why are you giving feedback or uninstalling?
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {[
                        "Missing a specific AI model or feature",
                        "Experienced an issue with an AI provider tab",
                        "Floating widget was difficult to use",
                        "Just testing out extensions",
                        "Other reason",
                      ].map((reason) => (
                        <label
                          key={reason}
                          className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                            feedbackReason === reason
                              ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-semibold"
                              : "border-slate-200/70 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02] text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          <input
                            type="radio"
                            name="feedbackReason"
                            value={reason}
                            checked={feedbackReason === reason}
                            onChange={(e) => setFeedbackReason(e.target.value)}
                            className="text-blue-600 focus:ring-blue-500"
                          />
                          <span>{reason}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      Additional Suggestions or Bug Details (Optional):
                    </label>
                    <textarea
                      rows={4}
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      placeholder="Tell us what feature you'd like to see or what we could improve..."
                      className="w-full p-3 rounded-xl text-xs border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-black/20 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100 placeholder-slate-400"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleOpenExternal(
                          "https://github.com/elsesourav/spectralens-ai/issues/new",
                        )
                      }
                      className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                    >
                      <IoOpenOutline className="size-3.5" />
                      Open GitHub Issue
                    </button>

                    <button
                      type="submit"
                      disabled={!feedbackReason && !feedbackText}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus:outline-none"
                    >
                      <IoSendOutline className="size-3.5" />
                      Submit Feedback
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
