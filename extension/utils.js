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
   if (!chrome.runtime?.id) {
      if (__isDevMode) {
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
   if (!chrome.runtime?.id) {
      if (__isDevMode) {
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
