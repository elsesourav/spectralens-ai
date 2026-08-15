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

chrome.tabs.onRemoved.addListener(() => {
  cleanupAlwaysActiveHosts();
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
});

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
  chromeStorageGetLocal(KEYS.SETTINGS, async (settings) => {
    const tab = await getActiveTab();
    if (!tab || isInternalPage(tab) || !tab.id) return;
    if (settings?.enable) {
      __PUSH_MENU__(tab.id);
    } else {
      tabSendMessage(tab.id, "B_C_CLOSE_MENU");
    }
  });
  return sendResponse("ok");
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
  if (!tab || isInternalPage(tab) || !tab.id) return;

  chromeStorageGetLocal(KEYS.SETTINGS, async (settings) => {
    if (settings?.enable) {
      __PUSH_MENU__(tab.id);
    }
  });
});

runtimeOnMessage("C_B_SELECT_TEXT", (_, { tab }, sendResponse) => {
  __SELECT__(tab.id);
  sendResponse("ok");
});

runtimeOnMessage(
  "C_B_CAPTURE_DOM",
  ({ coordinates, devicePixelRatio }, { tab }, sendResponse) => {
    const { id, windowId } = tab;
    const rect = {
      top: coordinates.y,
      left: coordinates.x,
      width: coordinates.width,
      height: coordinates.height,
      devicePixelRatio,
    };

    chrome.tabs.captureVisibleTab(windowId, { format: "png" }, async (img) => {
      const err = chrome.runtime.lastError;
      if (err) {
        console.error("CaptureVisibleTab Error:", err.message);
        return;
      }
      if (!img) return;
      const data = await __OCR__(img, rect);
      if (data?.success && data?.result) {
        tabSendMessage(id, "B_C_OCR_RESULT", data.result);
      }
    });
    sendResponse("ok");
  },
);

runtimeOnMessage("IF_B_STOP_FETCH", (_, __, sendResponse) => {
  cancelAllAiRequests();
  sendResponse({ status: "cancelled" });
});

runtimeOnMessage("IF_B_GET_ANSWER", async ({ data }, { tab }, sendResponse) => {
  // console.log("Received request for answer:", data);
  const provider = data.provider || "google";
  const requestId = data.requestId;

  let answer;
  switch (provider) {
    case "google":
      answer = await getGoogleAiAnswer(data.question, requestId);
      break;
    case "bing":
      answer = await getBingAiAnswer(data.question, requestId);
      break;
    case "perplexity":
      answer = await getPerplexityAnswer(data.question, requestId);
      break;
    case "grok":
      answer = await getGrokAnswer(data.question, requestId);
      break;
    case "gemini":
      answer = await getGeminiAnswer(data.question, requestId);
      break;
    default:
      answer = await getGoogleAiAnswer(data.question, requestId);
  }
  sendResponse({ status: "success", answer, provider, requestId });
});
