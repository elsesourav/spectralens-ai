(() => {
  let isEnabled = false;

  const neutralizeEvent = (e) => {
    e.preventDefault = () => {};
    try {
      Object.defineProperty(e, "returnValue", {
        get: () => true,
        set: () => {},
        configurable: true,
      });
    } catch (err) {}
  };

  /* 1. Contextmenu: prevent sites from blocking right-click */
  window.addEventListener(
    "contextmenu",
    (e) => {
      if (isEnabled) {
        e.stopImmediatePropagation();
      }
    },
    true
  );

  /* 2. Copy: allow copy event without site cancellation */
  window.addEventListener(
    "copy",
    (e) => {
      if (isEnabled) {
        neutralizeEvent(e);
      }
    },
    true
  );

  /* 3. Paste: allow paste and protect input field values */
  window.addEventListener(
    "paste",
    (e) => {
      if (!isEnabled) return;
      const target = e.target;
      const tagName = target?.tagName;

      if (tagName === "INPUT" || tagName === "TEXTAREA") {
        e.stopImmediatePropagation();
        ((el) => {
          const t = el?.tagName;
          if (t !== "INPUT" && t !== "TEXTAREA") return;
          setTimeout(() => {
            const val = el.value;
            if (!val) return;
            let n = 0;
            const interval = setInterval(() => {
              if (++n > 20) {
                clearInterval(interval);
              } else if (el.value === "") {
                clearInterval(interval);
                el.value = val;
                el.dispatchEvent(new Event("input", { bubbles: true }));
                el.dispatchEvent(new Event("change", { bubbles: true }));
              }
            }, 30);
          }, 20);
        })(target);
      } else {
        neutralizeEvent(e);
      }
    },
    true
  );

  /* 4. BeforeInput: allow pasting into input fields */
  window.addEventListener(
    "beforeinput",
    (e) => {
      if (
        isEnabled &&
        (e.inputType === "insertFromPaste" ||
          e.inputType === "insertFromPasteAsQuotation")
      ) {
        neutralizeEvent(e);
      }
    },
    true
  );

  /* 5. Keydown: prevent sites from blocking Ctrl+C, Ctrl+V, Cmd+C, Cmd+V */
  window.addEventListener(
    "keydown",
    (e) => {
      if (
        isEnabled &&
        (e.ctrlKey || e.metaKey) &&
        (e.key === "c" ||
          e.key === "v" ||
          e.key === "x" ||
          e.key === "a" ||
          e.key === "C" ||
          e.key === "V" ||
          e.key === "X" ||
          e.key === "A")
      ) {
        e.stopImmediatePropagation();
      }
    },
    true
  );

  /* 6. SelectStart: prevent sites from disabling text selection */
  window.addEventListener(
    "selectstart",
    (e) => {
      if (isEnabled) {
        neutralizeEvent(e);
        e.stopImmediatePropagation();
      }
    },
    true
  );

  /* 7. Neutralize inline event properties */
  const dummyProp = {
    get: () => null,
    set: () => {},
    configurable: true,
  };
  try { Object.defineProperty(window, "oncontextmenu", dummyProp); } catch (e) {}
  try { Object.defineProperty(document, "oncontextmenu", dummyProp); } catch (e) {}
  try { Object.defineProperty(window, "onpaste", dummyProp); } catch (e) {}
  try { Object.defineProperty(document, "onpaste", dummyProp); } catch (e) {}
  try { Object.defineProperty(window, "onbeforeinput", dummyProp); } catch (e) {}
  try { Object.defineProperty(document, "onbeforeinput", dummyProp); } catch (e) {}
  try { Object.defineProperty(window, "onselectstart", dummyProp); } catch (e) {}
  try { Object.defineProperty(document, "onselectstart", dummyProp); } catch (e) {}

  /* 8. Enable / Disable functions */
  const enableFunction = () => {
    isEnabled = true;

    // Inject persistent CSS to force user-select: text
    let style = document.getElementById("__enable_copy_style__");
    if (!style) {
      style = document.createElement("style");
      style.id = "__enable_copy_style__";
      style.textContent = `
        *, *::before, *::after {
          -webkit-user-select: text !important;
          -moz-user-select: text !important;
          -ms-user-select: text !important;
          user-select: text !important;
        }
      `;
      (document.head || document.documentElement).appendChild(style);
    }

    // CSS rule * { user-select: text !important; } natively handles all elements
    // without expensive synchronous DOM traversal
  };

  const disableFunction = () => {
    isEnabled = false;
    const style = document.getElementById("__enable_copy_style__");
    if (style) style.remove();
  };

  /* 9. Auto-check storage on page load */
  (() => {
    let hostname = null;
    try {
      hostname = new URL(window.location.href).hostname;
    } catch (e) {
      hostname = null;
    }

    try {
      if (
        typeof chrome !== "undefined" &&
        Boolean(chrome?.runtime?.id) &&
        chrome.storage?.local
      ) {
        chrome.storage.local.get(["enableCopyHosts"], (res) => {
          let hosts = res?.enableCopyHosts;
          if (typeof hosts === "string") {
            try {
              hosts = JSON.parse(hosts);
            } catch (e) {
              hosts = [];
            }
          }
          if (
            Array.isArray(hosts) &&
            hostname &&
            (hosts.includes(hostname) || hosts.includes("*"))
          ) {
            enableFunction();
          }
        });
      }
    } catch {}
  })();

  /* 10. Listen for custom window events (dispatched by popup/executeScript) */
  window.addEventListener("__enableCopy__enable", () => enableFunction());
  window.addEventListener("__enableCopy__disable", () => disableFunction());

  /* 11. Listen for runtime messages (sent by popup/tabs.sendMessage) */
  try {
    if (
      typeof chrome !== "undefined" &&
      Boolean(chrome?.runtime?.id) &&
      chrome.runtime?.onMessage
    ) {
      chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        try {
          if (msg?.action === "enable_function") {
            enableFunction();
            if (sendResponse) sendResponse({ success: true });
          } else if (msg?.action === "disable_function") {
            disableFunction();
            if (sendResponse) sendResponse({ success: true });
          }
        } catch {}
      });
    }
  } catch {}

  /* 12. Listen for storage changes in real-time across tabs */
  try {
    if (
      typeof chrome !== "undefined" &&
      Boolean(chrome?.runtime?.id) &&
      chrome.storage?.onChanged
    ) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === "local" && changes.enableCopyHosts) {
          let hosts = changes.enableCopyHosts.newValue;
          if (typeof hosts === "string") {
            try {
              hosts = JSON.parse(hosts);
            } catch (e) {
              hosts = [];
            }
          }
          let hostname = null;
          try {
            hostname = new URL(window.location.href).hostname;
          } catch (e) {}
          if (
            Array.isArray(hosts) &&
            hostname &&
            (hosts.includes(hostname) || hosts.includes("*"))
          ) {
            enableFunction();
          } else {
            disableFunction();
          }
        }
      });
    }
  } catch {}
})();
