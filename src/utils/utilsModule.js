/* eslint-disable no-undef */
"use strict";

// Chrome Extension Utilities for React Components
// Provides a clean interface to Chrome extension APIs

const hasChrome =
   typeof chrome !== "undefined" && typeof chrome.runtime !== "undefined";

const KEYS = {
   SETTINGS: "Ai-Display-Settings",
   CONTROLS: "Ai-Display-Controls",
   HISTORY: "Ai-Display-History",
   ALWAYS_ACTIVE_HOSTS: "alwaysActiveHosts",
   ENABLE_COPY_HOSTS: "enableCopyHosts",
   MENU_HOSTS: "menuHosts",
   WIDGET_HINT_SEEN: "spectralens_widget_hint_seen",
};

/* ----------- Developer Mode (Error Suppression) ----------- */

let __isDevMode = false;

if (hasChrome && chrome.storage?.local) {
   // Initialize devMode state
   chrome.storage.local.get([KEYS.CONTROLS]).then((res) => {
      if (!res) return;
      const parsed =
         typeof res[KEYS.CONTROLS] === "string"
            ? JSON.parse(res[KEYS.CONTROLS])
            : res[KEYS.CONTROLS];
      __isDevMode = parsed?.devMode || false;
   });

   // Listen for settings changes
   chrome.storage.onChanged.addListener((changes) => {
      if (changes[KEYS.CONTROLS]) {
         const parsed =
            typeof changes[KEYS.CONTROLS].newValue === "string"
               ? JSON.parse(changes[KEYS.CONTROLS].newValue)
               : changes[KEYS.CONTROLS].newValue;
         __isDevMode = parsed?.devMode || false;
      }
   });
}

// Override console.error globally
const originalConsoleError = console.error;
console.error = function (...args) {
   if (__isDevMode) {
      originalConsoleError.apply(console, args);
   }
};

/* ----------- General Utilities ----------- */

/** Returns a promise that resolves after `ms` milliseconds */
function wait(ms) {
   return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Creates a debounced version of `func` with dynamic delay from `delayFn` */
const debounce = (func, delayFn) => {
   let debounceTimer;
   return function (...args) {
      const context = this;
      const delay = delayFn();
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => func.apply(context, args), delay);
   };
};

/* ----------- Tab Utilities ----------- */

/** Returns the currently active tab in the focused window */
function getActiveTab() {
   return new Promise((resolve) => {
      if (!hasChrome || !chrome.tabs?.query) {
         resolve(null);
         return;
      }
      chrome.tabs.query(
         { currentWindow: true, active: true },
         (tabs) => resolve(tabs?.[0] ?? null)
      );
   });
}

/* ----------- Chrome Storage Sync ----------- */

function chromeStorageSet(key, value, callback) {
   return new Promise((resolve) => {
      if (!hasChrome || !chrome.storage?.sync?.set) {
         callback && callback();
         resolve();
         return;
      }
      chrome.storage.sync.set({ [key]: value }, () => {
         if (chrome.runtime.lastError) {
            console.error("Error setting item:", chrome.runtime.lastError);
         } else if (callback) {
            callback();
         }
         resolve();
      });
   });
}

function chromeStorageGet(key, callback = () => {}) {
   return new Promise((resolve) => {
      if (!hasChrome || !chrome.storage?.sync?.get) {
         callback(undefined);
         resolve(null);
         return;
      }
      chrome.storage.sync.get([key], (result) => {
         if (chrome?.runtime?.lastError) {
            console.error("Error getting item:", chrome.runtime.lastError);
            resolve(null);
         } else {
            callback(result[key]);
            resolve(result[key]);
         }
      });
   });
}

/* ----------- Chrome Storage Local ----------- */

/**
 * Set a value in chrome.storage.local.
 * NOTE: Values are JSON.stringify'd before storage.
 */
function chromeStorageSetLocal(key, value, callback) {
   return new Promise((resolve) => {
      if (!hasChrome || !chrome.storage?.local?.set) {
         callback && callback(false);
         resolve();
         return;
      }
      const serialized = JSON.stringify(value);
      chrome.storage.local.set({ [key]: serialized }, () => {
         if (chrome.runtime.lastError) {
            console.error("Error setting item:", chrome.runtime.lastError);
         } else if (callback) {
            callback(true);
         }
         resolve();
      });
   });
}

/**
 * Get a value from chrome.storage.local.
 * NOTE: Values are automatically JSON.parse'd on retrieval.
 */
function chromeStorageGetLocal(key, callback) {
   return new Promise((resolve) => {
      if (!hasChrome || !chrome.storage?.local?.get) {
         callback && callback(null);
         resolve(null);
         return;
      }
      chrome.storage.local.get([key], (result) => {
         if (chrome?.runtime?.lastError) {
            console.error("Error getting item:", chrome.runtime.lastError);
            callback && callback(null);
            resolve(null);
         } else {
            let parsed = null;
            if (typeof result[key] === "string") {
               try {
                  parsed = JSON.parse(result[key]);
               } catch {
                  parsed = result[key];
               }
            } else if (result[key] !== undefined) {
               parsed = result[key];
            }
            callback && callback(parsed);
            resolve(parsed);
         }
      });
   });
}

function chromeStorageRemoveLocal(key) {
   return new Promise((resolve) => {
      if (!hasChrome || !chrome.storage?.local?.remove) {
         resolve();
         return;
      }
      chrome.storage.local.remove(key, () => {
         if (chrome.runtime.lastError) {
            console.error("Error removing item:", chrome.runtime.lastError);
         }
         resolve();
      });
   });
}

/* ----------- Messaging Utilities ----------- */

/** Send a message via chrome.runtime to the background/service worker */
function runtimeSendMessage(type, message, callback) {
   try {
      if (!hasChrome || !chrome.runtime?.sendMessage || !chrome.runtime?.id) {
         if (typeof message === "function") message(undefined);
         else callback && callback(undefined);
         return;
      }
      if (typeof message === "function") {
         chrome.runtime.sendMessage({ type }, (response) => {
            const err = chrome.runtime?.lastError;
            if (err && __isDevMode) {
               console.warn("Message Error:", err.message);
            }
            message(response);
         });
      } else {
         chrome.runtime.sendMessage({ ...message, type }, (response) => {
            const err = chrome.runtime?.lastError;
            if (err && __isDevMode) {
               console.warn("Message Error:", err.message);
            }
            callback && callback(response);
         });
      }
   } catch {
      if (typeof message === "function") message(undefined);
      else callback && callback(undefined);
   }
}

/** Listen for a specific message type via chrome.runtime */
function runtimeOnMessage(type, callback) {
   try {
      if (!hasChrome || !chrome.runtime?.onMessage?.addListener || !chrome.runtime?.id) {
         return;
      }
      chrome.runtime.onMessage.addListener((message, sender, response) => {
         if (type === message?.type) {
            const result = callback(message, sender, response);
            if (result === true || (result && typeof result.then === "function")) {
               return true;
            }
         }
         return false;
      });
   } catch {
      // Extension context invalidated gracefully ignored
   }
}

/** Send a message to a specific tab */
function tabSendMessage(tabId, type, message, callback) {
   if (!hasChrome || !chrome.tabs?.sendMessage || !chrome.runtime?.id) {
      if (!chrome.runtime?.id && __isDevMode) {
         originalConsoleError.call(console, "Message Error: Extension context invalidated.");
      }
      if (typeof message === "function") message(undefined);
      else callback && callback(undefined);
      return;
   }
   if (typeof message === "function") {
      chrome.tabs.sendMessage(tabId, { type }, (response) => {
         const err = chrome.runtime.lastError;
         if (err && __isDevMode) {
            originalConsoleError.call(console, "Message Error:", err.message);
         }
         message(response);
      });
   } else {
      chrome.tabs.sendMessage(tabId, { ...message, type }, (response) => {
         const err = chrome.runtime.lastError;
         if (err && __isDevMode) {
            originalConsoleError.call(console, "Message Error:", err.message);
         }
         callback && callback(response);
      });
   }
}

/** Post a message to a window (for iframe <-> content script communication) */
function pagePostMessage(type, data, contentWindow = window) {
   contentWindow?.postMessage({ type, data }, "*");
}

/** Listen for postMessage events of a specific type */
function pageOnMessage(type, callback) {
   window.addEventListener("message", (event) => {
      if (event.data.type === type) {
         callback(event.data.data, event);
      }
   });
}

/* ----------- Export ----------- */

/**
 * Safely sanitizes an HTML string using DOMParser to ensure no script execution,
 * inline handlers, javascript: URLs, or dangerous elements are rendered.
 */
function sanitizeHtml(htmlString) {
   if (typeof htmlString !== "string") return "";
   if (!htmlString.trim()) return "";

   try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlString, "text/html");

      const disallowedTags = [
         "SCRIPT", "IFRAME", "OBJECT", "EMBED", "FORM", "INPUT", "BUTTON",
         "SELECT", "TEXTAREA", "NOSCRIPT", "STYLE", "LINK", "META", "BASE"
      ];

      // Remove forbidden tags
      const elements = doc.querySelectorAll("*");
      elements.forEach((el) => {
         if (disallowedTags.includes(el.tagName)) {
            el.remove();
            return;
         }

         // Remove all event handlers (onclick, onload, etc.) and dangerous attributes
         Array.from(el.attributes).forEach((attr) => {
            const attrName = attr.name.toLowerCase();
            const attrVal = attr.value.toLowerCase().trim();

            if (
               attrName.startsWith("on") ||
               attrVal.startsWith("javascript:") ||
               attrVal.startsWith("data:text/html")
            ) {
               el.removeAttribute(attr.name);
            }
         });
      });

      return doc.body.innerHTML;
   } catch {
      return "";
   }
}

/**
 * Converts a DOM element or HTML string into clean, beautiful GitHub Flavored Markdown (GFM).
 * Handles code blocks with languages, tables, nested lists, KaTeX math, blockquotes,
 * headings, task list checkboxes, strikethrough, and inline formatting.
 *
 * @param {Element|string} rootNode - DOM node or HTML string
 * @returns {string} Clean Markdown formatted string
 */
function domToMarkdown(rootNode) {
   if (!rootNode) return "";

   function serializeNode(node, depth = 0, listType = null, listIndex = 1) {
      if (!node) return "";

      // 1. Text Node
      if (node.nodeType === Node.TEXT_NODE) {
         return node.nodeValue;
      }

      // 2. Ignore non-element nodes (comments, etc.)
      if (node.nodeType !== Node.ELEMENT_NODE) {
         return "";
      }

      const tag = node.tagName.toLowerCase();

      // Ignore scripts, styles, SVGs, copy buttons, tooltips, dialogs
      if (
         [
            "script", "style", "noscript", "svg", "button",
            "mat-icon", "use", "path", "dialog", "form"
         ].includes(tag) ||
         node.getAttribute("aria-hidden") === "true" ||
         node.getAttribute("role") === "dialog" ||
         node.getAttribute("role") === "button" ||
         node.getAttribute("role") === "toolbar" ||
         node.classList?.contains("copy-button") ||
         node.classList?.contains("action-button") ||
         node.classList?.contains("screen-reader-only") ||
         node.classList?.contains("sr-only") ||
         node.classList?.contains("hidden") ||
         node.style?.display === "none" ||
         node.style?.visibility === "hidden"
      ) {
         return "";
      }

      // KaTeX / MathML formula handling
      if (node.classList?.contains("katex-mathml") || node.classList?.contains("katex-html")) {
         if (node.classList?.contains("katex-mathml")) {
            const annotation = node.querySelector("annotation");
            if (annotation) {
               const isDisplay = node.closest(".katex-display") !== null;
               return isDisplay
                  ? `\n\n$$${annotation.textContent.trim()}$$\n\n`
                  : `$${annotation.textContent.trim()}$`;
            }
         } else {
            if (node.parentElement?.querySelector(".katex-mathml")) return "";
         }
      }

      // Code blocks: <pre><code>
      if (tag === "pre") {
         const codeEl = node.querySelector("code") || node;
         const langMatch = (codeEl.className || "").match(/language-([a-z0-9_-]+)/i);
         const lang = langMatch ? langMatch[1] : "";
         const codeContent = (codeEl.textContent || "").replace(/^\n+|\n+$/g, "");
         return `\n\n\`\`\`${lang}\n${codeContent}\n\`\`\`\n\n`;
      }

      // Recursive children helper
      const processChildren = () => {
         let result = "";
         let itemIdx = 1;
         for (const child of node.childNodes) {
            result += serializeNode(
               child,
               tag === "ul" || tag === "ol" ? depth + 1 : depth,
               tag === "ol" ? "ol" : tag === "ul" ? "ul" : listType,
               itemIdx
            );
            if (child.nodeType === Node.ELEMENT_NODE && child.tagName.toLowerCase() === "li") {
               itemIdx++;
            }
         }
         return result;
      };

      switch (tag) {
         case "h1":
            return `\n\n# ${processChildren().trim()}\n\n`;
         case "h2":
            return `\n\n## ${processChildren().trim()}\n\n`;
         case "h3":
            return `\n\n### ${processChildren().trim()}\n\n`;
         case "h4":
            return `\n\n#### ${processChildren().trim()}\n\n`;
         case "h5":
            return `\n\n##### ${processChildren().trim()}\n\n`;
         case "h6":
            return `\n\n###### ${processChildren().trim()}\n\n`;
         case "p":
            return `\n\n${processChildren().trim()}\n\n`;
         case "br":
            return "\n";
         case "hr":
            return "\n\n---\n\n";
         case "strong":
         case "b": {
            const txt = processChildren().trim();
            return txt ? `**${txt}**` : "";
         }
         case "em":
         case "i": {
            const txt = processChildren().trim();
            return txt ? `*${txt}*` : "";
         }
         case "del":
         case "s":
         case "strike": {
            const txt = processChildren().trim();
            return txt ? `~~${txt}~~` : "";
         }
         case "mark": {
            const txt = processChildren().trim();
            return txt ? `==${txt}==` : "";
         }
         case "code": {
            if (node.parentElement && node.parentElement.tagName.toLowerCase() === "pre") {
               return processChildren();
            }
            const txt = processChildren().trim();
            return txt ? `\`${txt}\`` : "";
         }
         case "blockquote": {
            const content = processChildren().trim().replace(/\n/g, "\n> ");
            return `\n\n> ${content}\n\n`;
         }
         case "ul":
         case "ol": {
            const listContent = processChildren().trim();
            return depth === 1 ? `\n\n${listContent}\n\n` : `\n${listContent}`;
         }
         case "li": {
            const indent = "  ".repeat(Math.max(0, depth - 1));
            const prefix = listType === "ol" ? `${listIndex}. ` : "- ";

            const checkbox = node.querySelector('input[type="checkbox"]');
            let checkPrefix = "";
            if (checkbox) {
               checkPrefix = checkbox.checked ? "[x] " : "[ ] ";
            }

            const childContent = processChildren().trim();
            return `\n${indent}${prefix}${checkPrefix}${childContent}`;
         }
         case "table": {
            return `\n\n${parseTableToMarkdown(node)}\n\n`;
         }
         case "a": {
            const href = node.getAttribute("href");
            const linkText = processChildren().trim();
            if (!href || href.startsWith("javascript:")) return linkText;
            return `[${linkText || href}](${href})`;
         }
         default:
            return processChildren();
      }
   }

   function parseTableToMarkdown(tableEl) {
      const rows = Array.from(tableEl.querySelectorAll("tr"));
      if (rows.length === 0) return "";

      const tableMatrix = [];
      rows.forEach((row) => {
         const cells = Array.from(row.querySelectorAll("th, td")).map((c) =>
            c.textContent.trim().replace(/\|/g, "\\|").replace(/\n+/g, " ")
         );
         if (cells.length > 0) {
            tableMatrix.push(cells);
         }
      });

      if (tableMatrix.length === 0) return "";

      const maxCols = Math.max(...tableMatrix.map((r) => r.length));
      const normalized = tableMatrix.map((r) => {
         const copy = [...r];
         while (copy.length < maxCols) copy.push("");
         return copy;
      });

      const header = `| ${normalized[0].join(" | ")} |`;
      const separator = `| ${normalized[0].map(() => "---").join(" | ")} |`;
      const bodyRows = normalized
         .slice(1)
         .map((r) => `| ${r.join(" | ")} |`)
         .join("\n");

      return `${header}\n${separator}${bodyRows ? `\n${bodyRows}` : ""}`;
   }

   let rawMd = "";
   if (typeof rootNode === "string") {
      const parser = new DOMParser();
      const doc = parser.parseFromString(rootNode, "text/html");
      rawMd = serializeNode(doc.body);
   } else {
      rawMd = serializeNode(rootNode);
   }

   let cleaned = rawMd
      .replace(/\r\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n");

   // Strip AI assistant footer noise, feedback forms, share links & legal boilerplate
   cleaned = cleaned
      .replace(/Quick results from the web[\s\S]*?(?=\n\n|\*\*[A-Z]|Hello|Hi\b|I am|Sure|Here|Please|$)/i, "")
      .replace(/#*\s*Share public link[\s\S]*$/i, "")
      .replace(/This public link shares a thread[\s\S]*$/i, "")
      .replace(/Facebook\s+Gmail\s+X\s+Reddit\s+WhatsApp[\s\S]*$/i, "")
      .replace(/Saved time\s*Clear\s*Helpful[\s\S]*$/i, "")
      .replace(/(?:Saved time|Clear|Helpful|Comprehensive|Incorrect|Inappropriate|Not working|Unhelpful){2,}[\s\S]*$/i, "")
      .replace(/A copy of this chat will be included[\s\S]*$/i, "")
      .replace(/Thanks for letting us know[\s\S]*$/i, "")
      .replace(/Google may use account and system data[\s\S]*$/i, "")
      .replace(/For legal issues,\s*\[make a legal removal request\][\s\S]*$/i, "");

   return cleaned.trim();
}

/**
 * Converts formatted HTML into clean, structured Markdown text.
 */
function htmlToMarkdown(html) {
   return domToMarkdown(html);
}

/**
 * Converts clean Markdown text into secure styled HTML for rendering.
 */
function markdownToHtml(md) {
   if (!md || typeof md !== "string") return "";
   if (/<(?:div|p|h[1-6]|ul|ol|li|table|pre)[^>]*>/i.test(md)) {
      return md; // Already HTML
   }

   let html = md
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

   // Code blocks (fenced)
   html = html.replace(/```([a-z0-9_-]*)\n([\s\S]*?)```/g, (_, lang, code) => {
      return `<pre class="bg-slate-900 text-slate-100 p-3 rounded-xl overflow-x-auto my-2 text-xs font-mono"><code class="language-${lang}">${code}</code></pre>`;
   });

   // Tables
   html = html.replace(/(?:^|\n)(\|.+?\|\n\|[\s\-:|]+\|\n(?:\|.+?\|\n?)+)/g, (match) => {
      const lines = match.trim().split("\n");
      if (lines.length < 2) return match;
      const headers = lines[0]
         .split("|")
         .filter((_, i, arr) => i > 0 && i < arr.length - 1)
         .map((h) => `<th class="border border-slate-300 dark:border-slate-700 px-3 py-1.5 bg-slate-100 dark:bg-white/[0.06] text-xs font-bold">${h.trim()}</th>`)
         .join("");
      const rows = lines.slice(2).map((r) => {
         const cells = r
            .split("|")
            .filter((_, i, arr) => i > 0 && i < arr.length - 1)
            .map((c) => `<td class="border border-slate-300 dark:border-slate-700 px-3 py-1 text-xs">${c.trim()}</td>`)
            .join("");
         return `<tr>${cells}</tr>`;
      }).join("");
      return `<div class="overflow-x-auto my-2"><table class="w-full border-collapse border border-slate-300 dark:border-slate-700 text-left"><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table></div>`;
   });

   // Blockquotes
   html = html.replace(/(?:^|\n)>[ ]?(.*?)(?=\n[^\n>]|\n*$)/g, '<blockquote class="border-l-4 border-blue-500 pl-3 py-1 my-2 italic text-slate-600 dark:text-slate-300">$1</blockquote>');

   // Headings
   html = html.replace(/^### (.*?)$/gm, '<h3 class="text-sm font-bold text-slate-900 dark:text-white mt-3 mb-1">$1</h3>');
   html = html.replace(/^## (.*?)$/gm, '<h2 class="text-base font-bold text-slate-900 dark:text-white mt-3.5 mb-1.5">$1</h2>');
   html = html.replace(/^# (.*?)$/gm, '<h1 class="text-lg font-extrabold text-slate-900 dark:text-white mt-4 mb-2">$1</h1>');

   // Inline styles
   html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900 dark:text-white">$1</strong>');
   html = html.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');
   html = html.replace(/~~(.*?)~~/g, '<del class="line-through opacity-70">$1</del>');
   html = html.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-white/[0.08] text-blue-600 dark:text-blue-400 font-mono text-[11px]">$1</code>');

   // Links
   html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 dark:text-blue-400 underline hover:text-blue-700 font-medium">$1</a>');

   // Lists
   html = html.replace(/^\s*-\s+(.*?)$/gm, '<li class="ml-4 list-disc text-xs leading-relaxed">$1</li>');
   html = html.replace(/^\s*(\d+)\.\s+(.*?)$/gm, '<li class="ml-4 list-decimal text-xs leading-relaxed">$2</li>');

   // Paragraphs & newlines
   html = html.replace(/\n\n+/g, '<div class="my-2"></div>');
   html = html.replace(/\n/g, '<br/>');

   return html;
}

const extensionUtils = {
   // Messaging
   runtimeSendMessage,
   runtimeOnMessage,
   tabSendMessage,
   pagePostMessage,
   pageOnMessage,

   // Tab utilities
   getActiveTab,

   // Storage
   chromeStorageSet,
   chromeStorageGet,
   chromeStorageSetLocal,
   chromeStorageGetLocal,
   chromeStorageRemoveLocal,

   // General utilities
   wait,
   debounce,
   sanitizeHtml,
   domToMarkdown,
   htmlToMarkdown,
   markdownToHtml,

   // Constants
   KEYS,
};

if (typeof window !== "undefined") {
   window.extensionUtils = extensionUtils;
}

export default extensionUtils;
