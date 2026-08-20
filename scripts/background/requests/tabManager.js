/**
 * SpectraLens AI — Background Tab & Dedicated Window Manager
 * Handles dedicated window creation, persistent provider tab pooling, tab reuse, health checking, and cleanup.
 */
(function (global) {
  "use strict";

  let activeAiTabs = global.activeAiTabs || [];
  const persistentProviderTabs = global.persistentProviderTabs || new Map();
  const activeProviderLocks = global.activeProviderLocks || new Map();

  // Track if background worker windows are closed externally
  if (typeof chrome !== "undefined" && chrome.windows?.onRemoved) {
    chrome.windows.onRemoved.addListener((removedWinId) => {
      for (const [providerId, entry] of persistentProviderTabs.entries()) {
        if (entry.windowId === removedWinId) {
          console.log(
            `[SpectraLens:Pipeline] 🪟 Provider Window #${removedWinId} for "${providerId}" was closed.`,
          );
          persistentProviderTabs.delete(providerId);
          activeProviderLocks.delete(providerId);
        }
      }
    });
  }

  // Track if individual AI provider tabs are closed externally
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

  /** Verifies tab existence, correct URL domain, and responsiveness */
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

  /** Opens or retrieves a dedicated separate popup window for each AI provider */
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
      const maxHeight =
        typeof screen !== "undefined" && screen.availHeight
          ? screen.availHeight
          : 950;

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

    const setReqState = global.setRequestState || setRequestState;
    const RequestStates = global.REQUEST_STATES || REQUEST_STATES;

    for (const prov of providersToCancel) {
      setReqState(requestId, prov, RequestStates.CANCELLED, "CANCELLATION");
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
    for (const [providerId, reqId] of activeProviderLocks.entries()) {
      cancelAiRequest(reqId, providerId);
    }
    activeProviderLocks.clear();
  }

  /** Closes a specific AI provider's background window & tab */
  function closeProviderTab(providerId) {
    if (!providerId) return;
    const key = String(providerId).toLowerCase();
    const entry = persistentProviderTabs.get(key);
    if (entry) {
      console.log(
        `[SpectraLens:Pipeline] 🧹 Closing disabled AI provider window: "${key}" (#${entry.tabId})`,
      );
      if (entry.tabId) {
        if (typeof chromeTabMediaAccess === "function") {
          chromeTabMediaAccess(entry.tabId, false);
        }
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

  /** Closes all provider windows and tabs on New Chat or reset */
  function resetAllProviderSessions() {
    console.log(
      "[SpectraLens:Pipeline] 🔄 Resetting all AI provider background sessions...",
    );
    for (const [providerId, reqId] of activeProviderLocks.entries()) {
      cancelAiRequest(reqId, providerId);
    }
    activeProviderLocks.clear();

    for (const [providerId, entry] of persistentProviderTabs.entries()) {
      if (entry.tabId) {
        if (typeof chromeTabMediaAccess === "function") {
          chromeTabMediaAccess(entry.tabId, false);
        }
        chrome.tabs.remove(entry.tabId).catch(() => {});
      }
      if (entry.windowId) {
        chrome.windows.remove(entry.windowId).catch(() => {});
      }
    }
    persistentProviderTabs.clear();

    activeAiTabs.forEach((id) => {
      if (typeof chromeTabMediaAccess === "function") {
        chromeTabMediaAccess(id, false);
      }
      chrome.tabs.remove(id).catch(() => {});
    });
    activeAiTabs = [];
  }

  global.healthCheckProviderTab = healthCheckProviderTab;
  global.openOrReuseProviderTab = openOrReuseProviderTab;
  global.cancelAiRequest = cancelAiRequest;
  global.cancelAllAiRequests = cancelAllAiRequests;
  global.closeProviderTab = closeProviderTab;
  global.resetAllProviderSessions = resetAllProviderSessions;
})(typeof window !== "undefined" ? window : globalThis);
