importScripts("./../utils.js", "./bgUtils.js", "./requestAi.js");
console.log("background script loaded");

const validateAlwaysActive = async (hosts) => {
  if (hosts.length === 0) return "";
  let message = "";
  try {
    await chrome.scripting.registerContentScripts([
      {
        matches: hosts.map((h) => "*://" + h + "/*"),
        allFrames: true,
        matchOriginAsFallback: true,
        runAt: "document_start",
        id: "alwaysActiveTest",
        js: ["utils.js"], // Just use an existing file to test
      },
    ]);
  } catch (e) {
    message = e.message;
  }
  try {
    await chrome.scripting.unregisterContentScripts({
      ids: ["alwaysActiveTest"],
    });
  } catch (e) {}
  return message;
};

const activateAlwaysActive = () => {
  return new Promise((resolve) => {
    if (activateAlwaysActive.busy) return resolve();
    activateAlwaysActive.busy = true;

    chromeStorageGetLocal("alwaysActiveHosts", async (hosts) => {
      hosts = hosts || [];
      try {
        try {
          await chrome.scripting.unregisterContentScripts({
            ids: ["alwaysActiveMain", "alwaysActiveIsolated"],
          });
        } catch (e) {}

        if (hosts.length > 0) {
          const props = {
            allFrames: true,
            matchOriginAsFallback: true,
            runAt: "document_start",
          };
          if (hosts.includes("*")) {
            props.matches = ["*://*/*"];
          } else {
            props.matches = hosts.map((h) => "*://" + h + "/*");
          }

          await chrome.scripting.registerContentScripts([
            {
              ...props,
              id: "alwaysActiveMain",
              js: ["inject/alwaysActiveMain.js"],
              world: "MAIN",
            },
            {
              ...props,
              id: "alwaysActiveIsolated",
              js: ["inject/alwaysActiveIsolated.js"],
              world: "ISOLATED",
            },
          ]);
          console.log("Top Active Window scripts registered for:", hosts);
        } else {
          console.log("Top Active Window scripts unregistered (no hosts).");
        }
      } catch (e) {
        console.error("Top Active Window Registration Failed:", e);
      }

      activateAlwaysActive.busy = false;
      resolve();
    });
  });
};

const updateAlwaysActiveBadge = (tabId, url) => {
  if (!chrome.action) return;
  if (!tabId) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) updateAlwaysActiveBadge(tabs[0].id, tabs[0].url);
    });
    return;
  }
  if (!url || !url.startsWith("http")) {
    chrome.action.setBadgeText({ tabId, text: "" });
    return;
  }
  let hostname = "";
  try {
    hostname = new URL(url).hostname;
  } catch {
    // ignore
  }

  chromeStorageGetLocal("alwaysActiveHosts", (hosts) => {
    const activeHosts = Array.isArray(hosts) ? hosts : [];
    if (hostname && (activeHosts.includes(hostname) || activeHosts.includes("*"))) {
      chrome.action.setBadgeText({ tabId, text: "ON" });
      chrome.action.setBadgeBackgroundColor({ tabId, color: "#10b981" });
    } else {
      chrome.action.setBadgeText({ tabId, text: "" });
    }
  });
};

chrome.runtime.onStartup.addListener(() => {
  activateAlwaysActive();
  updateAlwaysActiveBadge();
});
chrome.runtime.onInstalled.addListener(() => {
  activateAlwaysActive();
  updateAlwaysActiveBadge();
});
chrome.storage.onChanged.addListener((changes) => {
  if (changes.alwaysActiveHosts) {
    activateAlwaysActive();
    updateAlwaysActiveBadge();
  }
});

const cleanupAlwaysActiveHosts = () => {
  chromeStorageGetLocal("alwaysActiveHosts", (storedHosts) => {
    let hosts = storedHosts || [];
    if (hosts.length === 0) return;

    chrome.tabs.query({}, (tabs) => {
      const activeTabHostnames = new Set();
      for (const tab of tabs) {
        if (tab.url && tab.url.startsWith("http")) {
          try {
            activeTabHostnames.add(new URL(tab.url).hostname);
          } catch (e) {}
        }
      }

      const newHosts = hosts.filter((h) => activeTabHostnames.has(h));
      if (newHosts.length !== hosts.length) {
        chromeStorageSetLocal("alwaysActiveHosts", newHosts, () => {
          console.log("Top Active Window: Cleaned up unused hosts");
        });
      }
    });
  });
};

// Backend tracking: Set of tab IDs where Floating AI Widget is active
const floatingWidgetHostTabs = new Set();

chrome.tabs.onRemoved.addListener(async (tabId) => {
  cleanupAlwaysActiveHosts();
  if (floatingWidgetHostTabs.has(tabId)) {
    console.log(`[SpectraLens:Background] 🚪 Tracked Floating AI Widget page #${tabId} was closed. Closing its open AI window...`);
    floatingWidgetHostTabs.delete(tabId);
    if (typeof resetAllProviderSessions === "function") {
      resetAllProviderSessions();
    }
  }

  try {
    const tabs = await getTabs();
    const remainingWebTabs = (tabs || []).filter(
      (t) => t && t.id !== tabId && !isInternalPage(t) && t.url?.startsWith("http"),
    );
    if (remainingWebTabs.length === 0) {
      console.log("[SpectraLens:Background] All user web browsing tabs closed. Cleaning up all AI provider sessions...");
      resetAllProviderSessions();
    }
  } catch {}
});
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (tab) updateAlwaysActiveBadge(tab.id, tab.url);
  });
});
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url || tab?.url) {
    cleanupAlwaysActiveHosts();
    updateAlwaysActiveBadge(tabId, changeInfo.url || tab?.url);
  }

  // Backend tracking: ONLY if a tracked Floating AI Widget host page reloads or navigates, close the open AI worker window
  if (floatingWidgetHostTabs.has(tabId) && (changeInfo.status === "loading" || changeInfo.url)) {
    console.log(`[SpectraLens:Background] 🔄 Tracked Floating AI Widget page #${tabId} reloaded or navigated. Closing its open AI window...`);
    floatingWidgetHostTabs.delete(tabId);
    if (typeof resetAllProviderSessions === "function") {
      resetAllProviderSessions();
    }
  }
});

// Explicit reload/pagehide notification from chat widget host page
runtimeOnMessage("IF_B_PAGE_RELOADED", (_, sender) => {
  const senderTabId = sender?.tab?.id;
  if (!senderTabId) return;

  // Never reset if the reload event came from an internal AI worker tab
  const isAiTab =
    (typeof activeAiTabs !== "undefined" && activeAiTabs.includes(senderTabId)) ||
    (typeof persistentProviderTabs !== "undefined" &&
      Array.from(persistentProviderTabs.values()).some((e) => e.tabId === senderTabId));

  if (isAiTab) return;

  if (floatingWidgetHostTabs.has(senderTabId)) {
    floatingWidgetHostTabs.delete(senderTabId);
    console.log(`[SpectraLens:Background] 🔄 Tracked host page #${senderTabId} beforeunload/pagehide received. Resetting AI worker window...`);
    if (typeof resetAllProviderSessions === "function") {
      resetAllProviderSessions();
    }
  }
});

// Live monitor for disabled AI providers in Settings to close background tabs immediately
if (typeof chrome !== "undefined" && chrome.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes) => {
    if (changes[KEYS.CONTROLS]) {
      const oldVal = changes[KEYS.CONTROLS].oldValue;
      const newVal = changes[KEYS.CONTROLS].newValue;
      const oldControls = typeof oldVal === "string" ? JSON.parse(oldVal || "{}") : oldVal || {};
      const newControls = typeof newVal === "string" ? JSON.parse(newVal || "{}") : newVal || {};

      const allProviders = ["google", "chatgpt", "claude", "gemini", "grok", "perplexity", "bing"];
      allProviders.forEach((p) => {
        const wasEnabled = oldControls?.providers?.[p]?.enabled !== false;
        const isEnabled = newControls?.providers?.[p]?.enabled !== false;
        if (wasEnabled && !isEnabled) {
          console.log(`[SpectraLens:Background] 🔕 Provider "${p}" disabled in settings. Closing background tab...`);
          closeProviderTab(p);
        }
      });
    }
  });
}

runtimeOnMessage("P_B_TOGGLE_ALWAYS_ACTIVE", async (_, __, sendResponse) => {
  const tab = await getActiveTab();
  if (!tab || !tab.url?.startsWith("http")) {
    sendResponse("error: not a valid tab");
    return;
  }

  chromeStorageGetLocal("alwaysActiveHosts", async (storedHosts) => {
    let hosts = storedHosts || [];

    const a = await chrome.scripting
      .executeScript({
        target: { tabId: tab.id, allFrames: true },
        func: () => location.hostname,
        injectImmediately: true,
      })
      .catch(() => [{ result: new URL(tab.url).hostname, frameId: 0 }]);

    const hostnames = (a || [])
      .map((o) => o.result)
      .filter((s, i, l) => s && l.indexOf(s) === i);
    const top = a.find((o) => o.frameId === 0)?.result;

    if (top) {
      const n = hosts.indexOf(top);
      if (n >= 0) {
        // Remove
        for (const hostname of hostnames) {
          const idx = hosts.indexOf(hostname);
          if (idx >= 0) hosts.splice(idx, 1);
        }
      } else {
        // Add
        for (const hostname of hostnames) {
          if (hosts.indexOf(hostname) < 0) hosts.push(hostname);
        }
      }

      const error = await validateAlwaysActive(hosts);
      if (error) {
        console.error(error);
      } else {
        chromeStorageSetLocal("alwaysActiveHosts", hosts, async () => {
          await activateAlwaysActive();
          chrome.tabs.reload(tab.id);
        });
      }
    }
  });
  sendResponse("ok");
});

runtimeOnMessage("P_B_SET_ALWAYS_ACTIVE_ICON", (_, { tab }, sendResponse) => {
  if (tab && tab.id) {
    chrome.action.setIcon({
      tabId: tab.id,
      path: {
        16: "/assets/icons/active/16.png",
        24: "/assets/icons/active/24.png",
        32: "/assets/icons/active/32.png",
        48: "/assets/icons/active/48.png",
        128: "/assets/icons/active/128.png",
      },
    });
  }
  sendResponse("ok");
});

runtimeOnMessage("P_B_TOGGLE", async (_, __, sendResponse) => {
  const tab = await getActiveTab();
  if (!tab || isInternalPage(tab) || !tab.id || !tab.url?.startsWith("http")) {
    sendResponse("error: not a valid tab");
    return;
  }

  let hostname = "";
  try {
    hostname = new URL(tab.url).hostname;
  } catch (e) {}

  if (!hostname) {
    sendResponse("error: invalid hostname");
    return;
  }

  chromeStorageGetLocal(KEYS.MENU_HOSTS, async (storedHosts) => {
    let hosts = storedHosts;
    if (typeof hosts === "string") {
      try {
        hosts = JSON.parse(hosts);
      } catch {
        hosts = [];
      }
    }
    if (!Array.isArray(hosts)) hosts = [];

    const idx = hosts.indexOf(hostname);
    if (idx >= 0) {
      // Toggle off for this site
      hosts.splice(idx, 1);
      chromeStorageSetLocal(KEYS.MENU_HOSTS, hosts, () => {
        tabSendMessage(tab.id, "B_C_CLOSE_MENU");
        resetAllProviderSessions();
        chromeStorageSetLocal(KEYS.SETTINGS, { enable: hosts.length > 0, menuHosts: hosts });
      });
    } else {
      // Toggle on for this site
      hosts.push(hostname);
      chromeStorageSetLocal(KEYS.MENU_HOSTS, hosts, () => {
        injectFloatingMenuWidget(tab.id);
        chromeStorageSetLocal(KEYS.SETTINGS, { enable: true, menuHosts: hosts });
      });
    }
  });
  return sendResponse("ok");
});

runtimeOnMessage("IF_B_NEW_CHAT", (_, __, sendResponse) => {
  resetAllProviderSessions();
  sendResponse && sendResponse({ status: "reset" });
});

runtimeOnMessage("IF_B_CLOSE_PROVIDER_TAB", (data, __, sendResponse) => {
  const providerId = data?.providerId || data?.provider;
  if (providerId) {
    closeProviderTab(providerId);
  }
  sendResponse && sendResponse({ status: "ok" });
});

runtimeOnMessage("P_B_RESET_WIDGET_POSITION", async (_, __, sendResponse) => {
  const tabs = await getTabs();
  for (const tab of tabs) {
    if (tab && !isInternalPage(tab) && tab.id) {
      tabSendMessage(tab.id, "B_C_RESET_POSITION");
    }
  }
  return sendResponse("ok");
});

runtimeOnMessage("C_B_ON_LOAD", (_, sender, sendResponse) => {
  sendResponse("ok");
  const tab = sender?.tab;
  if (!tab || isInternalPage(tab) || !tab.id || !tab.url?.startsWith("http")) return;

  let hostname = "";
  try {
    hostname = new URL(tab.url).hostname;
  } catch (e) {}

  if (!hostname) return;

  chromeStorageGetLocal(KEYS.MENU_HOSTS, async (storedHosts) => {
    let hosts = storedHosts;
    if (typeof hosts === "string") {
      try {
        hosts = JSON.parse(hosts);
      } catch {
        hosts = [];
      }
    }
    if (!Array.isArray(hosts)) hosts = [];

    if (hosts.includes(hostname) || hosts.includes("*")) {
      injectFloatingMenuWidget(tab.id);
    }
  });
});

runtimeOnMessage("C_B_SELECT_TEXT", (_, { tab }, sendResponse) => {
  injectScreenSelector(tab.id);
  sendResponse("ok");
});

runtimeOnMessage(
  "C_B_CAPTURE_DOM",
  async ({ coordinates, devicePixelRatio }, sender, sendResponse) => {
    sendResponse("ok");
    if (!coordinates) return;

    let tabId = sender?.tab?.id;
    let windowId = sender?.tab?.windowId;

    if (!tabId || !windowId) {
      const [activeTab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (activeTab) {
        tabId = activeTab.id;
        windowId = activeTab.windowId;
      }
    }

    if (!windowId || !tabId) return;

    // Use relative viewport coordinates if available to prevent scroll offset discrepancy
    const top =
      coordinates.relative?.y !== undefined
        ? coordinates.relative.y
        : coordinates.y;
    const left =
      coordinates.relative?.x !== undefined
        ? coordinates.relative.x
        : coordinates.x;

    const rect = {
      top: Math.max(0, top),
      left: Math.max(0, left),
      width: Math.max(1, coordinates.width),
      height: Math.max(1, coordinates.height),
      devicePixelRatio: devicePixelRatio || 1,
    };

    const onImageCaptured = async (img) => {
      if (!img) return;
      try {
        const data = await performCropExtraction(img, rect);
        if (data?.success && data?.image) {
          tabSendMessage(tabId, "B_C_AREA_RESULT", {
            image: data.image,
          });
          tabSendMessage(tabId, "B_C_OCR_RESULT", {
            image: data.image,
            text: "",
          });
        }
      } catch (e) {
        console.error("Area crop error:", e);
      }
    };

    if (typeof windowId === "number") {
      chrome.tabs.captureVisibleTab(windowId, { format: "png" }, (img) => {
        const err = chrome.runtime.lastError;
        if (err || !img) {
          chrome.tabs.captureVisibleTab({ format: "png" }, (fallbackImg) => {
            if (fallbackImg) onImageCaptured(fallbackImg);
          });
          return;
        }
        onImageCaptured(img);
      });
    } else {
      chrome.tabs.captureVisibleTab({ format: "png" }, (img) => {
        if (img) onImageCaptured(img);
      });
    }
  },
);

runtimeOnMessage("TAB_LOG", (data, sender) => {
  const tag = data?.tag || (sender?.tab ? `Tab #${sender.tab.id}` : "Tab");
  const msg = data?.message || "";
  const extra = data?.data
    ? typeof data.data === "object"
      ? JSON.stringify(data.data)
      : data.data
    : "";
  console.log(`[SpectraLens:${tag}] ${msg} ${extra}`);
});

runtimeOnMessage("IF_B_STOP_FETCH", (_, __, sendResponse) => {
  cancelAllAiRequests();
  sendResponse({ status: "cancelled" });
});

runtimeOnMessage("IF_B_CAPTURE_SCREEN", (payload, sender, sendResponse) => {
  const windowId = sender?.tab?.windowId;
  const captureOptions = { format: "png" };

  const handleCapture = (img) => {
    if (img) {
      sendResponse({ success: true, image: img });
    } else {
      sendResponse({ success: false, error: "Failed to capture screen" });
    }
  };

  if (typeof windowId === "number") {
    chrome.tabs.captureVisibleTab(windowId, captureOptions, (img) => {
      if (chrome.runtime.lastError || !img) {
        chrome.tabs.captureVisibleTab(captureOptions, (fallbackImg) => {
          handleCapture(fallbackImg);
        });
        return;
      }
      handleCapture(img);
    });
  } else {
    chrome.tabs.captureVisibleTab(captureOptions, (img) => {
      handleCapture(img);
    });
  }
  return true; // Keep channel open for async response
});

runtimeOnMessage("IF_B_GET_ANSWER", async (payload, sender, sendResponse) => {
  const data = payload?.data || payload || {};
  const provider = data.provider || "google";
  const requestId = data.requestId;
  const question = data.question || "";
  const image = data.image || null;
  console.log(`[SpectraLens:Background] 📨 Received IF_B_GET_ANSWER for provider: "${provider}", question: "${question.slice(0, 30)}..."${image ? " (with direct Base64 image)" : ""} (requestId: ${requestId})`);

  let answer = "";
  try {
    switch (provider) {
      case "google":
        answer = await getGoogleAiAnswer(question, requestId, image);
        break;
      case "bing":
        answer = await getBingAiAnswer(question, requestId, image);
        break;
      case "perplexity":
        answer = await getPerplexityAnswer(question, requestId, image);
        break;
      case "grok":
        answer = await getGrokAnswer(question, requestId, image);
        break;
      case "gemini":
        answer = await getGeminiAnswer(question, requestId, image);
        break;
      case "chatgpt":
        answer = await getChatGptAnswer(question, requestId, image);
        break;
      case "claude":
        answer = await getClaudeAnswer(question, requestId, image);
        break;
      default:
        answer = await getGoogleAiAnswer(question, requestId, image);
    }
  } catch (err) {
    console.error(`[SpectraLens:Background] ❌ Error in IF_B_GET_ANSWER for ${provider}:`, err);
    answer = typeof formatProviderError === "function"
      ? formatProviderError(provider, err?.message || "Failed to fetch response")
      : `> ⚠️ **Please log in to ${provider}**\n>\n> Unable to load response.\n\n*Error: ${err?.message || "Failed"}*`;
  }

  console.log(`[SpectraLens:Background] 📤 Sending response back to content script for provider: "${provider}", answer length: ${answer?.length || 0}`);
  sendResponse({ status: "success", answer, provider, requestId });
  return true;
});
