"use strict";

const KEYS = {
   SETTINGS: "Ai-Display-Settings",
   CONTROLS: "Ai-Display-Controls",
   HISTORY: "Ai-Display-History",
   ALWAYS_ACTIVE_HOSTS: "alwaysActiveHosts",
   ENABLE_COPY_HOSTS: "enableCopyHosts",
   MENU_HOSTS: "menuHosts",
};

/* ----------- Developer Mode (Error Suppression) ----------- */

let __isDevMode = false;

if (typeof chrome !== "undefined" && chrome.storage?.local) {
   // Initialize devMode state
   chrome.storage.local.get([KEYS.CONTROLS]).then((res) => {
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

/* ----------- Tab Utilities ----------- */

/** Returns the currently active tab in the focused window */
function getActiveTab() {
   return new Promise((resolve) => {
      chrome.tabs.query(
         { currentWindow: true, active: true },
         (tabs) => resolve(tabs[0])
      );
   });
}

/* ----------- Messaging Utilities ----------- */

/** Send a message via chrome.runtime to the background/service worker */
function runtimeSendMessage(type, message, callback) {
   try {
      if (!chrome.runtime?.id) {
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
      if (!chrome.runtime?.id) {
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
   if (!chrome.runtime?.id) {
      if (__isDevMode) {
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

/* ----------- Chrome Storage Utilities ----------- */

/** Set a value in chrome.storage.sync */
function chromeStorageSet(key, value, callback) {
   return new Promise((resolve) => {
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

/** Get a value from chrome.storage.sync */
function chromeStorageGet(key, callback = () => {}) {
   return new Promise((resolve) => {
      chrome.storage.sync.get([key], (result) => {
         if (chrome.runtime.lastError) {
            console.error("Error getting item:", chrome.runtime.lastError);
         } else {
            callback(result[key]);
            resolve(result[key]);
         }
      });
   });
}

/**
 * Set a value in chrome.storage.local.
 * NOTE: Values are JSON.stringify'd before storage.
 */
function chromeStorageSetLocal(key, value, callback) {
   const serialized = JSON.stringify(value);
   chrome.storage.local.set({ [key]: serialized }).then(() => {
      if (chrome.runtime.lastError) {
         console.error("Error setting item:", chrome.runtime.lastError);
      } else if (callback) {
         callback(true);
      }
   });
}

/**
 * Get a value from chrome.storage.local.
 * NOTE: Values are automatically JSON.parse'd on retrieval.
 */
function chromeStorageGetLocal(key, callback) {
   return new Promise((resolve) => {
      chrome.storage.local.get([key]).then((result) => {
         if (chrome.runtime.lastError) {
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

/** Remove a value from chrome.storage.local */
function chromeStorageRemoveLocal(key) {
   chrome.storage.local.remove(key).then(() => {
      if (chrome.runtime.lastError) {
         console.error("Error removing item:", chrome.runtime.lastError);
      }
   });
}

/* ----------- Script Injection Utilities ----------- */

/** Inject a JavaScript file into a document */
function injectScript(src, type, doc = document || document.documentElement) {
   const script = document.createElement("script");
   script.src = chrome.runtime.getURL(src);
   if (type) script.type = type;
   script.onload = () => script.remove();
   doc.appendChild(script);
}

/** Inject a CSS file into a document */
function injectCSSFile(
   src,
   ref = "stylesheet",
   type = "text/css",
   crossorigin,
   doc = document || document.documentElement
) {
   const link = document.createElement("link");
   if (ref) link.rel = ref;
   if (type) link.type = "text/css";
   if (crossorigin) link.setAttribute("crossorigin", "anonymous");
   link.href = chrome.runtime.getURL(src);
   doc.appendChild(link);
}

/* ----------- Scripting API Utilities ----------- */

/** Execute a function in a tab's context */
function executeScript(tabId, func, ...args) {
   if (!chrome.runtime?.id || !tabId) {
      if (__isDevMode) {
         originalConsoleError.call(console, "Script Error: Extension context invalidated.");
      }
      return;
   }
   try {
      chrome.scripting
         .executeScript({ target: { tabId }, func, args: [...args] }, () => {
            void chrome.runtime.lastError;
         })
         ?.catch?.(() => {});
   } catch {
      // Ignore if tab is closed or invalid
   }
}

/** Execute a function in a tab's context and return the result */
function executeScriptReturn(tabId, func, _return = (r) => r, args = []) {
   if (!chrome.runtime?.id || !tabId) {
      if (__isDevMode) {
         originalConsoleError.call(console, "Script Error: Extension context invalidated.");
      }
      if (_return) _return(undefined);
      return;
   }
   try {
      chrome.scripting
         .executeScript({ target: { tabId }, func, args }, (results) => {
            void chrome.runtime.lastError;
            if (_return) _return(results);
         })
         ?.catch?.(() => {
            if (_return) _return(undefined);
         });
   } catch {
      if (_return) _return(undefined);
   }
}

/* ----------- General Utilities ----------- */

/** Returns a promise that resolves after `ms` milliseconds */
function wait(ms) {
   return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Creates a debounced version of `func` with dynamic delay */
const debounce = (func, delayFn) => {
   let debounceTimer;
   return function (...args) {
      const context = this;
      const delay = delayFn();
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => func.apply(context, args), delay);
   };
};

/** Check if a tab is an internal browser page (chrome://, edge://, about://) */
function isInternalPage(tab) {
   return /^(chrome|edge|about):\/\//.test(tab.url);
}

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
 * Converts clean Markdown text (or legacy HTML) into secure, responsive, lightweight styled HTML for rendering.
 */
function markdownToHtml(md) {
   if (!md || typeof md !== "string") return "";

   let source = md;

   // Only convert legacy pure HTML if the entire payload is an HTML container and not markdown
   const trimmed = source.trim();
   if (
      !source.includes("```") &&
      (trimmed.startsWith("<div") ||
         trimmed.startsWith("<section") ||
         trimmed.startsWith("<article") ||
         trimmed.startsWith("<p"))
   ) {
      source = domToMarkdown(source);
   }

   // 1. Preserve and protect fenced code blocks (```lang\n...```) FIRST
   const codeBlocks = [];
   source = source.replace(/(?:^|\n)```([a-zA-Z0-9_#+.-]*)\s*\n?([\s\S]*?)```(?:\n|$)/g, (match, lang, code) => {
      const idx = codeBlocks.length;
      const cleanLang = (lang || "").trim().toLowerCase();
      const rawCode = (code !== undefined ? code : "").replace(/^\n+|\n+$/g, "");
      const escapedCode = rawCode
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;");

      const langHeader = cleanLang
         ? `<div class="flex items-center justify-between px-3 py-1.5 bg-slate-800/90 border-b border-slate-700/60 text-[10px] font-mono text-slate-300 font-bold uppercase tracking-wider select-none"><span>${cleanLang}</span></div>`
         : '';

      const blockHtml = `\n<div class="spectralens-code-card my-2.5 rounded-xl overflow-hidden border border-slate-700/70 bg-slate-900 shadow-xs">${langHeader}<pre class="p-3 overflow-x-auto text-xs font-mono text-slate-100 leading-relaxed custom-scrollbar whitespace-pre"><code class="language-${cleanLang}">${escapedCode}</code></pre></div>\n`;
      codeBlocks.push(blockHtml);
      return `\n%%SPL_CODE_${idx}%%\n`;
   });

   // 2. Preserve and protect inline code (`code`)
   const inlineCodes = [];
   source = source.replace(/`([^`\n]+)`/g, (match, code) => {
      const idx = inlineCodes.length;
      const escaped = (code || "")
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;");
      inlineCodes.push(`<code class="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-white/[0.08] text-blue-600 dark:text-blue-400 font-mono text-[11px] font-medium border border-slate-200/50 dark:border-white/[0.05]">${escaped}</code>`);
      return `%%SPL_INLINE_${idx}%%`;
   });

   // 3. Preserve inline math and display math
   const mathBlocks = [];
   source = source.replace(/\$\$([\s\S]+?)\$\$/g, (_, math) => {
      const idx = mathBlocks.length;
      const cleanMath = (math || "").trim()
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;");
      mathBlocks.push(`<div class="my-2 p-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.06] border border-slate-200/80 dark:border-white/[0.08] text-center font-mono text-xs text-blue-600 dark:text-blue-400 overflow-x-auto">${cleanMath}</div>`);
      return `%%SPL_MATH_${idx}%%`;
   });

   source = source.replace(/\$([^\$\n]+?)\$/g, (_, math) => {
      const idx = mathBlocks.length;
      const cleanMath = (math || "").trim()
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;");
      mathBlocks.push(`<code class="px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-mono text-[11px] font-medium border border-blue-200/50 dark:border-blue-800/40">${cleanMath}</code>`);
      return `%%SPL_MATH_${idx}%%`;
   });

   // 4. Escape general HTML in the surrounding markdown text
   let html = source
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

   // 5. Markdown Tables
   html = html.replace(/(?:^|\n)(\|.+?\|\n\|[\s\-:|]+\|\n(?:\|.+?\|\n?)+)/g, (match) => {
      const lines = match.trim().split("\n");
      if (lines.length < 2) return match;
      const headers = lines[0]
         .split("|")
         .filter((_, i, arr) => i > 0 && i < arr.length - 1)
         .map((h) => `<th class="border border-slate-300 dark:border-slate-700 px-3 py-1.5 bg-slate-100 dark:bg-white/[0.06] text-xs font-bold text-slate-900 dark:text-white">${h.trim()}</th>`)
         .join("");
      const rows = lines.slice(2).map((r) => {
         const cells = r
            .split("|")
            .filter((_, i, arr) => i > 0 && i < arr.length - 1)
            .map((c) => `<td class="border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200">${c.trim()}</td>`)
            .join("");
         return `<tr class="hover:bg-slate-50 dark:hover:bg-white/[0.02]">${cells}</tr>`;
      }).join("");
      return `<div class="overflow-x-auto my-2.5 rounded-xl border border-slate-200 dark:border-white/[0.08] shadow-xs"><table class="w-full border-collapse text-left text-xs"><thead><tr>${headers}</tr></thead><tbody class="divide-y divide-slate-200/60 dark:divide-white/[0.05]">${rows}</tbody></table></div>`;
   });

   // Horizontal rules
   html = html.replace(/(?:^|\n)(?:---|\*\*\*|___)(?:\n|$)/g, '<hr class="my-3 border-slate-200 dark:border-white/[0.08]" />');

   // Blockquotes
   html = html.replace(/(?:^|\n)>[ ]?(.*?)(?=\n[^\n>]|\n*$)/g, '<blockquote class="border-l-3 border-blue-500 pl-3 py-1 my-2 italic text-xs text-slate-600 dark:text-slate-300 bg-blue-50/50 dark:bg-blue-950/20 rounded-r-lg">$1</blockquote>');

   // Headings
   html = html.replace(/^### (.*?)$/gm, '<h3 class="text-xs font-bold text-slate-900 dark:text-white mt-2.5 mb-1">$1</h3>');
   html = html.replace(/^## (.*?)$/gm, '<h2 class="text-xs font-bold text-slate-900 dark:text-white mt-3 mb-1">$1</h2>');
   html = html.replace(/^# (.*?)$/gm, '<h1 class="text-sm font-bold text-slate-900 dark:text-white mt-3.5 mb-1.5 pb-1 border-b border-slate-200/60 dark:border-white/[0.06]">$1</h1>');

   // Task lists
   html = html.replace(/\[x\]\s+/gi, '<span class="inline-block text-emerald-500 font-bold mr-1.5">✓</span>');
   html = html.replace(/\[\s\]\s+/gi, '<span class="inline-block text-slate-400 mr-1.5">○</span>');

   // Inline styles (bold, italic, strikethrough, highlight)
   html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900 dark:text-white">$1</strong>');
   html = html.replace(/__([^_]+)__/g, '<strong class="font-bold text-slate-900 dark:text-white">$1</strong>');
   html = html.replace(/\*(.*?)\*/g, '<em class="italic text-slate-800 dark:text-slate-200">$1</em>');
   html = html.replace(/_([^_]+)_/g, '<em class="italic text-slate-800 dark:text-slate-200">$1</em>');
   html = html.replace(/~~(.*?)~~/g, '<del class="line-through opacity-70">$1</del>');
   html = html.replace(/==(.*?)==/g, '<mark class="bg-yellow-200 dark:bg-yellow-900/60 text-slate-900 dark:text-yellow-200 px-1 rounded-sm">$1</mark>');

   // Links
   html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 dark:text-blue-400 underline hover:text-blue-700 dark:hover:text-blue-300 font-medium">$1</a>');

   // Lists
   html = html.replace(/^\s*-\s+(.*?)$/gm, '<li class="ml-4 list-disc text-xs leading-relaxed my-0.5 text-slate-800 dark:text-slate-200">$1</li>');
   html = html.replace(/^\s*\*\s+(.*?)$/gm, '<li class="ml-4 list-disc text-xs leading-relaxed my-0.5 text-slate-800 dark:text-slate-200">$1</li>');
   html = html.replace(/^\s*(\d+)\.\s+(.*?)$/gm, '<li class="ml-4 list-decimal text-xs leading-relaxed my-0.5 text-slate-800 dark:text-slate-200">$2</li>');

   // 6. Restore all protected blocks
   codeBlocks.forEach((block, idx) => {
      html = html.replace(`%%SPL_CODE_${idx}%%`, block);
   });
   inlineCodes.forEach((block, idx) => {
      html = html.replace(`%%SPL_INLINE_${idx}%%`, block);
   });
   mathBlocks.forEach((block, idx) => {
      html = html.replace(`%%SPL_MATH_${idx}%%`, block);
   });

   // 7. Paragraphs & newlines
   html = html.replace(/\n\n+/g, '<div class="my-2"></div>');
   html = html.replace(/\n/g, '<br/>');

   return html;
}
