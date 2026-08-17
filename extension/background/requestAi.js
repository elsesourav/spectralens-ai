/* --- Request Cancellation State --- */
let currentRequestId = null;
let activeAiTabs = [];
let activeAiWindows = [];

/** Immediately cancel all ongoing AI scraper requests and close all active scraper tabs & windows */
function cancelAllAiRequests() {
  currentRequestId = "cancelled_" + Date.now();
  const tabsToClose = [...activeAiTabs];
  activeAiTabs = [];
  tabsToClose.forEach((id) => {
    chromeTabMediaAccess(id, false);
    chrome.tabs.remove(id).catch(() => {});
  });

  const windowsToClose = [...activeAiWindows];
  activeAiWindows = [];
  windowsToClose.forEach((winId) => {
    chrome.windows.remove(winId).catch(() => {});
  });
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
 * Creates an AI target container (Attempts a detached offscreen popup window first;
 * falls back seamlessly to a background tab without removing any existing logic).
 */
function createAiTarget(url, cb) {
  if (
    typeof chrome !== "undefined" &&
    chrome.windows &&
    typeof chrome.windows.create === "function"
  ) {
    try {
      chrome.windows.create(
        {
          url,
          focused: false,
          state: "minimized",
          type: "popup",
          left: -10000,
          top: -10000,
          width: 100,
          height: 100,
        },
        (win) => {
          if (chrome.runtime?.lastError || !win || !win.id) {
            console.warn(
              "[SpectraLens:Background] ℹ️ Window create fallback to tab:",
              chrome.runtime?.lastError?.message || "unknown",
            );
            chrome.tabs.create({ url, active: false }, (fallbackTab) =>
              cb(fallbackTab, null),
            );
          } else {
            const tab = win.tabs?.[0];
            if (tab && tab.id) {
              activeAiWindows.push(win.id);
              cb(tab, win.id);
            } else {
              chrome.tabs.query({ windowId: win.id }, (tabs) => {
                if (tabs && tabs[0]) {
                  activeAiWindows.push(win.id);
                  cb(tabs[0], win.id);
                } else {
                  chrome.tabs.create({ url, active: false }, (fallbackTab) =>
                    cb(fallbackTab, null),
                  );
                }
              });
            }
          }
        },
      );
      return;
    } catch (e) {
      console.warn(
        "[SpectraLens:Background] Window create error, using background tab:",
        e,
      );
    }
  }

  // Baseline standard background tab logic
  chrome.tabs.create({ url, active: false }, (tab) => cb(tab, null));
}

/**
 * Opens a background tab / detached window, waits for it to load, executes a content
 * extraction function, and returns the cleaned HTML.
 *
 * @param {string} url - The URL to open
 * @param {Function} extractFn - Function to run inside the tab (must return a Promise<string>)
 * @param {Array} [extractArgs=[]] - Arguments to pass to extractFn
 * @param {string} [requestId=null] - The unique ID for the current batch of requests
 * @returns {Promise<string>} The cleaned HTML result
 */
function fetchAiAnswer(url, extractFn, extractArgs = [], requestId = null) {
  return new Promise((resolve) => {
    const providerId = extractArgs?.[0] || "ai";
    console.log(
      `[SpectraLens:Background] 🚀 fetchAiAnswer starting for url: ${url} (requestId: ${requestId})`,
    );

    // If we have a new requestId, cancel all existing fetching tabs & windows
    if (requestId && currentRequestId !== requestId) {
      cancelAllAiRequests();
      currentRequestId = requestId;
    }

    let isResolved = false;
    let timeoutId = null;
    let isExecuting = false;

    createAiTarget(url, (tab, windowId) => {
      if (!tab || !tab.id) {
        console.error(
          "[SpectraLens:Background] ❌ Failed to create target for:",
          url,
        );
        resolve(formatProviderError(providerId, "Target creation failed"));
        return;
      }

      const tabId = tab.id;
      activeAiTabs.push(tabId);
      console.log(
        `[SpectraLens:Background] 📑 Tab #${tabId} created (windowId: ${windowId || "none"}).`,
      );
      chromeTabMediaAccess(tabId, true);

      function cleanup() {
        if (timeoutId) clearTimeout(timeoutId);
        chrome.tabs.onUpdated.removeListener(listener);
        chrome.tabs.onRemoved.removeListener(onRemoved);
        chromeTabMediaAccess(tabId, false);

        if (windowId) {
          chrome.windows.remove(windowId).catch(() => {});
          activeAiWindows = activeAiWindows.filter((id) => id !== windowId);
        } else {
          chrome.tabs.remove(tabId).catch(() => {});
        }
        activeAiTabs = activeAiTabs.filter((id) => id !== tabId);
      }

      function safeResolve(val) {
        if (!isResolved) {
          isResolved = true;
          cleanup();
          console.log(
            `[SpectraLens:Background] ✅ fetchAiAnswer resolved for Tab #${tabId}, result length: ${val?.length || 0}`,
          );
          resolve(val);
        }
      }

      // 25s timeout protection
      timeoutId = setTimeout(() => {
        console.warn(
          `[SpectraLens:Background] ⏱️ Timeout reached for Tab #${tabId}`,
        );
        safeResolve(formatProviderError(providerId, "Request timed out"));
      }, 25000);

      function runInjection() {
        if (isResolved) return;

        console.log(
          `[SpectraLens:Background] 💉 Injecting adapter into Tab #${tabId}...`,
        );
        executeScriptReturn(
          tabId,
          extractFn,
          (injectResult) => {
            console.log(
              `[SpectraLens:Background] 📥 Received execution result from Tab #${tabId}:`,
              injectResult,
            );
            const cleanedHtml = injectResult?.[0]?.result || "";
            // If result is valid non-empty markdown response, resolve
            if (
              cleanedHtml &&
              !cleanedHtml.includes("No response generated") &&
              !cleanedHtml.includes("Empty response") &&
              !cleanedHtml.includes("Please log in to")
            ) {
              safeResolve(cleanedHtml);
            }
          },
          extractArgs,
        );
      }

      function listener(updatedTabId, info) {
        if (updatedTabId === tabId && info.status === "complete") {
          console.log(
            `[SpectraLens:Background] 🌐 Tab #${tabId} load status: COMPLETE. Running adapter...`,
          );
          runInjection();
        }
      }

      chrome.tabs.onUpdated.addListener(listener);

      // Handle cases where the tab is closed before it finishes (e.g. by cancellation)
      function onRemoved(removedTabId) {
        if (removedTabId === tabId) {
          console.log(`[SpectraLens:Background] 🚪 Tab #${tabId} was closed.`);
          safeResolve("");
        }
      }
      chrome.tabs.onRemoved.addListener(onRemoved);
    });
  });
}

/* --- Provider Functions --- */

/**
 * Generic adapter runner executed inside the target provider tab
 */
function runTabAdapter(providerId, prompt) {
  return new Promise(async (resolve) => {
    function getShortError(pid, reason) {
      if (typeof formatProviderError === "function") {
        return formatProviderError(pid, reason);
      }
      return `> ⚠️ **Please log in to ${pid || "AI Provider"}**\n>\n> Unable to load response. Make sure you are signed in and have an active session.\n\n*Error: ${reason || "Failed"}*`;
    }

    try {
      console.log(
        `[SpectraLens:Tab] 🚀 Running adapter for "${providerId}" with prompt: "${prompt.slice(0, 30)}..."`,
      );
      const adapter =
        typeof ProviderAdapterRegistry !== "undefined"
          ? ProviderAdapterRegistry.getAdapter(providerId) ||
            ProviderAdapterRegistry.getAdapterForCurrentPage()
          : null;

      if (!adapter) {
        console.error(
          `[SpectraLens:Tab] ❌ Provider adapter not found for "${providerId}"`,
        );
        resolve(getShortError(providerId, "Adapter not found"));
        return;
      }

      // 1. FAST PATH: Check if response container is already loaded (e.g. from direct search URL)
      console.log(`[SpectraLens:Tab] Checking if response container is already present on page...`);
      const existingContainer = adapter.findResponseContainer();
      if (existingContainer && existingContainer.textContent.trim().length > 25) {
        console.log(`[SpectraLens:Tab] 🎯 Response container already present on page. Observing response...`);
        const answer = await adapter.observeResponse(15000);
        resolve(answer || getShortError(providerId, "Empty response"));
        return;
      }

      // 2. Otherwise: Locate input box (up to 12s)
      let input = adapter.findInput();
      let attempts = 0;
      while (!input && attempts < 25) {
        // Also check if response container appeared in the meantime
        if (adapter.findResponseContainer()?.textContent?.trim()?.length > 25) {
          console.log(`[SpectraLens:Tab] 🎯 Response container appeared while waiting for input!`);
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
          `[SpectraLens:Tab] ⚠️ Input box not found for "${providerId}" after 25 attempts.`,
        );
        resolve(getShortError(providerId, "Input box not found or login required"));
        return;
      }

      console.log(
        `[SpectraLens:Tab] ✍️ Input element located for "${providerId}". Inserting prompt...`,
      );

      // 3. Insert prompt
      const inserted = await adapter.insertPrompt(prompt);
      if (!inserted) {
        console.error(
          `[SpectraLens:Tab] ❌ Failed to insert prompt into "${providerId}" editor.`,
        );
        resolve(getShortError(providerId, "Failed to insert prompt"));
        return;
      }

      await new Promise((r) => setTimeout(r, 300));

      // 4. Submit
      console.log(`[SpectraLens:Tab] 🔘 Submitting prompt for "${providerId}"...`);
      await adapter.submit();

      // 5. Observe and return streaming response
      console.log(
        `[SpectraLens:Tab] ⏳ Observing response for "${providerId}"...`,
      );
      const answer = await adapter.observeResponse(22000);
      console.log(
        `[SpectraLens:Tab] ✅ Response received for "${providerId}", length: ${answer?.length || 0}`,
      );
      resolve(answer || getShortError(providerId, "No response generated"));
    } catch (e) {
      console.error(`[SpectraLens:Tab] ❌ Error running adapter:`, e);
      resolve(getShortError(providerId, e?.message || "Execution error"));
    }
  });
}

async function getGoogleAiAnswer(q, requestId) {
  const url = "https://www.google.com/?hl=en";
  console.log(
    `[SpectraLens:Background] 🔍 getGoogleAiAnswer (opening google.com -> AI Mode ON -> typing & sending prompt) for: "${q}" (requestId: ${requestId})`,
  );

  return fetchAiAnswer(url, runTabAdapter, ["google", q], requestId);
}

async function getBingAiAnswer(q, requestId) {
  const url = "https://www.bing.com/";
  console.log(
    `[SpectraLens:Background] 🔍 getBingAiAnswer (input + send button) triggered for: "${q}" (requestId: ${requestId})`,
  );

  return fetchAiAnswer(url, runTabAdapter, ["bing", q], requestId);
}

async function getGrokAnswer(q, requestId) {
  const url = `https://grok.com/?q=${encodeURIComponent(q)}`;

  return fetchAiAnswer(url, runTabAdapter, ["grok", q], requestId);
}

async function getPerplexityAnswer(q, requestId) {
  const url = `https://www.perplexity.ai/search?q=${encodeURIComponent(q)}`;

  return fetchAiAnswer(url, runTabAdapter, ["perplexity", q], requestId);
}

async function getGeminiAnswer(q, requestId) {
  const url = "https://gemini.google.com/app?hl=en";

  return fetchAiAnswer(url, runTabAdapter, ["gemini", q], requestId);
}

async function getChatGptAnswer(q, requestId) {
  const url = "https://chatgpt.com/";

  return fetchAiAnswer(url, runTabAdapter, ["chatgpt", q], requestId);
}

async function getClaudeAnswer(q, requestId) {
  const url = "https://claude.ai/new";

  return fetchAiAnswer(url, runTabAdapter, ["claude", q], requestId);
}
