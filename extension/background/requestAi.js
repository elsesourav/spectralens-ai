/* --- Request State Model & Idempotency Tracker --- */
const REQUEST_STATES = {
  IDLE: "IDLE",
  QUEUED: "QUEUED",
  STARTING: "STARTING",
  READY: "READY",
  SENDING: "SENDING",
  SUBMITTED: "SUBMITTED",
  STREAMING: "STREAMING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  TIMED_OUT: "TIMED_OUT",
  CANCELLED: "CANCELLED",
};

const PHASE_TIMEOUTS = {
  TAB_CREATE_TIMEOUT: 10000, // 10s to create or locate tab
  PAGE_READY_TIMEOUT: 15000, // 15s for page complete state
  INPUT_TIMEOUT: 10000, // 10s to find & focus input
  SUBMIT_TIMEOUT: 5000, // 5s to confirm submission
  RESPONSE_START_TIMEOUT: 15000, // 15s to detect first tokens
  RESPONSE_STREAM_TIMEOUT: 60000, // 60s max streaming duration
  COMPLETION_TIMEOUT: 90000, // 90s max overall query timeout
};

const requestStateModel = new Map(); // key: `${requestId}:${providerId}` -> { requestId, providerId, status, phase, createdAt, updatedAt }
const activeProviderLocks = new Map(); // key: providerId -> active requestId

function setRequestState(
  requestId,
  providerId,
  status,
  phase = null,
  metadata = {},
) {
  if (!requestId || !providerId) return;
  const key = `${requestId}:${providerId.toLowerCase()}`;
  const now = Date.now();
  const existing = requestStateModel.get(key);
  const state = existing
    ? {
        ...existing,
        status,
        phase: phase || existing.phase,
        updatedAt: now,
        ...metadata,
      }
    : {
        requestId,
        providerId: providerId.toLowerCase(),
        status,
        phase: phase || null,
        createdAt: now,
        updatedAt: now,
        ...metadata,
      };
  requestStateModel.set(key, state);
  const phaseStr = phase ? ` phase=${phase}` : "";
  console.log(
    `[SL REQUEST] ${requestId} provider=${providerId.toLowerCase()} event=${status}${phaseStr} timestamp=${now}`,
  );
  return state;
}

function getRequestState(requestId, providerId) {
  if (!requestId || !providerId) return null;
  return (
    requestStateModel.get(`${requestId}:${providerId.toLowerCase()}`) || null
  );
}

function createStructuredError(
  requestId,
  providerId,
  phase,
  errorCode,
  message,
  recoverable = false,
) {
  const normProv = (providerId || "").toLowerCase();
  const errorObj = {
    status: "failure",
    requestId,
    provider: normProv,
    phase,
    errorCode,
    message: message || "Provider request failed",
    timestamp: Date.now(),
    recoverable,
    answer: formatProviderError(normProv, message || errorCode),
  };
  console.log(
    `[SL REQUEST] ${requestId} provider=${normProv} event=FAILURE phase=${phase} errorCode=${errorCode} recoverable=${recoverable} timestamp=${Date.now()}`,
  );
  return errorObj;
}

/* --- Persistent AI Provider Tab Pool & Isolated Worker Window --- */
let currentRequestId = null;
let activeAiTabs = [];
const persistentProviderTabs = new Map(); // providerId -> { providerId, tabId, windowId, url, status, lastUsed, currentRequestId, adapterReady, lastHealthCheck, failureCount }
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
      activeProviderLocks.clear();
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
        activeProviderLocks.delete(providerId);
      }
    }
  });
}

/**
 * Verifies tab existence, correct URL domain, and responsiveness.
 */
async function healthCheckProviderTab(providerId, targetUrl) {
  const normKey = (providerId || "").toLowerCase();
  const entry = persistentProviderTabs.get(normKey);
  if (!entry || !entry.tabId) return { healthy: false, reason: "NO_ENTRY" };

  try {
    if (typeof chrome === "undefined" || !chrome.tabs?.get) {
      return {
        healthy: true,
        tab: { id: entry.tabId, windowId: entry.windowId },
      };
    }

    const tab = await chrome.tabs.get(entry.tabId);
    if (!tab || !tab.id) {
      persistentProviderTabs.delete(normKey);
      return { healthy: false, reason: "TAB_NOT_FOUND" };
    }

    entry.lastHealthCheck = Date.now();
    entry.lastUsed = Date.now();
    return { healthy: true, tab };
  } catch (err) {
    console.warn(
      `[SpectraLens:HealthCheck] Health check failed for ${providerId}:`,
      err?.message,
    );
    persistentProviderTabs.delete(normKey);
    return { healthy: false, reason: "TAB_GET_ERROR" };
  }
}

/**
 * Opens or retrieves a dedicated separate popup window (width: 500px, height: max)
 * for each AI provider, directly loading the target URL without blank tabs.
 */
async function openOrReuseProviderTab(providerId, url) {
  const normKey = (providerId || "").toLowerCase();

  // 1. Check if an active healthy persistent window & tab exists for this provider
  const health = await healthCheckProviderTab(normKey, url);
  if (health.healthy && health.tab) {
    const entry = persistentProviderTabs.get(normKey);
    if (entry) {
      entry.status = "READY";
      entry.lastUsed = Date.now();
    }
    return { tab: health.tab, isReused: true };
  }

  // 2. Create a separate dedicated popup worker window for this provider
  return new Promise((resolve) => {
    if (typeof chrome === "undefined" || !chrome.windows?.create) {
      chrome.tabs.create({ url, active: false }, (tab) => {
        if (tab && tab.id) {
          persistentProviderTabs.set(normKey, {
            providerId: normKey,
            tabId: tab.id,
            windowId: tab.windowId,
            url,
            status: "READY",
            lastUsed: Date.now(),
            currentRequestId: null,
            adapterReady: false,
            lastHealthCheck: Date.now(),
            failureCount: 0,
          });
        }
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
            `%c[SpectraLens:Pipeline] 🪟 Created Dedicated Worker Window #${win.id} (width: 500px, height: ${maxHeight}px) for "${normKey}"`,
            "color: #8b5cf6; font-weight: bold;",
          );
          const tab = win.tabs?.[0] || null;
          if (tab && tab.id) {
            persistentProviderTabs.set(normKey, {
              providerId: normKey,
              tabId: tab.id,
              windowId: win.id,
              url,
              status: "READY",
              lastUsed: Date.now(),
              currentRequestId: null,
              adapterReady: false,
              lastHealthCheck: Date.now(),
              failureCount: 0,
            });
            resolve({ tab, isReused: false });
            return;
          }
          chrome.tabs.query({ windowId: win.id }, (tabs) => {
            const foundTab = tabs?.[0] || null;
            if (foundTab && foundTab.id) {
              persistentProviderTabs.set(normKey, {
                providerId: normKey,
                tabId: foundTab.id,
                windowId: win.id,
                url,
                status: "READY",
                lastUsed: Date.now(),
                currentRequestId: null,
                adapterReady: false,
                lastHealthCheck: Date.now(),
                failureCount: 0,
              });
            }
            resolve({ tab: foundTab, isReused: false });
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
            const tabFallback = winFallback?.tabs?.[0] || null;
            if (tabFallback && tabFallback.id) {
              persistentProviderTabs.set(normKey, {
                providerId: normKey,
                tabId: tabFallback.id,
                windowId: winFallback.id,
                url,
                status: "READY",
                lastUsed: Date.now(),
                currentRequestId: null,
                adapterReady: false,
                lastHealthCheck: Date.now(),
                failureCount: 0,
              });
            }
            resolve({ tab: tabFallback, isReused: false });
          },
        );
      },
    );
  });
}

/** Cancels a specific AI request or all requests for a provider */
function cancelAiRequest(requestId, providerId = null) {
  if (!requestId) return;
  const providersToCancel = providerId
    ? [providerId.toLowerCase()]
    : Array.from(persistentProviderTabs.keys());

  for (const prov of providersToCancel) {
    setRequestState(requestId, prov, REQUEST_STATES.CANCELLED, "CANCELLATION");
    if (activeProviderLocks.get(prov) === requestId) {
      activeProviderLocks.delete(prov);
    }
    const entry = persistentProviderTabs.get(prov);
    if (
      entry &&
      entry.tabId &&
      typeof chrome !== "undefined" &&
      chrome.tabs?.sendMessage
    ) {
      try {
        chrome.tabs
          .sendMessage(entry.tabId, { type: "CANCEL_AI_REQUEST", requestId })
          .catch(() => {});
      } catch {}
    }
  }
}

/** Immediately cancel all ongoing AI scraper requests */
function cancelAllAiRequests() {
  currentRequestId = "cancelled_" + Date.now();
  for (const [providerId, reqId] of activeProviderLocks.entries()) {
    cancelAiRequest(reqId, providerId);
  }
  activeProviderLocks.clear();
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
    activeProviderLocks.delete(key);
  }
  activeAiTabs = activeAiTabs.filter((id) => id !== entry?.tabId);
}

/** Closes all provider windows and tabs (e.g. on New Chat, page close, or full reset) */
function resetAllProviderSessions() {
  console.log(
    "[SpectraLens:Pipeline] 🔄 Resetting all AI provider background sessions...",
  );
  currentRequestId = "reset_" + Date.now();
  for (const [providerId, reqId] of activeProviderLocks.entries()) {
    cancelAiRequest(reqId, providerId);
  }
  activeProviderLocks.clear();

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
/**
 * Opens (or reuses) an isolated background tab inside the worker window, waits for it to load,
 * executes the content extraction adapter function, and returns the cleaned HTML.
 * Keeping tabs open preserves multi-turn conversation context across queries!
 *
 * @param {string} url - The URL to open or navigate
 * @param {Function} extractFn - Function to run inside the tab (must return a Promise<string>)
 * @param {Array} [extractArgs=[]] - Arguments to pass to extractFn
 * @param {string} [requestId=null] - The unique ID for the current batch of requests
 * @param {number} [retryCount=0] - Current retry iteration
 * @returns {Promise<string>} The cleaned HTML result
 */
function fetchAiAnswer(
  url,
  extractFn,
  extractArgs = [],
  requestId = null,
  retryCount = 0,
) {
  return new Promise(async (resolve) => {
    const providerId = (extractArgs?.[0] || "ai").toLowerCase();
    console.log(
      `%c[SpectraLens:Pipeline] 🚀 [STEP 1/5] Initiating request for "${providerId}" (URL: ${url}, RequestID: ${requestId}, retry: ${retryCount})`,
      "color: #3b82f6; font-weight: bold;",
    );

    if (requestId) {
      currentRequestId = requestId;

      // Idempotency & Per-Provider Lock Check
      const activeLock = activeProviderLocks.get(providerId);
      if (activeLock === requestId) {
        const state = getRequestState(requestId, providerId);
        if (
          state &&
          (state.status === REQUEST_STATES.SENDING ||
            state.status === REQUEST_STATES.SUBMITTED ||
            state.status === REQUEST_STATES.STREAMING)
        ) {
          console.log(
            `[SL REQUEST] ${requestId} provider=${providerId} event=DUPLICATE_IGNORED timestamp=${Date.now()}`,
          );
          return;
        }
      }

      activeProviderLocks.set(providerId, requestId);
      setRequestState(requestId, providerId, REQUEST_STATES.QUEUED, "QUEUED");
    }

    let isResolved = false;
    let timeoutId = null;
    let isExecuting = false;
    let hasSubmittedForRequest = false;
    let currentPhase = "TAB_CREATE";

    const timing = {
      startTime: Date.now(),
      tabReadyAt: null,
      inputReadyAt: null,
      submitAt: null,
      firstResponseAt: null,
      completedAt: null,
    };

    setRequestState(
      requestId,
      providerId,
      REQUEST_STATES.STARTING,
      "TAB_CREATE",
    );

    // Retrieve or instantiate dedicated background worker tab directly with provider URL
    let tab = null;
    let isReused = false;

    try {
      const tabPromise = openOrReuseProviderTab(providerId, url);
      const tabTimeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("TAB_CREATE_TIMEOUT")),
          PHASE_TIMEOUTS.TAB_CREATE_TIMEOUT,
        ),
      );
      const tabResult = await Promise.race([tabPromise, tabTimeoutPromise]);
      tab = tabResult.tab;
      isReused = tabResult.isReused;
    } catch (err) {
      console.error(
        `%c[SpectraLens:Pipeline] ❌ [TAB_CREATE FAILED] for "${providerId}": ${err?.message}`,
        "color: #ef4444; font-weight: bold;",
      );
      if (requestId && activeProviderLocks.get(providerId) === requestId) {
        activeProviderLocks.delete(providerId);
      }
      setRequestState(
        requestId,
        providerId,
        REQUEST_STATES.FAILED,
        "TAB_CREATE",
      );
      const structuredErr = createStructuredError(
        requestId,
        providerId,
        "TAB_CREATE",
        "TAB_CREATE_TIMEOUT",
        "Tab creation timed out",
        retryCount === 0,
      );
      if (retryCount === 0) {
        console.log(
          `[SL REQUEST] ${requestId} provider=${providerId} event=RETRY phase=TAB_CREATE timestamp=${Date.now()}`,
        );
        persistentProviderTabs.delete(providerId);
        const retryResult = await fetchAiAnswer(
          url,
          extractFn,
          extractArgs,
          requestId,
          1,
        );
        resolve(retryResult);
        return;
      }
      resolve(structuredErr.answer);
      return;
    }

    if (!tab || !tab.id) {
      if (requestId && activeProviderLocks.get(providerId) === requestId) {
        activeProviderLocks.delete(providerId);
      }
      setRequestState(
        requestId,
        providerId,
        REQUEST_STATES.FAILED,
        "TAB_CREATE",
      );
      const structuredErr = createStructuredError(
        requestId,
        providerId,
        "TAB_CREATE",
        "TAB_NOT_FOUND",
        "Tab creation failed",
        false,
      );
      resolve(structuredErr.answer);
      return;
    }

    timing.tabReadyAt = Date.now();
    const tabId = tab.id;
    if (!activeAiTabs.includes(tabId)) {
      activeAiTabs.push(tabId);
    }
    persistentProviderTabs.set(providerId, {
      providerId,
      tabId,
      windowId: tab.windowId,
      url,
      status: "BUSY",
      lastUsed: Date.now(),
      currentRequestId: requestId,
      adapterReady: false,
      lastHealthCheck: Date.now(),
      failureCount: 0,
    });

    console.log(
      `%c[SpectraLens:Pipeline] 📑 [STEP 3/5] Background Tab #${tabId} ready (Window #${tab.windowId}, reused: ${isReused}). Listening for stream completion...`,
      "color: #10b981; font-weight: bold;",
    );
    chromeTabMediaAccess(tabId, true);
    injectMainWorldNetworkInterceptor(tabId);

    setRequestState(requestId, providerId, REQUEST_STATES.READY, "TAB_READY");

    function detachTurnListeners() {
      if (timeoutId) clearTimeout(timeoutId);
      chrome.tabs.onUpdated.removeListener(listener);
      chrome.tabs.onRemoved.removeListener(onRemoved);
    }

    function safeResolve(val) {
      if (!isResolved) {
        isResolved = true;
        detachTurnListeners();
        timing.completedAt = Date.now();
        if (requestId && activeProviderLocks.get(providerId) === requestId) {
          activeProviderLocks.delete(providerId);
        }
        const entry = persistentProviderTabs.get(providerId);
        if (entry) entry.status = "READY";

        const textVal =
          typeof val === "string" ? val : val?.answer || val?.content || "";
        const isFailure = typeof val === "object" && val?.status === "failure";

        if (isFailure) {
          setRequestState(
            requestId,
            providerId,
            REQUEST_STATES.FAILED,
            currentPhase,
          );
        } else {
          setRequestState(
            requestId,
            providerId,
            REQUEST_STATES.COMPLETED,
            "COMPLETION",
          );
        }

        // Timing Telemetry Calculations
        const tabReadyMs = timing.tabReadyAt
          ? timing.tabReadyAt - timing.startTime
          : 0;
        const inputMs =
          timing.inputReadyAt && timing.tabReadyAt
            ? timing.inputReadyAt - timing.tabReadyAt
            : 0;
        const submitMs =
          timing.submitAt && timing.inputReadyAt
            ? timing.submitAt - timing.inputReadyAt
            : 0;
        const firstResponseMs =
          timing.firstResponseAt && timing.submitAt
            ? timing.firstResponseAt - timing.submitAt
            : 0;
        const completionMs =
          timing.completedAt && timing.firstResponseAt
            ? timing.completedAt - timing.firstResponseAt
            : 0;
        const totalMs = timing.completedAt - timing.startTime;

        console.log(
          `[SL TIMING] ${requestId} provider=${providerId} tabReadyMs=${tabReadyMs} inputMs=${inputMs} submitMs=${submitMs} firstResponseMs=${firstResponseMs} completionMs=${completionMs} totalMs=${totalMs}`,
        );

        console.log(
          `%c[SpectraLens:Pipeline] ✅ [STEP 5/5] fetchAiAnswer resolved for Tab #${tabId} (Length: ${textVal.length} chars, totalMs: ${totalMs}ms).`,
          "color: #10b981; font-weight: bold;",
        );
        console.log(
          `[SL REQUEST] ${requestId} provider=${providerId} event=CLEANUP timestamp=${Date.now()}`,
        );
        resolve(textVal);
      }
    }

    // Overall Completion Timeout
    const overallTimeoutMs = isReused
      ? 80000
      : PHASE_TIMEOUTS.COMPLETION_TIMEOUT;
    timeoutId = setTimeout(() => {
      console.warn(
        `%c[SpectraLens:Pipeline] ⏱️ [TIMEOUT] ${overallTimeoutMs / 1000}s timeout reached for Tab #${tabId} in phase "${currentPhase}"`,
        "color: #ef4444; font-weight: bold;",
      );
      if (requestId && activeProviderLocks.get(providerId) === requestId) {
        activeProviderLocks.delete(providerId);
      }
      setRequestState(
        requestId,
        providerId,
        REQUEST_STATES.TIMED_OUT,
        currentPhase,
      );
      const structuredErr = createStructuredError(
        requestId,
        providerId,
        currentPhase,
        "TIMEOUT",
        `Request timed out during ${currentPhase}`,
        false,
      );
      safeResolve(structuredErr.answer);
    }, overallTimeoutMs);

    function runInjection() {
      if (isResolved || isExecuting) return;
      isExecuting = true;
      currentPhase = "SENDING";
      timing.inputReadyAt = Date.now();
      setRequestState(requestId, providerId, REQUEST_STATES.SENDING, "SENDING");

      console.log(
        `%c[SpectraLens:Pipeline] 💉 [STEP 4/5] Injecting "${providerId}" adapter script into Tab #${tabId} (isReused: ${isReused}, requestId: ${requestId})...`,
        "color: #f59e0b; font-weight: bold;",
      );
      const argsWithContext = [...extractArgs, isReused, requestId];
      executeScriptReturn(
        tabId,
        extractFn,
        async (injectResult) => {
          if (isResolved) return;
          console.log(
            `%c[SpectraLens:Pipeline] 📥 [STEP 4/5 COMPLETE] Received execution response from Tab #${tabId}:`,
            "color: #10b981;",
            injectResult,
          );
          const resultVal = injectResult?.[0]?.result;
          if (resultVal === "__NAVIGATING__") {
            isExecuting = false;
            hasSubmittedForRequest = true;
            timing.submitAt = Date.now();
            currentPhase = "RESPONSE_START";
            timing.firstResponseAt = Date.now();
            setRequestState(
              requestId,
              providerId,
              REQUEST_STATES.SUBMITTED,
              "SUBMITTED",
            );
            return;
          }

          if (!injectResult || injectResult.length === 0) {
            console.log(
              `%c[SpectraLens:Pipeline] ⏳ Tab #${tabId} script awaiting page ready or navigation...`,
              "color: #f59e0b;",
            );
            isExecuting = false;
            return;
          }

          if (
            typeof resultVal === "string" &&
            resultVal.includes("INPUT_VERIFICATION_FAILED") &&
            retryCount === 0
          ) {
            console.log(
              `[SL REQUEST] ${requestId} provider=${providerId} event=RETRY phase=VERIFY_INPUT timestamp=${Date.now()}`,
            );
            isExecuting = false;
            setTimeout(() => {
              if (!isResolved) runInjection();
            }, 600);
            return;
          }

          if (typeof resultVal === "string" && resultVal.trim().length > 0) {
            hasSubmittedForRequest = true;
            timing.submitAt = timing.submitAt || Date.now();
            timing.firstResponseAt = timing.firstResponseAt || Date.now();
            currentPhase = "COMPLETION";
            safeResolve(resultVal);
          } else if (
            resultVal &&
            typeof resultVal === "object" &&
            (resultVal.answer || resultVal.content)
          ) {
            hasSubmittedForRequest = true;
            timing.submitAt = timing.submitAt || Date.now();
            timing.firstResponseAt = timing.firstResponseAt || Date.now();
            currentPhase = "COMPLETION";
            safeResolve(resultVal.answer || resultVal.content);
          } else {
            hasSubmittedForRequest = true;
            timing.submitAt = Date.now();
            currentPhase = "RESPONSE_START";
            timing.firstResponseAt = Date.now();
            setRequestState(
              requestId,
              providerId,
              REQUEST_STATES.SUBMITTED,
              "SUBMITTED",
            );
            isExecuting = false;
          }
        },
        argsWithContext,
      );
    }

    function listener(updatedTabId, info) {
      if (isResolved) return;
      if (updatedTabId === tabId && info.status === "complete") {
        injectMainWorldNetworkInterceptor(tabId);
        if (hasSubmittedForRequest) {
          console.log(
            `[SL REQUEST] ${requestId} provider=${providerId} event=NAVIGATION_IGNORED timestamp=${Date.now()}`,
          );
          return;
        }
        if (!isExecuting) {
          runInjection();
        }
      }
    }

    function onRemoved(removedTabId) {
      if (removedTabId === tabId) {
        detachTurnListeners();
        persistentProviderTabs.delete(providerId);
        if (requestId && activeProviderLocks.get(providerId) === requestId) {
          activeProviderLocks.delete(providerId);
        }
        setRequestState(
          requestId,
          providerId,
          REQUEST_STATES.FAILED,
          "TAB_CLOSED",
        );
        activeAiTabs = activeAiTabs.filter((id) => id !== tabId);
        const structuredErr = createStructuredError(
          requestId,
          providerId,
          currentPhase,
          "TAB_CLOSED",
          "Window closed during processing",
          false,
        );
        safeResolve(structuredErr.answer);
      }
    }

    chrome.tabs.onUpdated.addListener(listener);
    chrome.tabs.onRemoved.addListener(onRemoved);

    if (isReused || tab.status === "complete") {
      runInjection();
    }
  });
}

/* --- Provider Functions --- */

/**
 * Universal content extractor function injected into provider tabs.
 * Runs in the isolated content context with full access to ProviderAdapterRegistry.
 */
function runTabAdapter(
  providerId,
  prompt,
  image,
  isReused = false,
  requestId = null,
) {
  return new Promise(async (resolve) => {
    function getShortError(pid, reason) {
      if (typeof formatProviderError === "function") {
        return formatProviderError(pid, reason);
      }
      return `> ⚠️ **Please log in to ${pid || "AI Provider"}**\n>\n> Unable to load response. Make sure you are signed in and have an active session.\n\n*Error: ${reason || "Failed"}*`;
    }

    try {
      // In-Tab Idempotency Guard
      window.__SL_SUBMITTED_REQUESTS__ =
        window.__SL_SUBMITTED_REQUESTS__ || new Set();

      const streamTimeoutMs = isReused ? 20000 : 45000;
      console.log(
        `%c[SpectraLens:Adapter] 🚀 [ADAPTER 1/4] Running adapter for "${providerId}" with timeout ${streamTimeoutMs / 1000}s (isReused: ${isReused}, requestId: ${requestId}): "${prompt.slice(0, 35)}..."`,
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

      // 0. If this exact requestId has already been submitted in this tab, observe stream directly without re-submitting!
      if (requestId && window.__SL_SUBMITTED_REQUESTS__.has(requestId)) {
        console.log(
          `[SL REQUEST] ${requestId} provider=${providerId} event=DUPLICATE_IGNORED timestamp=${Date.now()}`,
        );
        const answer = await adapter.observeResponse(
          streamTimeoutMs,
          previousContent,
        );
        resolve(answer || getShortError(providerId, "No response generated"));
        return;
      }

      // 0b. If already on search/query page for this query or response already streaming/present, observe directly!
      const urlParams = new URLSearchParams(window.location.search);
      const urlQuery = (
        urlParams.get("q") ||
        urlParams.get("query") ||
        urlParams.get("prompt") ||
        ""
      )
        .trim()
        .toLowerCase();
      const promptQuery = (prompt || "").trim().toLowerCase();
      const isUrlMatch =
        urlQuery &&
        (urlQuery === promptQuery ||
          promptQuery.startsWith(urlQuery) ||
          urlQuery.startsWith(promptQuery));
      const hasDirectAnswer = Boolean(adapter.findResponseContainer());

      if (isUrlMatch || adapter.isStreaming() || hasDirectAnswer) {
        if (requestId) {
          window.__SL_SUBMITTED_REQUESTS__.add(requestId);
        }
        console.log(
          `%c[SpectraLens:Adapter] 🎯 Provider already executing query ("${prompt.slice(0, 25)}..."). Observing AI stream directly...`,
          "color: #10b981; font-weight: bold;",
        );
        const answer = await adapter.observeResponse(
          streamTimeoutMs,
          "",
          requestId,
        );
        resolve(answer || getShortError(providerId, "No response generated"));
        return;
      }

      // Execute verified lifecycle: findInput -> focusInput -> attachImage -> insertPrompt -> verifyInput -> submit -> verifySubmission
      console.log(
        `%c[SpectraLens:Adapter] 🚀 [ADAPTER 2/4] Executing verified lifecycle for "${providerId}" (requestId: ${requestId})...`,
        "color: #3b82f6; font-weight: bold;",
      );

      if (requestId) {
        window.__SL_SUBMITTED_REQUESTS__.add(requestId);
      }

      const lifecycleResult = await adapter.executeLifecycle(
        prompt,
        image,
        requestId,
        isReused,
      );

      if (!lifecycleResult.success) {
        console.error(
          `%c[SpectraLens:Adapter] ❌ Lifecycle failed for "${providerId}" at phase "${lifecycleResult.phase}": ${lifecycleResult.error}`,
          "color: #ef4444; font-weight: bold;",
        );
        resolve(
          getShortError(
            providerId,
            lifecycleResult.error || "Submission failed",
          ),
        );
        return;
      }

      // If initial submission from Google homepage that navigates to /search results:
      const isSearchPage = window.location.pathname.startsWith("/search");
      if (!isSearchPage && providerId === "google") {
        console.log(
          `%c[SpectraLens:Adapter] 🚀 Google homepage submitted. Awaiting search navigation to complete...`,
          "color: #3b82f6; font-weight: bold;",
        );
        resolve("__NAVIGATING__");
        return;
      }

      // Transition to Response Observation
      console.log(
        `[SL REQUEST] ${requestId} provider=${providerId} event=RESPONSE_WAITING timestamp=${Date.now()}`,
      );
      console.log(
        `%c[SpectraLens:Adapter] ⏳ [ADAPTER 3/4] Observing stream response for "${providerId}" (timeout: ${streamTimeoutMs / 1000}s)...`,
        "color: #f59e0b; font-weight: bold;",
      );
      const answer = await adapter.observeResponse(
        streamTimeoutMs,
        previousContent,
        requestId,
      );
      console.log(
        `%c[SpectraLens:Adapter] ✅ [ADAPTER 4/4] Response extracted for "${providerId}", length: ${answer?.length || 0} chars`,
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
  const url = `https://www.google.com/search?q=${encodeURIComponent(q)}&hl=en`;
  console.log(
    `[SpectraLens:Background] 🔍 getGoogleAiAnswer for: "${q.slice(0, 30)}..."${image ? " (with image)" : ""} (requestId: ${requestId})`,
  );

  return fetchAiAnswer(
    url,
    runTabAdapter,
    ["google", q, image, requestId],
    requestId,
  );
}

async function getGrokAnswer(q, requestId, image = null) {
  const url = `https://grok.com/?q=${encodeURIComponent(q)}`;

  return fetchAiAnswer(
    url,
    runTabAdapter,
    ["grok", q, image, requestId],
    requestId,
  );
}

async function getPerplexityAnswer(q, requestId, image = null) {
  const url = `https://www.perplexity.ai/search?q=${encodeURIComponent(q)}`;

  return fetchAiAnswer(
    url,
    runTabAdapter,
    ["perplexity", q, image, requestId],
    requestId,
  );
}

async function getGeminiAnswer(q, requestId, image = null) {
  const url = "https://gemini.google.com/app?hl=en";

  return fetchAiAnswer(
    url,
    runTabAdapter,
    ["gemini", q, image, requestId],
    requestId,
  );
}

async function getChatGptAnswer(q, requestId, image = null) {
  const url = `https://chatgpt.com/?q=${encodeURIComponent(q)}`;

  return fetchAiAnswer(
    url,
    runTabAdapter,
    ["chatgpt", q, image, requestId],
    requestId,
  );
}

async function getClaudeAnswer(q, requestId, image = null) {
  const url = "https://claude.ai/new";

  return fetchAiAnswer(
    url,
    runTabAdapter,
    ["claude", q, image, requestId],
    requestId,
  );
}
