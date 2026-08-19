/* --- Persistent AI Provider Tab Pool & Isolated Worker Window --- */
let currentRequestId = null;
let activeAiTabs = [];
const persistentProviderTabs = new Map(); // providerId -> { tabId, windowId, providerId, lastActive }
let workerWindowId = null;
let workerWindowPromise = null;

// Track if background worker window is closed externally
if (typeof chrome !== "undefined" && chrome.windows?.onRemoved) {
  chrome.windows.onRemoved.addListener((removedWinId) => {
    if (removedWinId === workerWindowId) {
      console.log(
        `[SpectraLens:Pipeline] 🪟 Background Worker Window #${removedWinId} was closed.`,
      );
      workerWindowId = null;
      workerWindowPromise = null;
      persistentProviderTabs.clear();
      activeAiTabs = [];
    }
  });
}

// Track if individual AI provider tab is closed externally
if (typeof chrome !== "undefined" && chrome.tabs?.onRemoved) {
  chrome.tabs.onRemoved.addListener((removedTabId) => {
    activeAiTabs = activeAiTabs.filter((id) => id !== removedTabId);
    for (const [providerId, entry] of persistentProviderTabs.entries()) {
      if (entry.tabId === removedTabId) {
        console.log(
          `[SpectraLens:Pipeline] 🚪 Provider Tab for "${providerId}" (#${removedTabId}) closed.`,
        );
        persistentProviderTabs.delete(providerId);
      }
    }
  });
}

/**
 * Opens or retrieves a dedicated separate popup window (width: 500px, height: max)
 * for each AI provider, directly loading the target URL without blank tabs.
 */
async function openOrReuseProviderTab(providerId, url) {
  // 1. Check if an active persistent window & tab exists for this provider
  const existingEntry = persistentProviderTabs.get(providerId);
  if (
    existingEntry &&
    existingEntry.tabId &&
    typeof chrome !== "undefined" &&
    chrome.tabs?.get
  ) {
    try {
      const tab = await chrome.tabs.get(existingEntry.tabId);
      if (tab && tab.id) {
        return { tab, isReused: true };
      }
    } catch {
      persistentProviderTabs.delete(providerId);
    }
  }

  // 2. Create a separate dedicated popup worker window for this provider
  return new Promise((resolve) => {
    if (typeof chrome === "undefined" || !chrome.windows?.create) {
      chrome.tabs.create({ url, active: false }, (tab) => {
        resolve({ tab: tab || null, isReused: false });
      });
      return;
    }

    const maxHeight =
      typeof screen !== "undefined" && screen.availHeight
        ? screen.availHeight
        : 950;

    chrome.windows.create(
      {
        url,
        focused: false,
        type: "popup",
        width: 500,
        height: maxHeight,
      },
      (win) => {
        if (!chrome.runtime?.lastError && win && win.id) {
          console.log(
            `%c[SpectraLens:Pipeline] 🪟 Created Dedicated Worker Window #${win.id} (width: 500px, height: ${maxHeight}px) for "${providerId}"`,
            "color: #8b5cf6; font-weight: bold;",
          );
          const tab = win.tabs?.[0] || null;
          if (tab) {
            resolve({ tab, isReused: false });
            return;
          }
          chrome.tabs.query({ windowId: win.id }, (tabs) => {
            resolve({ tab: tabs?.[0] || null, isReused: false });
          });
          return;
        }

        console.warn(
          "[SpectraLens:Pipeline] Popup window creation failed, fallback to normal window:",
          chrome.runtime?.lastError?.message,
        );

        // Fallback: normal window
        chrome.windows.create(
          { url, focused: false, width: 500, height: maxHeight },
          (winFallback) => {
            resolve({ tab: winFallback?.tabs?.[0] || null, isReused: false });
          },
        );
      },
    );
  });
}

/** Immediately cancel all ongoing AI scraper requests */
function cancelAllAiRequests() {
  currentRequestId = "cancelled_" + Date.now();
}

/** Closes a specific AI provider's background window & tab (e.g. when toggled OFF in Settings) */
function closeProviderTab(providerId) {
  if (!providerId) return;
  const key = String(providerId).toLowerCase();
  const entry = persistentProviderTabs.get(key);
  if (entry) {
    console.log(
      `[SpectraLens:Pipeline] 🧹 Closing disabled AI provider window: "${key}" (#${entry.tabId})`,
    );
    if (entry.tabId) {
      chromeTabMediaAccess(entry.tabId, false);
      chrome.tabs.remove(entry.tabId).catch(() => {});
    }
    if (entry.windowId) {
      chrome.windows.remove(entry.windowId).catch(() => {});
    }
    persistentProviderTabs.delete(key);
  }
  activeAiTabs = activeAiTabs.filter((id) => id !== entry?.tabId);
}

/** Closes all provider windows and tabs (e.g. on New Chat, page close, or full reset) */
function resetAllProviderSessions() {
  console.log(
    "[SpectraLens:Pipeline] 🔄 Resetting all AI provider background sessions...",
  );
  currentRequestId = "reset_" + Date.now();
  for (const [providerId, entry] of persistentProviderTabs.entries()) {
    if (entry.tabId) {
      chromeTabMediaAccess(entry.tabId, false);
      chrome.tabs.remove(entry.tabId).catch(() => {});
    }
    if (entry.windowId) {
      chrome.windows.remove(entry.windowId).catch(() => {});
    }
  }
  persistentProviderTabs.clear();

  activeAiTabs.forEach((id) => {
    chromeTabMediaAccess(id, false);
    chrome.tabs.remove(id).catch(() => {});
  });
  activeAiTabs = [];
}

/* --- Error Formatting Helper --- */

function formatProviderError(providerId, shortReason) {
  const providerNames = {
    google: "Google AI",
    chatgpt: "ChatGPT",
    claude: "Claude",
    gemini: "Gemini",
    grok: "Grok",
    perplexity: "Perplexity",
  };
  const name =
    providerNames[providerId?.toLowerCase()] ||
    (providerId
      ? providerId.charAt(0).toUpperCase() + providerId.slice(1)
      : "AI Provider");

  const cleanShort = shortReason
    ? String(shortReason)
        .replace(/^Error:\s*/i, "")
        .replace(/<[^>]*>/g, "")
        .trim()
        .slice(0, 60)
    : "No response";

  return `> ⚠️ **Please log in to ${name}**\n>\n> Unable to load response. Make sure you are signed in to **${name}** in your browser and have an active session, then ask again.\n\n*Error: ${cleanShort}*`;
}

/* --- Shared Helper --- */

/** Injects an in-page fetch interceptor into world: "MAIN" for real-time /async/folif stream capture */
function injectMainWorldNetworkInterceptor(tabId) {
  if (!chrome.scripting?.executeScript || !tabId) return;
  try {
    chrome.scripting.executeScript(
      {
        target: { tabId },
        world: "MAIN",
        func: () => {
          if (window.__SPECTRALENS_MAIN_NET_HOOKED__) return;
          window.__SPECTRALENS_MAIN_NET_HOOKED__ = true;
          window.__SPECTRALENS_NETWORK_CHUNKS__ = [];

          const origFetch = window.fetch;
          window.fetch = async function (...args) {
            const response = await origFetch.apply(this, args);
            try {
              const url =
                typeof args[0] === "string" ? args[0] : args[0]?.url || "";
              if (
                url.includes("/async/folif") ||
                url.includes("/async/aim") ||
                url.includes("/async/") ||
                url.includes("/StreamGenerate") ||
                url.includes("BardFrontendService") ||
                url.includes("/assistant.lamda.")
              ) {
                const clone = response.clone();
                clone
                  .text()
                  .then((text) => {
                    if (text && text.length > 50) {
                      window.__SPECTRALENS_NETWORK_CHUNKS__.push({
                        url,
                        timestamp: Date.now(),
                        raw: text,
                      });
                      window.dispatchEvent(
                        new CustomEvent("spectralens:network_chunk", {
                          detail: { url, raw: text, timestamp: Date.now() },
                        }),
                      );
                    }
                  })
                  .catch(() => {});
              }
            } catch {}
            return response;
          };
        },
      },
      () => {
        void chrome.runtime?.lastError;
      },
    );
  } catch {}
}

/**
 * Opens (or reuses) an isolated background tab inside the worker window, waits for it to load,
 * executes the content extraction adapter function, and returns the cleaned HTML.
 * Keeping tabs open preserves multi-turn conversation context across queries!
 *
 * @param {string} url - The URL to open or navigate
 * @param {Function} extractFn - Function to run inside the tab (must return a Promise<string>)
 * @param {Array} [extractArgs=[]] - Arguments to pass to extractFn
 * @param {string} [requestId=null] - The unique ID for the current batch of requests
 * @returns {Promise<string>} The cleaned HTML result
 */
function fetchAiAnswer(url, extractFn, extractArgs = [], requestId = null) {
  return new Promise(async (resolve) => {
    const providerId = (extractArgs?.[0] || "ai").toLowerCase();
    console.log(
      `%c[SpectraLens:Pipeline] 🚀 [STEP 1/5] Initiating request for "${providerId}" (URL: ${url}, RequestID: ${requestId})`,
      "color: #3b82f6; font-weight: bold;",
    );

    if (requestId) {
      currentRequestId = requestId;
    }

    let isResolved = false;
    let timeoutId = null;
    let isExecuting = false;

    // Retrieve or instantiate dedicated background worker tab directly with provider URL
    const { tab, isReused } = await openOrReuseProviderTab(providerId, url);

    if (!tab || !tab.id) {
      console.error(
        `%c[SpectraLens:Pipeline] ❌ [STEP 2/5 FAILED] Failed to get background tab for "${providerId}" (${url})`,
        "color: #ef4444; font-weight: bold;",
      );
      resolve(formatProviderError(providerId, "Tab creation failed"));
      return;
    }

    const tabId = tab.id;
    if (!activeAiTabs.includes(tabId)) {
      activeAiTabs.push(tabId);
    }
    persistentProviderTabs.set(providerId, {
      tabId,
      windowId: tab.windowId,
      providerId,
      lastActive: Date.now(),
    });

    console.log(
      `%c[SpectraLens:Pipeline] 📑 [STEP 3/5] Background Tab #${tabId} ready (Window #${tab.windowId}, reused: ${isReused}). Listening for stream completion...`,
      "color: #10b981; font-weight: bold;",
    );
    chromeTabMediaAccess(tabId, true);
    injectMainWorldNetworkInterceptor(tabId);

    function detachTurnListeners() {
      if (timeoutId) clearTimeout(timeoutId);
      chrome.tabs.onUpdated.removeListener(listener);
      chrome.tabs.onRemoved.removeListener(onRemoved);
    }

    function safeResolve(val) {
      if (!isResolved) {
        isResolved = true;
        detachTurnListeners();
        console.log(
          `%c[SpectraLens:Pipeline] ✅ [STEP 5/5] fetchAiAnswer resolved for Tab #${tabId} (Content Length: ${val?.length || 0} chars). Tab preserved for context memory.`,
          "color: #10b981; font-weight: bold;",
        );
        resolve(val);
      }
    }

    // Dynamic Adaptive Timeout: 90s for cold start (new window/tab), 80s for warm/already-open sessions
    const queryTimeoutMs = isReused ? 80000 : 90000;
    timeoutId = setTimeout(() => {
      console.warn(
        `%c[SpectraLens:Pipeline] ⏱️ [TIMEOUT] ${queryTimeoutMs / 1000}s timeout reached for Tab #${tabId} (isReused: ${isReused})`,
        "color: #ef4444; font-weight: bold;",
      );
      safeResolve(formatProviderError(providerId, "Request timed out"));
    }, queryTimeoutMs);

    function runInjection() {
      if (isResolved || isExecuting) return;
      isExecuting = true;

      console.log(
        `%c[SpectraLens:Pipeline] 💉 [STEP 4/5] Injecting "${providerId}" adapter script into Tab #${tabId} (isReused: ${isReused})...`,
        "color: #f59e0b; font-weight: bold;",
      );
      const argsWithContext = [...extractArgs, isReused];
      executeScriptReturn(
        tabId,
        extractFn,
        (injectResult) => {
          if (isResolved) return;
          console.log(
            `%c[SpectraLens:Pipeline] 📥 [STEP 4/5 COMPLETE] Received execution response from Tab #${tabId}:`,
            "color: #10b981;",
            injectResult,
          );
          const resultVal = injectResult?.[0]?.result;
          if (resultVal === "__NAVIGATING__") {
            isExecuting = false;
            console.log(
              `%c[SpectraLens:Pipeline] 🚀 [STEP 4/5] Submitted from homepage. Waiting for /search navigation to complete...`,
              "color: #3b82f6; font-weight: bold;",
            );
            return;
          }

          if (typeof resultVal === "string" && resultVal.trim().length > 0) {
            console.log(
              `%c[SpectraLens:RawOutput] 📦 ==================== FULL RAW OUTPUT DATA FROM [${providerId.toUpperCase()}] ====================`,
              "color: #8b5cf6; font-weight: bold; font-size: 13px;",
            );
            console.log(
              `[SpectraLens:RawOutput] Provider: "${providerId}" | Tab ID: #${tabId} | Character Length: ${resultVal.length}`,
            );
            console.log(
              `[SpectraLens:RawOutput] RAW DATA CONTENT:\n`,
              resultVal,
            );
            console.log(
              `%c[SpectraLens:RawOutput] =========================================================================================`,
              "color: #8b5cf6; font-weight: bold; font-size: 13px;",
            );
            safeResolve(resultVal);
          } else {
            isExecuting = false;
          }
        },
        argsWithContext,
      );
    }

    function listener(updatedTabId, info) {
      if (isResolved || isExecuting) return;
      if (updatedTabId === tabId && info.status === "complete") {
        console.log(
          `%c[SpectraLens:Pipeline] 🌐 [PAGE LOAD COMPLETE] Tab #${tabId} status is "complete". Running adapter injection...`,
          "color: #3b82f6; font-weight: bold;",
        );
        injectMainWorldNetworkInterceptor(tabId);
        runInjection();
      }
    }

    function onRemoved(removedTabId) {
      if (removedTabId === tabId) {
        detachTurnListeners();
        persistentProviderTabs.delete(providerId);
        activeAiTabs = activeAiTabs.filter((id) => id !== tabId);
        safeResolve(formatProviderError(providerId, "Window closed"));
      }
    }

    chrome.tabs.onUpdated.addListener(listener);
    chrome.tabs.onRemoved.addListener(onRemoved);

    // If tab is already fully loaded, run adapter immediately
    if (isReused || tab.status === "complete") {
      console.log(
        `%c[SpectraLens:Pipeline] ⚡ Tab #${tabId} is ready (isReused: ${isReused}). Running adapter immediately...`,
        "color: #10b981; font-weight: bold;",
      );
      runInjection();
    }
  });
}

/* --- Provider Functions --- */

/**
 * Universal content extractor function injected into provider tabs.
 * Runs in the isolated content context with full access to ProviderAdapterRegistry.
 */
function runTabAdapter(providerId, prompt, image, isReused = false) {
  return new Promise(async (resolve) => {
    function getShortError(pid, reason) {
      if (typeof formatProviderError === "function") {
        return formatProviderError(pid, reason);
      }
      return `> ⚠️ **Please log in to ${pid || "AI Provider"}**\n>\n> Unable to load response. Make sure you are signed in and have an active session.\n\n*Error: ${reason || "Failed"}*`;
    }

    try {
      const streamTimeoutMs = isReused ? 20000 : 45000;
      console.log(
        `%c[SpectraLens:Adapter] 🚀 [ADAPTER 1/4] Running adapter for "${providerId}" with timeout ${streamTimeoutMs / 1000}s (isReused: ${isReused}): "${prompt.slice(0, 35)}..."`,
        "color: #3b82f6; font-weight: bold;",
      );
      const adapter =
        typeof ProviderAdapterRegistry !== "undefined"
          ? ProviderAdapterRegistry.getAdapter(providerId) ||
            ProviderAdapterRegistry.getAdapterForCurrentPage()
          : null;

      if (!adapter) {
        console.error(
          `%c[SpectraLens:Adapter] ❌ Provider adapter not found for "${providerId}"`,
          "color: #ef4444; font-weight: bold;",
        );
        resolve(getShortError(providerId, "Adapter not found"));
        return;
      }

      // Record any pre-existing response content before sending the new message
      const existingContainer = adapter.findResponseContainer();
      const previousContent = existingContainer
        ? (existingContainer.textContent || "").trim()
        : "";

      // 0. If already on search results page for THIS exact query (initial search), observe directly without re-typing
      const isSearchPage = window.location.pathname.startsWith("/search");
      if (isSearchPage) {
        const urlParams = new URLSearchParams(window.location.search);
        const urlQuery = (urlParams.get("q") || "").trim().toLowerCase();
        const promptQuery = (prompt || "").trim().toLowerCase();

        if (
          urlQuery &&
          (urlQuery === promptQuery ||
            promptQuery.startsWith(urlQuery) ||
            urlQuery.startsWith(promptQuery))
        ) {
          console.log(
            `%c[SpectraLens:Adapter] 🎯 Search page already executing query ("${prompt.slice(0, 25)}..."). Observing AI stream directly...`,
            "color: #10b981; font-weight: bold;",
          );
          const answer = await adapter.observeResponse(streamTimeoutMs);
          resolve(answer || getShortError(providerId, "No response generated"));
          return;
        }
      }

      // For first-time message in newly opened window, let the SPA settle and hydrate gracefully
      if (!isReused) {
        console.log(
          `%c[SpectraLens:Adapter] ⏳ First message in new window for "${providerId}". Allowing page scripts to settle...`,
          "color: #8b5cf6;",
        );
        await new Promise((r) => setTimeout(r, 1200));
      }

      // 1. Locate input editor (up to 20 attempts for first time, up to 10 for reused)
      console.log(
        `%c[SpectraLens:Adapter] ✍️ [ADAPTER 2/4] Locating input editor for "${providerId}"...`,
        "color: #f59e0b;",
      );
      let input = adapter.findInput();
      let attempts = 0;
      const maxLocateAttempts = isReused ? 10 : 25;
      const locateInterval = isReused ? 300 : 450;
      while (!input && attempts < maxLocateAttempts) {
        await new Promise((r) => setTimeout(r, locateInterval));
        input = adapter.findInput();
        attempts++;
      }

      if (!input) {
        // If on search page and response already exists
        if (existingContainer && previousContent.length > 25) {
          const answer = await adapter.observeResponse(streamTimeoutMs);
          resolve(answer || getShortError(providerId, "Empty response"));
          return;
        }
        console.warn(
          `%c[SpectraLens:Adapter] ⚠️ Input box not found for "${providerId}" after ${maxLocateAttempts} attempts.`,
          "color: #ef4444; font-weight: bold;",
        );
        resolve(
          getShortError(providerId, "Input box not found or login required"),
        );
        return;
      }

      // 2. Attach image file if present
      if (image) {
        console.log(
          `%c[SpectraLens:Adapter] 🖼️ Attaching image file to "${providerId}" editor...`,
          "color: #3b82f6; font-weight: bold;",
        );
        if (typeof adapter.attachImage === "function") {
          await adapter.attachImage(image);
          const imageSettleDelay = isReused ? 400 : 800;
          await new Promise((r) => setTimeout(r, imageSettleDelay));
        }
      }

      console.log(
        `%c[SpectraLens:Adapter] ✍️ [ADAPTER 3/4] Input located. Inserting prompt into "${providerId}"...`,
        "color: #10b981;",
      );

      // 3. Insert prompt
      const inserted = await adapter.insertPrompt(prompt);
      if (!inserted) {
        console.error(
          `%c[SpectraLens:Adapter] ❌ Failed to insert prompt into "${providerId}" editor.`,
          "color: #ef4444;",
        );
        resolve(getShortError(providerId, "Failed to insert prompt"));
        return;
      }

      // Gentle pause before clicking send (gives send buttons time to enable)
      const preSubmitDelay = isReused ? 200 : 700;
      await new Promise((r) => setTimeout(r, preSubmitDelay));

      // 4. Submit
      console.log(
        `%c[SpectraLens:Adapter] 🔘 Submitting prompt for "${providerId}"...`,
        "color: #3b82f6; font-weight: bold;",
      );
      await adapter.submit();

      // If initial submission from Google homepage that navigates to /search results:
      if (!isSearchPage && providerId === "google") {
        console.log(
          `%c[SpectraLens:Adapter] 🚀 Google homepage submitted. Awaiting search navigation to complete...`,
          "color: #3b82f6; font-weight: bold;",
        );
        resolve("__NAVIGATING__");
        return;
      }

      const postSubmitDelay = isReused ? 150 : 400;
      await new Promise((r) => setTimeout(r, postSubmitDelay));

      // 5. Observe and return streaming response (waiting for new content to generate)
      console.log(
        `%c[SpectraLens:Adapter] ⏳ [ADAPTER 4/4] Observing stream response for "${providerId}" (timeout: ${streamTimeoutMs / 1000}s)...`,
        "color: #f59e0b; font-weight: bold;",
      );
      const answer = await adapter.observeResponse(streamTimeoutMs, previousContent);
      console.log(
        `%c[SpectraLens:Adapter] ✅ [ADAPTER COMPLETE] Response extracted for "${providerId}", length: ${answer?.length || 0} chars`,
        "color: #10b981; font-weight: bold;",
      );
      resolve(answer || getShortError(providerId, "No response generated"));
    } catch (e) {
      console.error(
        `%c[SpectraLens:Adapter] ❌ Error running adapter:`,
        "color: #ef4444;",
        e,
      );
      resolve(getShortError(providerId, e?.message || "Execution error"));
    }
  });
}

async function getGoogleAiAnswer(q, requestId, image = null) {
  const url = "https://www.google.com/?hl=en";
  console.log(
    `[SpectraLens:Background] 🔍 getGoogleAiAnswer (opening google.com -> enable AI mode -> sending prompt) for: "${q.slice(0, 30)}..."${image ? " (with image)" : ""} (requestId: ${requestId})`,
  );

  return fetchAiAnswer(url, runTabAdapter, ["google", q, image], requestId);
}


async function getGrokAnswer(q, requestId, image = null) {
  const url = `https://grok.com/?q=${encodeURIComponent(q)}`;

  return fetchAiAnswer(url, runTabAdapter, ["grok", q, image], requestId);
}

async function getPerplexityAnswer(q, requestId, image = null) {
  const url = `https://www.perplexity.ai/search?q=${encodeURIComponent(q)}`;

  return fetchAiAnswer(url, runTabAdapter, ["perplexity", q, image], requestId);
}

async function getGeminiAnswer(q, requestId, image = null) {
  const url = "https://gemini.google.com/app?hl=en";

  return fetchAiAnswer(url, runTabAdapter, ["gemini", q, image], requestId);
}

async function getChatGptAnswer(q, requestId, image = null) {
  const url = `https://chatgpt.com/?q=${encodeURIComponent(q)}`;

  return fetchAiAnswer(url, runTabAdapter, ["chatgpt", q, image], requestId);
}

async function getClaudeAnswer(q, requestId, image = null) {
  const url = "https://claude.ai/new";

  return fetchAiAnswer(url, runTabAdapter, ["claude", q, image], requestId);
}
