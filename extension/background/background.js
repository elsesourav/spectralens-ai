importScripts(
  "./../utils.js",
  "./bgUtils.js",
  "./networkInterceptor.js",
  "./requestAi.js"
);
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
chrome.runtime.onInstalled.addListener((details) => {
  activateAlwaysActive();
  updateAlwaysActiveBadge();

  // Set uninstall / offboarding feedback URL
  if (chrome.runtime.setUninstallURL) {
    try {
      chrome.runtime.setUninstallURL(
        "https://github.com/elsesourav/spectralens-ai/issues/new?template=feedback.md&title=%5BUninstall+Feedback%5D+SpectraLens+AI"
      );
    } catch (e) {
      console.warn("[Background] Failed to set uninstall URL:", e);
    }
  }

  // On first install, open the onboarding welcome tour page
  if (details && details.reason === "install") {
    if (chrome.tabs && chrome.tabs.create) {
      try {
        chrome.tabs.create({
          url: chrome.runtime.getURL("options/options.html#welcome"),
        });
      } catch (e) {
        console.warn("[Background] Failed to open welcome tab on install:", e);
      }
    }
  }
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
globalThis.floatingWidgetHostTabs = floatingWidgetHostTabs;

const registerWidgetHostTab = (senderTabId) => {
  if (!senderTabId) return;
  const isAiTab =
    (typeof activeAiTabs !== "undefined" && activeAiTabs.includes(senderTabId)) ||
    (typeof persistentProviderTabs !== "undefined" &&
      Array.from(persistentProviderTabs.values()).some((e) => e.tabId === senderTabId));
  if (!isAiTab) {
    floatingWidgetHostTabs.add(senderTabId);
  }
};

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
  const currentUrl = changeInfo.url || tab?.url || "";

  if (changeInfo.url || tab?.url) {
    cleanupAlwaysActiveHosts();
    updateAlwaysActiveBadge(tabId, currentUrl);
  }

  // Never reset if the reload or update event came from an internal AI worker tab
  const isAiTab =
    (typeof activeAiTabs !== "undefined" && activeAiTabs.includes(tabId)) ||
    (typeof persistentProviderTabs !== "undefined" &&
      Array.from(persistentProviderTabs.values()).some((e) => e.tabId === tabId));
  if (isAiTab) return;

  // Track page reload lifecycle ("loading" or "complete")
  if (changeInfo.status === "loading" || changeInfo.status === "complete" || changeInfo.url) {
    let hostname = "";
    if (currentUrl && currentUrl.startsWith("http")) {
      try {
        hostname = new URL(currentUrl).hostname;
      } catch {}
    }

    const checkAndKillWorkerTabs = (reason) => {
      const hasOpenAiTabs =
        (typeof persistentProviderTabs !== "undefined" && persistentProviderTabs.size > 0) ||
        (typeof activeAiTabs !== "undefined" && activeAiTabs.length > 0);

      if (hasOpenAiTabs) {
        console.log(
          `[SpectraLens:Background] 🔄 ${reason} on tab #${tabId} (${hostname || currentUrl}) [status: ${changeInfo.status || "navigated"}]. Killing open AI provider tabs...`,
        );
        if (typeof resetAllProviderSessions === "function") {
          resetAllProviderSessions();
        }
      }
    };

    if (floatingWidgetHostTabs.has(tabId)) {
      checkAndKillWorkerTabs("Tracked Floating AI Widget host page reloaded/navigated");
    } else if (hostname && typeof chromeStorageGetLocal === "function") {
      chromeStorageGetLocal(["alwaysActiveHosts", KEYS.MENU_HOSTS], (res) => {
        let alwaysHosts = res?.alwaysActiveHosts || [];
        let menuHosts = res?.[KEYS.MENU_HOSTS] || [];
        if (typeof menuHosts === "string") {
          try {
            menuHosts = JSON.parse(menuHosts);
          } catch {
            menuHosts = [];
          }
        }
        if (!Array.isArray(alwaysHosts)) alwaysHosts = [];
        if (!Array.isArray(menuHosts)) menuHosts = [];

        const isEnabledHost =
          alwaysHosts.includes(hostname) ||
          menuHosts.includes(hostname) ||
          menuHosts.includes("*");

        if (isEnabledHost) {
          floatingWidgetHostTabs.add(tabId);
          checkAndKillWorkerTabs("Enabled AI Widget host page reloaded/navigated");
        }
      });
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

  console.log(
    `[SpectraLens:Background] 🔄 Host page #${senderTabId} beforeunload/pagehide received. Killing open AI provider tabs...`,
  );
  if (typeof resetAllProviderSessions === "function") {
    resetAllProviderSessions();
  }
});

// Register active host tab when floating widget is injected or interacted with
runtimeOnMessage("IF_B_REGISTER_HOST", (_, sender, sendResponse) => {
  const senderTabId = sender?.tab?.id;
  if (senderTabId) {
    registerWidgetHostTab(senderTabId);
  }
  sendResponse && sendResponse({ status: "registered" });
});

// Live monitor for disabled AI providers in Settings to close background tabs immediately
if (typeof chrome !== "undefined" && chrome.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes) => {
    if (changes[KEYS.CONTROLS]) {
      const oldVal = changes[KEYS.CONTROLS].oldValue;
      const newVal = changes[KEYS.CONTROLS].newValue;
      const oldControls = typeof oldVal === "string" ? JSON.parse(oldVal || "{}") : oldVal || {};
      const newControls = typeof newVal === "string" ? JSON.parse(newVal || "{}") : newVal || {};

      const allProviders = ["google", "chatgpt", "claude", "gemini", "grok", "perplexity"];
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

// 6-Minute Chat Inactivity Auto-Reset Watchdog
const CHAT_INACTIVITY_LIMIT_MS = 6 * 60 * 1000; // 6 minutes (360,000 ms)
let chatInactivityTimer = null;

function resetChatInactivityTimer() {
  if (chatInactivityTimer) {
    clearTimeout(chatInactivityTimer);
    chatInactivityTimer = null;
  }
  chatInactivityTimer = setTimeout(() => {
    console.log(
      "[SpectraLens:Background] ⏳ 6-minute chat inactivity limit reached. Auto-closing all open AI provider tabs and broadcasting new chat...",
    );
    if (typeof resetAllProviderSessions === "function") {
      resetAllProviderSessions();
    }
    if (typeof floatingWidgetHostTabs !== "undefined") {
      for (const hostTabId of floatingWidgetHostTabs) {
        tabSendMessage(hostTabId, "B_C_RESET_INACTIVITY_NEW_CHAT");
      }
    }
  }, CHAT_INACTIVITY_LIMIT_MS);
}

function clearChatInactivityTimer() {
  if (chatInactivityTimer) {
    clearTimeout(chatInactivityTimer);
    chatInactivityTimer = null;
  }
}

runtimeOnMessage("IF_B_PING_ACTIVITY", (_, sender, sendResponse) => {
  if (sender?.tab?.id) {
    registerWidgetHostTab(sender.tab.id);
  }
  resetChatInactivityTimer();
  sendResponse && sendResponse({ status: "ok" });
});

runtimeOnMessage("IF_B_NEW_CHAT", (_, sender, sendResponse) => {
  if (sender?.tab?.id) {
    registerWidgetHostTab(sender.tab.id);
  }
  clearChatInactivityTimer();
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

runtimeOnMessage("IF_B_OPEN_LOGIN_PAGE", async (data, __, sendResponse) => {
  try {
    const url = data?.url || data?.loginUrl || "https://google.com";
    if (typeof chrome !== "undefined" && chrome.tabs?.create) {
      await chrome.tabs.create({ url, active: true });
    }
  } catch (err) {
    console.error("[SpectraLens:Background] Failed to open login page:", err);
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
  async ({ coordinates, devicePixelRatio, mode }, sender, sendResponse) => {
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
        if (mode === "ocr") {
          const data = await performOcrExtraction(img, rect);
          if (data?.success) {
            tabSendMessage(tabId, "B_C_OCR_RESULT", {
              image: data.image,
              text: data.text || "",
            });
          }
        } else {
          const data = await performCropExtraction(img, rect);
          if (data?.success && data?.image) {
            tabSendMessage(tabId, "B_C_AREA_RESULT", {
              image: data.image,
            });
          }
        }
      } catch (e) {
        console.error("Area/OCR capture error:", e);
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

runtimeOnMessage("IF_B_STOP_FETCH", (_, sender, sendResponse) => {
  if (sender?.tab?.id) {
    registerWidgetHostTab(sender.tab.id);
  }
  cancelAllAiRequests();
  sendResponse({ status: "cancelled" });
});

runtimeOnMessage("IF_B_CAPTURE_SCREEN", (payload, sender, sendResponse) => {
  if (sender?.tab?.id) {
    registerWidgetHostTab(sender.tab.id);
  }
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
  if (sender?.tab?.id) {
    registerWidgetHostTab(sender.tab.id);
  }
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

  console.log(
    `%c[SpectraLens:Background] 📦 ==================== FULL RAW AI OUTPUT DATA [${provider.toUpperCase()}] ====================`,
    "color: #8b5cf6; font-weight: bold; font-size: 13px;",
  );
  console.log(
    `[SpectraLens:Background] Provider: "${provider}" | RequestID: ${requestId} | Character Length: ${answer?.length || 0}`,
  );
  console.log(`[SpectraLens:Background] RAW OUTPUT CONTENT:\n`, answer);
  console.log(
    `%c[SpectraLens:Background] =========================================================================================`,
    "color: #8b5cf6; font-weight: bold; font-size: 13px;",
  );
  console.log(
    `[SpectraLens:Background] 📤 Sending response back to content script for provider: "${provider}", answer length: ${answer?.length || 0}`,
  );
  sendResponse({ status: "success", answer, provider, requestId });
  return true;
});
