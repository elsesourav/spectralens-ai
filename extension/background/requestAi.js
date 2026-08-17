/* --- Request Cancellation State --- */
let currentRequestId = null;
let activeAiTabs = [];

/** Immediately cancel all ongoing AI scraper requests and close all active scraper tabs */
function cancelAllAiRequests() {
  currentRequestId = "cancelled_" + Date.now();
  const tabsToClose = [...activeAiTabs];
  activeAiTabs = [];
  tabsToClose.forEach((id) => {
    chromeTabMediaAccess(id, false);
    chrome.tabs.remove(id).catch(() => {});
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
 * Opens a background tab, waits for it to load, executes a content
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
      `%c[SpectraLens:Pipeline] 🚀 [STEP 1/5] Initiating request for "${providerId}" (URL: ${url}, RequestID: ${requestId})`,
      "color: #3b82f6; font-weight: bold;",
    );

    // If we have a new requestId, cancel all existing fetching tabs
    if (requestId && currentRequestId !== requestId) {
      console.log(
        `%c[SpectraLens:Pipeline] 🔄 New batch detected. Cancelling previous tabs...`,
        "color: #f59e0b;",
      );
      cancelAllAiRequests();
      currentRequestId = requestId;
    }

    let isResolved = false;
    let timeoutId = null;
    let isExecuting = false;

    console.log(
      `%c[SpectraLens:Pipeline] 📑 [STEP 2/5] Creating background tab in current browser window (active: false)...`,
      "color: #3b82f6;",
    );

    chrome.tabs.create({ url, active: false }, (tab) => {
      if (!tab || !tab.id) {
        console.error(
          `%c[SpectraLens:Pipeline] ❌ [STEP 2/5 FAILED] Failed to create background tab for ${url}`,
          "color: #ef4444; font-weight: bold;",
        );
        resolve(formatProviderError(providerId, "Tab creation failed"));
        return;
      }

      const tabId = tab.id;
      activeAiTabs.push(tabId);
      console.log(
        `%c[SpectraLens:Pipeline] 📑 [STEP 3/5] Background Tab #${tabId} created (active: false, title: "${tab.title || "Loading..."}"). Enabling media access & listening for load completion...`,
        "color: #10b981; font-weight: bold;",
      );
      chromeTabMediaAccess(tabId, true);

      function cleanup() {
        if (timeoutId) clearTimeout(timeoutId);
        chrome.tabs.onUpdated.removeListener(listener);
        chrome.tabs.onRemoved.removeListener(onRemoved);
        chromeTabMediaAccess(tabId, false);
        console.log(
          `%c[SpectraLens:Pipeline] 🧹 [CLEANUP] Closing background Tab #${tabId} to keep browser clean...`,
          "color: #8b5cf6;",
        );
        chrome.tabs.remove(tabId).catch(() => {});
        activeAiTabs = activeAiTabs.filter((id) => id !== tabId);
      }

      function safeResolve(val) {
        if (!isResolved) {
          isResolved = true;
          cleanup();
          console.log(
            `%c[SpectraLens:Pipeline] ✅ [STEP 5/5] fetchAiAnswer resolved for Tab #${tabId} (Content Length: ${val?.length || 0} chars)`,
            "color: #10b981; font-weight: bold;",
          );
          resolve(val);
        }
      }

      // 25s timeout protection
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
            console.log(
              `%c[SpectraLens:Pipeline] 📥 [STEP 4/5 COMPLETE] Received execution response from Tab #${tabId}:`,
              "color: #10b981;",
              injectResult,
            );
            const cleanedHtml = injectResult?.[0]?.result;
            if (cleanedHtml) {
              safeResolve(cleanedHtml);
            } else {
              safeResolve(formatProviderError(providerId, "No response generated"));
            }
          },
          extractArgs,
        );
      }

      function listener(updatedTabId, info) {
        if (updatedTabId === tabId && info.status === "complete") {
          console.log(
            `%c[SpectraLens:Pipeline] 🌐 [PAGE LOAD COMPLETE] Tab #${tabId} status is "complete". Running adapter injection...`,
            "color: #3b82f6; font-weight: bold;",
          );
          runInjection();
        }
      }

      chrome.tabs.onUpdated.addListener(listener);

      // If the tab was already complete when created, run immediately
      if (tab.status === "complete") {
        console.log(
          `%c[SpectraLens:Pipeline] ⚡ Tab #${tabId} already in "complete" state. Running adapter immediately...`,
          "color: #3b82f6;",
        );
        runInjection();
      }

      // Handle cases where the tab is closed before it finishes (e.g. by cancellation)
      function onRemoved(removedTabId) {
        if (removedTabId === tabId) {
          console.log(
            `%c[SpectraLens:Pipeline] 🚪 Tab #${tabId} was closed externally by user or system.`,
            "color: #ef4444;",
          );
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

      // 1. FAST PATH: Check if response container is already loaded (e.g. from direct search URL)
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

      await new Promise((r) => setTimeout(r, 300));

      // 4. Submit
      console.log(
        `%c[SpectraLens:Adapter] 🔘 Submitting prompt for "${providerId}"...`,
        "color: #3b82f6; font-weight: bold;",
      );
      await adapter.submit();

      // 5. Observe and return streaming response
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
