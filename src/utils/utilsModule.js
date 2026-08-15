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
   if (!hasChrome || !chrome.runtime?.sendMessage || !chrome.runtime?.id) {
      if (!chrome.runtime?.id && __isDevMode) {
         originalConsoleError.call(console, "Message Error: Extension context invalidated.");
      }
      if (typeof message === "function") message(undefined);
      else callback && callback(undefined);
      return;
   }
   if (typeof message === "function") {
      chrome.runtime.sendMessage({ type }, (response) => {
         const err = chrome.runtime.lastError;
         if (err && __isDevMode) {
            originalConsoleError.call(console, "Message Error:", err.message);
         }
         message(response);
      });
   } else {
      chrome.runtime.sendMessage({ ...message, type }, (response) => {
         const err = chrome.runtime.lastError;
         if (err && __isDevMode) {
            originalConsoleError.call(console, "Message Error:", err.message);
         }
         callback && callback(response);
      });
   }
}

/** Listen for a specific message type via chrome.runtime */
function runtimeOnMessage(type, callback) {
   if (!hasChrome || !chrome.runtime?.onMessage?.addListener || !chrome.runtime?.id) {
      if (!chrome.runtime?.id && __isDevMode) {
         originalConsoleError.call(console, "Message Error: Extension context invalidated.");
      }
      return;
   }
   chrome.runtime.onMessage.addListener((message, sender, response) => {
      if (type === message?.type) {
         const isAsync = callback(message, sender, response);
         if (isAsync === true) {
            return true;
         }
      }
      return false;
   });
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

   // Constants
   KEYS,
};

if (typeof window !== "undefined") {
   window.extensionUtils = extensionUtils;
}

export default extensionUtils;
