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
      console.log(`[SpectraLens:Pipeline] 🪟 Background Worker Window #${removedWinId} was closed.`);
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
        console.log(`[SpectraLens:Pipeline] 🚪 Provider Tab for "${providerId}" (#${removedTabId}) closed.`);
        persistentProviderTabs.delete(providerId);
      }
    }
  });
}

/**
 * Returns an existing background worker window, or creates a new
 * unfocused, minimized/offscreen window dedicated exclusively to AI scraper tabs.
 */
async function getOrCreateWorkerWindow() {
  if (workerWindowId && typeof chrome !== "undefined" && chrome.windows?.get) {
    try {
      const win = await chrome.windows.get(workerWindowId);
      if (win && win.id) return win.id;
    } catch {
      workerWindowId = null;
    }
  }

  if (workerWindowPromise) return workerWindowPromise;

  workerWindowPromise = new Promise((resolve) => {
    if (typeof chrome === "undefined" || !chrome.windows?.create) {
      resolve(null);
      return;
    }

    // Strategy 1: Minimized normal window (unfocused)
    chrome.windows.create(
      {
        focused: false,
        state: "minimized",
      },
      (win1) => {
        if (!chrome.runtime?.lastError && win1 && win1.id) {
          workerWindowId = win1.id;
          workerWindowPromise = null;
          console.log(
            `%c[SpectraLens:Pipeline] 🪟 Created Minimized Worker Window #${workerWindowId}`,
            "color: #8b5cf6; font-weight: bold;",
          );
          resolve(workerWindowId);
          return;
        }

        console.warn(
          "[SpectraLens:Pipeline] Strategy 1 (minimized) failed:",
          chrome.runtime?.lastError?.message,
          "- trying Strategy 2 (off-screen popup)...",
        );

        // Strategy 2: Off-screen popup window (positioned outside visible screen bounds)
        chrome.windows.create(
          {
            focused: false,
            left: 25000,
            top: 25000,
            width: 320,
            height: 240,
            type: "popup",
          },
          (win2) => {
            if (!chrome.runtime?.lastError && win2 && win2.id) {
              workerWindowId = win2.id;
              workerWindowPromise = null;
              console.log(
                `%c[SpectraLens:Pipeline] 🪟 Created Off-screen Worker Window #${workerWindowId}`,
                "color: #8b5cf6; font-weight: bold;",
              );
              resolve(workerWindowId);
              return;
            }

            console.warn(
              "[SpectraLens:Pipeline] Strategy 2 (offscreen) failed:",
              chrome.runtime?.lastError?.message,
              "- trying Strategy 3 (unfocused normal)...",
            );

            // Strategy 3: Standard unfocused window
            chrome.windows.create(
              {
                focused: false,
              },
              (win3) => {
                if (!chrome.runtime?.lastError && win3 && win3.id) {
                  workerWindowId = win3.id;
                  workerWindowPromise = null;
                  console.log(
                    `%c[SpectraLens:Pipeline] 🪟 Created Unfocused Worker Window #${workerWindowId}`,
                    "color: #8b5cf6; font-weight: bold;",
                  );
                  resolve(workerWindowId);
                  return;
                }

                console.warn(
                  "[SpectraLens:Pipeline] ⚠️ All window creation strategies failed, fallback to current window:",
                  chrome.runtime?.lastError?.message,
                );
                workerWindowId = null;
                workerWindowPromise = null;
                resolve(null);
              },
            );
          },
        );
      },
    );
  });

  return workerWindowPromise;
}

/** Immediately cancel all ongoing AI scraper requests */
function cancelAllAiRequests() {
  currentRequestId = "cancelled_" + Date.now();
}

/** Closes a specific AI provider's background tab (e.g. when toggled OFF in Settings) */
function closeProviderTab(providerId) {
  if (!providerId) return;
  const key = String(providerId).toLowerCase();
  const entry = persistentProviderTabs.get(key);
  if (entry && entry.tabId) {
    console.log(`[SpectraLens:Pipeline] 🧹 Closing disabled AI provider tab: "${key}" (#${entry.tabId})`);
    chromeTabMediaAccess(entry.tabId, false);
    chrome.tabs.remove(entry.tabId).catch(() => {});
    persistentProviderTabs.delete(key);
  }
  activeAiTabs = activeAiTabs.filter((id) => id !== entry?.tabId);

  // If no more persistent tabs remain, close the worker window to free RAM
  if (persistentProviderTabs.size === 0 && workerWindowId) {
    chrome.windows.remove(workerWindowId).catch(() => {});
    workerWindowId = null;
    workerWindowPromise = null;
  }
}

/** Closes all provider tabs and worker window (e.g. on New Chat, page close, or full reset) */
function resetAllProviderSessions() {
  console.log("[SpectraLens:Pipeline] 🔄 Resetting all AI provider background sessions...");
  currentRequestId = "reset_" + Date.now();
  for (const [providerId, entry] of persistentProviderTabs.entries()) {
    if (entry.tabId) {
      chromeTabMediaAccess(entry.tabId, false);
      chrome.tabs.remove(entry.tabId).catch(() => {});
    }
  }
  persistentProviderTabs.clear();

  activeAiTabs.forEach((id) => {
    chromeTabMediaAccess(id, false);
    chrome.tabs.remove(id).catch(() => {});
  });
  activeAiTabs = [];

  if (workerWindowId) {
    chrome.windows.remove(workerWindowId).catch(() => {});
    workerWindowId = null;
    workerWindowPromise = null;
  }
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
    bing: "Bing Copilot",
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

    // Check if we already have an active persistent tab for this provider
    const existingEntry = persistentProviderTabs.get(providerId);
    let existingTab = null;

    if (existingEntry && existingEntry.tabId && typeof chrome !== "undefined" && chrome.tabs?.get) {
      try {
        existingTab = await chrome.tabs.get(existingEntry.tabId);
      } catch {
        existingTab = null;
        persistentProviderTabs.delete(providerId);
      }
    }

    if (existingTab && existingTab.id) {
      console.log(
        `%c[SpectraLens:Pipeline] 🔁 [STEP 2/5 REUSE] Reusing active background Tab #${existingTab.id} for "${providerId}" (preserving session context)...`,
        "color: #8b5cf6; font-weight: bold;",
      );
      handleTabReady(existingTab, true);
    } else {
      // Retrieve or instantiate dedicated background worker window
      const targetWindowId = await getOrCreateWorkerWindow();

      console.log(
        `%c[SpectraLens:Pipeline] 📑 [STEP 2/5 NEW] Creating background tab inside isolated Worker Window #${targetWindowId || "default"} (active: false)...`,
        "color: #3b82f6;",
      );

      const tabCreateOptions = { url, active: false };
      if (targetWindowId) {
        tabCreateOptions.windowId = targetWindowId;
      }

      chrome.tabs.create(tabCreateOptions, (tab) => {
        if (chrome.runtime?.lastError || !tab || !tab.id) {
          if (targetWindowId) {
            console.warn("[SpectraLens:Pipeline] ⚠️ Failed creating tab in worker window, retrying with fallback:", chrome.runtime?.lastError?.message);
            workerWindowId = null;
            chrome.tabs.create({ url, active: false }, (fallbackTab) => {
              if (!fallbackTab || !fallbackTab.id) {
                resolve(formatProviderError(providerId, "Tab creation failed"));
                return;
              }
              handleTabReady(fallbackTab, false);
            });
            return;
          }
          console.error(
            `%c[SpectraLens:Pipeline] ❌ [STEP 2/5 FAILED] Failed to create background tab for ${url}`,
            "color: #ef4444; font-weight: bold;",
          );
          resolve(formatProviderError(providerId, "Tab creation failed"));
          return;
        }
        handleTabReady(tab, false);
      });
    }

    function handleTabReady(tab, isReused = false) {
      if (!tab || !tab.id) {
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

      // If reusing a tab and the provider uses direct URL search parameters (Perplexity, Bing, Grok), update URL if needed
      if (isReused && (providerId === "perplexity" || providerId === "bing" || providerId === "grok")) {
        chrome.tabs.update(tabId, { url, active: false });
      }

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

      // 25s timeout protection per query
      timeoutId = setTimeout(() => {
        console.warn(
          `%c[SpectraLens:Pipeline] ⏱️ [TIMEOUT] 25s timeout reached for Tab #${tabId}`,
          "color: #ef4444; font-weight: bold;",
        );
        safeResolve(formatProviderError(providerId, "Request timed out"));
      }, 25000);

      function runInjection() {
        if (isResolved || isExecuting) return;
        isExecuting = true;

        console.log(
          `%c[SpectraLens:Pipeline] 💉 [STEP 4/5] Injecting "${providerId}" adapter script into Tab #${tabId}...`,
          "color: #f59e0b; font-weight: bold;",
        );
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
            const cleanedHtml = injectResult?.[0]?.result;
            if (cleanedHtml) {
              safeResolve(cleanedHtml);
            } else {
              isExecuting = false;
              if (chrome.tabs?.get) {
                chrome.tabs.get(tabId, (currentTab) => {
                  void chrome.runtime?.lastError;
                  if (currentTab && currentTab.status === "complete" && !isResolved) {
                    console.log(
                      `%c[SpectraLens:Pipeline] 🔄 Tab #${tabId} status is complete. Retrying adapter...`,
                      "color: #3b82f6;",
                    );
                    runInjection();
                  }
                });
              }
            }
          },
          extractArgs,
        );
      }

      function listener(updatedTabId, info) {
        if (isResolved) return;
        if (updatedTabId === tabId && info.status === "complete") {
          console.log(
            `%c[SpectraLens:Pipeline] 🌐 [PAGE LOAD COMPLETE] Tab #${tabId} status is "complete". Running adapter injection...`,
            "color: #3b82f6; font-weight: bold;",
          );
          isExecuting = false;
          runInjection();
        }
      }

      chrome.tabs.onUpdated.addListener(listener);

      // If tab is already complete (or reused), run immediately
      if (tab.status === "complete" || isReused) {
        console.log(
          `%c[SpectraLens:Pipeline] ⚡ Tab #${tabId} is ready. Running adapter immediately...`,
          "color: #3b82f6;",
        );
        runInjection();
      }

      function onRemoved(removedTabId) {
        if (removedTabId === tabId) {
          console.log(
            `%c[SpectraLens:Pipeline] 🚪 Tab #${tabId} was closed externally.`,
            "color: #ef4444;",
          );
          persistentProviderTabs.delete(providerId);
          safeResolve("");
        }
      }
      chrome.tabs.onRemoved.addListener(onRemoved);
    }
  });
}

/* --- Provider Functions --- */

/**
 * Generic adapter runner executed inside the target provider tab
 */
function runTabAdapter(providerId, prompt, image = null) {
  return new Promise(async (resolve) => {
    function getShortError(pid, reason) {
      if (typeof formatProviderError === "function") {
        return formatProviderError(pid, reason);
      }
      return `> ⚠️ **Please log in to ${pid || "AI Provider"}**\n>\n> Unable to load response. Make sure you are signed in and have an active session.\n\n*Error: ${reason || "Failed"}*`;
    }

    try {
      console.log(
        `%c[SpectraLens:Adapter] 🚀 [ADAPTER 1/4] Running adapter for "${providerId}" with prompt: "${prompt.slice(0, 35)}..."`,
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

      // 1. FAST PATH: Check if already on search results page or response container is already rendered
      if (window.location.pathname.startsWith("/search")) {
        console.log(
          `%c[SpectraLens:Adapter] 🎯 Search results page loaded. Observing AI response stream...`,
          "color: #10b981; font-weight: bold;",
        );
        const answer = await adapter.observeResponse(20000);
        resolve(answer || getShortError(providerId, "No response generated"));
        return;
      }

      console.log(
        `%c[SpectraLens:Adapter] 🔍 Checking if response container is already rendered on page...`,
        "color: #64748b;",
      );
      const existingContainer = adapter.findResponseContainer();
      if (existingContainer && existingContainer.textContent.trim().length > 25) {
        console.log(
          `%c[SpectraLens:Adapter] 🎯 Response container already present on page. Observing stream...`,
          "color: #10b981; font-weight: bold;",
        );
        const answer = await adapter.observeResponse(15000);
        resolve(answer || getShortError(providerId, "Empty response"));
        return;
      }

      // 2. Otherwise: Locate input box (up to 12s)
      console.log(
        `%c[SpectraLens:Adapter] ✍️ [ADAPTER 2/4] Locating input editor for "${providerId}"...`,
        "color: #f59e0b;",
      );
      let input = adapter.findInput();
      let attempts = 0;
      while (!input && attempts < 25) {
        // Also check if response container appeared in the meantime
        if (adapter.findResponseContainer()?.textContent?.trim()?.length > 25) {
          console.log(
            `%c[SpectraLens:Adapter] 🎯 Response container appeared while waiting for input!`,
            "color: #10b981;",
          );
          const answer = await adapter.observeResponse(15000);
          resolve(answer || getShortError(providerId, "Empty response"));
          return;
        }
        await new Promise((r) => setTimeout(r, 400));
        input = adapter.findInput();
        attempts++;
      }

      // If no input box and still no response container
      if (!input) {
        const finalCheck = adapter.findResponseContainer();
        if (finalCheck && finalCheck.textContent.trim().length > 25) {
          const answer = await adapter.observeResponse(15000);
          resolve(answer || getShortError(providerId, "Empty response"));
          return;
        }
        console.warn(
          `%c[SpectraLens:Adapter] ⚠️ Input box not found for "${providerId}" after 25 attempts.`,
          "color: #ef4444; font-weight: bold;",
        );
        resolve(getShortError(providerId, "Input box not found or login required"));
        return;
      }

      // 3. Attach image file if present
      if (image) {
        console.log(
          `%c[SpectraLens:Adapter] 🖼️ Attaching image file to "${providerId}" editor...`,
          "color: #3b82f6; font-weight: bold;",
        );
        if (typeof adapter.attachImage === "function") {
          await adapter.attachImage(image);
          await new Promise((r) => setTimeout(r, 400));
        }
      }

      console.log(
        `%c[SpectraLens:Adapter] ✍️ [ADAPTER 3/4] Input located. Inserting prompt into "${providerId}"...`,
        "color: #10b981;",
      );

      // 4. Insert prompt
      const inserted = await adapter.insertPrompt(prompt);
      if (!inserted) {
        console.error(
          `%c[SpectraLens:Adapter] ❌ Failed to insert prompt into "${providerId}" editor.`,
          "color: #ef4444;",
        );
        resolve(getShortError(providerId, "Failed to insert prompt"));
        return;
      }

      await new Promise((r) => setTimeout(r, 300));

      // 5. Submit
      console.log(
        `%c[SpectraLens:Adapter] 🔘 Submitting prompt for "${providerId}"...`,
        "color: #3b82f6; font-weight: bold;",
      );
      await adapter.submit();

      // 6. Observe and return streaming response
      console.log(
        `%c[SpectraLens:Adapter] ⏳ [ADAPTER 4/4] Observing stream response for "${providerId}"...`,
        "color: #f59e0b; font-weight: bold;",
      );
      const answer = await adapter.observeResponse(22000);
      console.log(
        `%c[SpectraLens:Adapter] ✅ [ADAPTER COMPLETE] Response extracted for "${providerId}", length: ${answer?.length || 0} chars`,
        "color: #10b981; font-weight: bold;",
      );
      resolve(answer || getShortError(providerId, "No response generated"));
    } catch (e) {
      console.error(`%c[SpectraLens:Adapter] ❌ Error running adapter:`, "color: #ef4444;", e);
      resolve(getShortError(providerId, e?.message || "Execution error"));
    }
  });
}

async function getGoogleAiAnswer(q, requestId, image = null) {
  const url = "https://www.google.com/?hl=en";
  console.log(
    `[SpectraLens:Background] 🔍 getGoogleAiAnswer (opening google.com -> AI Mode ON -> typing & sending prompt) for: "${q.slice(0, 30)}..."${image ? " (with image)" : ""} (requestId: ${requestId})`,
  );

  return fetchAiAnswer(url, runTabAdapter, ["google", q, image], requestId);
}

async function getBingAiAnswer(q, requestId, image = null) {
  const url = `https://www.bing.com/search?q=${encodeURIComponent(q)}`;
  console.log(
    `[SpectraLens:Background] 🔍 getBingAiAnswer (direct search query) for: "${q.slice(0, 30)}..."${image ? " (with image)" : ""} (requestId: ${requestId})`,
  );

  return fetchAiAnswer(url, runTabAdapter, ["bing", q, image], requestId);
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
