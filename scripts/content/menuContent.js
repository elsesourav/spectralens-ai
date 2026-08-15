if (window !== window.top) {
  // Floating menu only operates on top-level browsing context
  // Subframes (like analytics, ads, style_engines) must not mount duplicate menu listeners
} else {
const __iframeSize = { width: "164px", height: "46px" };
let __spacing = 0;
let __isDragging = false;
const __pointerOffset = { x: 0, y: 0 };
let __main_menu__ = null;
let __menu_back__ = null;
let __isFirstSetup = true;
let __isNoMoveOpenToClose = false;
const __lastLocation = { x: 0, y: 0 };

// Collision detection function to keep back within viewport bounds with screen margin
const __applyCollisionDetection__ = (left, top) => {
  const menuWidth = parseInt(__iframeSize.width);
  const menuHeight = parseInt(__iframeSize.height);

  // Get viewport dimensions
  const VW = window.innerWidth;
  const VH = window.innerHeight;

  const margin = 10;
  const maxLeft = Math.max(margin, VW - menuWidth - margin);
  const maxTop = Math.max(margin, VH - menuHeight - margin);

  // Constrain position to viewport bounds with margin
  const constrainedLeft = Math.max(margin, Math.min(left, maxLeft));
  const constrainedTop = Math.max(margin, Math.min(top, maxTop));

  return { x: constrainedLeft, y: constrainedTop };
};

function __pointerenter__() {
  __menu_back__ = document.getElementById("__menuWindowBack");
  __main_menu__ = document.getElementById("__menuWindowIframe");
  const menuFrame = document.getElementById("__menuWindowIframe");
  pagePostMessage("C_IF_MENU_WINDOW_DRAG_START", {}, menuFrame?.contentWindow);
  pagePostMessage("C_IF_ACTIVITY", {}, menuFrame?.contentWindow);
}

// Throttled user activity forwarding to wake up minimized widget
let __lastActivityNotify = 0;
function __notifyActivity__() {
  const now = Date.now();
  if (now - __lastActivityNotify > 1000) {
    __lastActivityNotify = now;
    const iframe = document.getElementById("__menuWindowIframe");
    if (iframe?.contentWindow) {
      pagePostMessage("C_IF_ACTIVITY", {}, iframe.contentWindow);
    }
  }
}

window.addEventListener("mousemove", __notifyActivity__, { passive: true });
window.addEventListener("pointerdown", __notifyActivity__, { passive: true });
window.addEventListener("keydown", __notifyActivity__, { passive: true });
window.addEventListener("scroll", __notifyActivity__, { passive: true });

function __pointerleave__() {
  __isDragging = false;
  const menuFrame = document.getElementById("__menuWindowIframe");
  pagePostMessage("C_IF_MENU_WINDOW_DRAG_END", {}, menuFrame?.contentWindow);
}

function __pointerdown__(e) {
  __isDragging = true;
  const rect = __menu_back__?.getBoundingClientRect();
  __pointerOffset.x = e.clientX - rect.left;
  __pointerOffset.y = e.clientY - rect.top;

  if (__menu_back__?.setPointerCapture)
    __menu_back__.setPointerCapture(e.pointerId);
}

function __pointermove__(e) {
  if (!__isDragging) return;
  __isNoMoveOpenToClose = false;
  const newLeft = e.clientX - __pointerOffset.x;
  const newTop = e.clientY - __pointerOffset.y;

  // Apply collision detection to keep __menu_back__ within viewport
  const constrainedPosition = __applyCollisionDetection__(
    newLeft - __spacing,
    newTop,
  );

  __menu_back__.style.left = `${constrainedPosition.x + __spacing}px`;
  __menu_back__.style.top = `${constrainedPosition.y}px`;

  __main_menu__.style.left = `${constrainedPosition.x}px`;
  __main_menu__.style.top = `${constrainedPosition.y}px`;
}

function __pointerup__(e) {
  if (!__isDragging) return;
  __isDragging = false;

  if (__menu_back__?.releasePointerCapture)
    __menu_back__.releasePointerCapture(e.pointerId);

  const left = Number.parseFloat(__menu_back__?.style.left) || 0;
  const top = Number.parseFloat(__menu_back__?.style.top) || 0;

  // Apply collision detection to final position
  const constrainedPosition = __applyCollisionDetection__(
    left - __spacing,
    top,
  );
  __menu_back__.style.left = `${constrainedPosition.x + __spacing}px`;
  __menu_back__.style.top = `${constrainedPosition.y}px`;

  __main_menu__.style.left = `${constrainedPosition.x}px`;
  __main_menu__.style.top = `${constrainedPosition.y}px`;
}

function detectPageTheme() {
  try {
    const html = document.documentElement;
    const body = document.body;

    const docCls = (html.className || "").toLowerCase();
    const bodyCls = (body?.className || "").toLowerCase();
    const docTheme = (
      html.getAttribute("data-theme") ||
      html.getAttribute("data-mode") ||
      html.getAttribute("data-color-mode") ||
      html.getAttribute("data-bs-theme") ||
      html.getAttribute("color-scheme") ||
      body?.getAttribute("data-theme") ||
      body?.getAttribute("data-mode") ||
      body?.getAttribute("data-color-mode") ||
      body?.getAttribute("data-bs-theme") ||
      ""
    ).toLowerCase();

    if (
      docCls.includes("dark") ||
      docCls.includes("night") ||
      bodyCls.includes("dark") ||
      bodyCls.includes("night") ||
      docTheme.includes("dark") ||
      docTheme.includes("night")
    ) {
      return "dark";
    }

    if (
      docCls.includes("light") ||
      bodyCls.includes("light") ||
      docTheme.includes("light")
    ) {
      return "light";
    }

    const htmlStyle = window.getComputedStyle(html);
    const bodyStyle = body ? window.getComputedStyle(body) : null;
    if (htmlStyle.colorScheme === "dark" || bodyStyle?.colorScheme === "dark") {
      return "dark";
    }
    if (htmlStyle.colorScheme === "light" || bodyStyle?.colorScheme === "light") {
      return "light";
    }

    const bgColors = [
      bodyStyle?.backgroundColor,
      htmlStyle.backgroundColor,
    ].filter(Boolean);

    for (const bg of bgColors) {
      const match = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
      if (match) {
        const alpha = match[4] !== undefined ? parseFloat(match[4]) : 1;
        if (alpha > 0.2) {
          const r = parseInt(match[1], 10);
          const g = parseInt(match[2], 10);
          const b = parseInt(match[3], 10);
          const brightness = (r * 299 + g * 587 + b * 114) / 1000;
          return brightness < 128 ? "dark" : "light";
        }
      }
    }

    if (
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    ) {
      return "dark";
    }
  } catch {
    // fallback
  }
  return "light";
}

/* -------- Message Passing Section --------- */
pageOnMessage("IF_C_MENU_WINDOW_MOVE", async (data) => {
  const { deltaX, deltaY } = data || {};
  __menu_back__ = document.getElementById("__menuWindowBack");
  __main_menu__ = document.getElementById("__menuWindowIframe");
  if (__main_menu__ && deltaX !== undefined && deltaY !== undefined) {
    __isNoMoveOpenToClose = false;
    const curLeft = Number.parseFloat(__main_menu__.style.left) || 0;
    const curTop = Number.parseFloat(__main_menu__.style.top) || 0;
    const constrainedPosition = __applyCollisionDetection__(
      curLeft + deltaX,
      curTop + deltaY,
    );
    __main_menu__.style.left = `${constrainedPosition.x}px`;
    __main_menu__.style.top = `${constrainedPosition.y}px`;
    if (__menu_back__) {
      __menu_back__.style.left = `${constrainedPosition.x + __spacing}px`;
      __menu_back__.style.top = `${constrainedPosition.y}px`;
    }
  }
});

pageOnMessage("IF_C_MENU_WINDOW_RESIZE", async (data) => {
  const { width, height, isOpen } = data;

  __menu_back__ = document.getElementById("__menuWindowBack");
  __main_menu__ = document.getElementById("__menuWindowIframe");

  __iframeSize.width = width;
  __iframeSize.height = height;

  const w = parseInt(width) || 440;
  __spacing = 0;
  const newBackWidth = isOpen ? w - 44 : 84;
  const newBackHeight = isOpen ? 44 : 46;

  const curLeft =
    Number.parseFloat(__main_menu__?.style.left) ||
    (__menu_back__ ? Number.parseFloat(__menu_back__.style.left) : 0);
  const curTop =
    Number.parseFloat(__main_menu__?.style.top) ||
    (__menu_back__ ? Number.parseFloat(__menu_back__.style.top) : 0);

  let constrainedPosition = __applyCollisionDetection__(curLeft, curTop);

  // If opening: save minimized location and auto-fit into screen if space is tight
  if (isOpen && !__isNoMoveOpenToClose) {
    __lastLocation.x = curLeft;
    __lastLocation.y = curTop;
    __isNoMoveOpenToClose = true;
    constrainedPosition = __applyCollisionDetection__(curLeft, curTop);
  } else if (!isOpen && __isNoMoveOpenToClose) {
    // If closing and wasn't dragged while open: restore to original minimized location
    __isNoMoveOpenToClose = false;
    constrainedPosition = __applyCollisionDetection__(
      __lastLocation.x,
      __lastLocation.y,
    );
  }

  __pointerOffset.x = constrainedPosition.x;
  __pointerOffset.y = constrainedPosition.y;

  // Apply smooth synchronized transition
  if (!__isFirstSetup) {
    __main_menu__.style.transition =
      "left 300ms ease-in-out, top 300ms ease-in-out, width 300ms ease-in-out, height 300ms ease-in-out, border-radius 300ms ease-in-out";
    if (__menu_back__) {
      __menu_back__.style.transition =
        "left 300ms ease-in-out, top 300ms ease-in-out, width 300ms ease-in-out, height 300ms ease-in-out";
    }
  } else {
    __isFirstSetup = false;
  }

  if (__main_menu__) {
    __main_menu__.style.left = `${constrainedPosition.x}px`;
    __main_menu__.style.top = `${constrainedPosition.y}px`;
    __main_menu__.style.width = __iframeSize.width;
    __main_menu__.style.height = __iframeSize.height;
    __main_menu__.style.borderRadius = isOpen ? "20px" : "9999px";
  }

  if (__menu_back__) {
    __menu_back__.style.left = `${constrainedPosition.x}px`;
    __menu_back__.style.top = `${constrainedPosition.y}px`;
    __menu_back__.style.width = `${newBackWidth}px`;
    __menu_back__.style.height = `${newBackHeight}px`;
  }

  setTimeout(() => {
    if (__main_menu__) __main_menu__.style.transition = "";
    if (__menu_back__) __menu_back__.style.transition = "";
  }, 300);
});

runtimeSendMessage("C_B_ON_LOAD", async (r) => {
  //  console.log(`Menu loaded: ${JSON.stringify(r)}`);
});

pageOnMessage("IF_C_SELECT_COORDS", async (data) => {
  const coordinates = data?.coordinates || data;
  document.getElementById("screenSelectorIframe")?.remove();
  const menuFrame = document.getElementById("__menuWindowIframe");
  const menuBack = document.getElementById("__menuWindowBack");
  if (menuFrame) {
    menuFrame.style.display = "block";
    pagePostMessage("C_IF_VISIBLE", {}, menuFrame.contentWindow);
    pagePostMessage("C_IF_SHOW", {}, menuFrame.contentWindow);
  }
  if (menuBack) {
    menuBack.style.display = "block";
  }
  if (coordinates && (coordinates.width || coordinates.height)) {
    runtimeSendMessage("C_B_CAPTURE_DOM", {
      coordinates,
      devicePixelRatio: window.devicePixelRatio,
    });
  }
});

runtimeOnMessage("B_C_OCR_RESULT", async (data, _, sendResponse) => {
  const { text, image } = data || {};
  sendResponse && sendResponse({ success: true });

  const menuFrame = document.getElementById("__menuWindowIframe");
  const menuBack = document.getElementById("__menuWindowBack");
  if (menuFrame) {
    menuFrame.style.display = "block";
    pagePostMessage("C_IF_OPEN_CHAT", {}, menuFrame.contentWindow);
    pagePostMessage(
      "C_IF_SET_INPUTS",
      { input: text, image },
      menuFrame.contentWindow,
    );
    setTimeout(() => {
      pagePostMessage(
        "C_IF_SET_INPUTS",
        { input: text, image },
        menuFrame.contentWindow,
      );
    }, 80);
    pagePostMessage("C_IF_VISIBLE", {}, menuFrame.contentWindow);
    pagePostMessage("C_IF_SHOW", {}, menuFrame.contentWindow);
  }
  if (menuBack) {
    menuBack.style.display = "block";
  }
});

pageOnMessage("IF_C_SELECT_CANCEL", async () => {
  document.getElementById("screenSelectorIframe")?.remove();
  const menuFrame = document.getElementById("__menuWindowIframe");
  const menuBack = document.getElementById("__menuWindowBack");
  if (menuFrame) {
    menuFrame.style.display = "block";
    pagePostMessage("IF_C_SELECT_CANCEL", {}, menuFrame.contentWindow);
    pagePostMessage("C_IF_VISIBLE", {}, menuFrame.contentWindow);
    pagePostMessage("C_IF_SHOW", {}, menuFrame.contentWindow);
  }
  if (menuBack) {
    menuBack.style.display = "block";
  }
});

pageOnMessage("IF_C_SELECT_TEXT", () => {
  const menuFrame = document.getElementById("__menuWindowIframe");
  const menuBack = document.getElementById("__menuWindowBack");
  if (menuFrame) {
    menuFrame.style.display = "none";
  }
  if (menuBack) {
    menuBack.style.display = "none";
  }
  runtimeSendMessage("C_B_SELECT_TEXT", () => {
    setTimeout(() => {
      document.getElementById("screenSelectorIframe")?.focus();
    }, 100);
  });
});

runtimeOnMessage("B_C_CLOSE_MENU", async (_, __, sendResponse) => {
  console.log("Close Menu");
  __isFirstSetup = true;
  sendResponse("ok");
  document.getElementById("__menuWindowIframe")?.remove();
  const back = document.getElementById("__menuWindowBack");

  if (back) {
    back.removeEventListener("pointerenter", __pointerenter__);
    back.removeEventListener("pointerleave", __pointerleave__);
    back.removeEventListener("pointerdown", __pointerdown__);
    window.removeEventListener("pointermove", __pointermove__);
    back.removeEventListener("pointerup", __pointerup__);
    back.remove();
  }
});

runtimeOnMessage("B_C_RESET_POSITION", async (_, __, sendResponse) => {
  __menu_back__ = document.getElementById("__menuWindowBack");
  __main_menu__ = document.getElementById("__menuWindowIframe");
  if (__main_menu__ && __menu_back__) {
    const defaultLeft = 24;
    const defaultTop = 80;
    __menu_back__.style.left = `${defaultLeft + __spacing}px`;
    __menu_back__.style.top = `${defaultTop}px`;
    __main_menu__.style.left = `${defaultLeft}px`;
    __main_menu__.style.top = `${defaultTop}px`;
  }
  sendResponse && sendResponse("ok");
});

window.addEventListener("message", async (event) => {
  const msgType = typeof event?.data?.type === "string" ? event.data.type : "";
  if (!msgType) return;

  if (msgType.includes("IF_B_")) {
    // console.log("Received message from background:", event.data);

    runtimeSendMessage(msgType, { ...event.data }, (res) => {
      const iframe = document.getElementById("__menuWindowIframe");
      pagePostMessage(msgType, res, iframe?.contentWindow);
    });
  } else if (msgType === "IF_C_GET_CURRENT_CONTROLS") {
    const iframe = document.getElementById("__menuWindowIframe");
    try {
      const getControlsSettings = await chromeStorageGetLocal(KEYS.CONTROLS);
      pagePostMessage(
        msgType,
        {
          success: true,
          controls: getControlsSettings,
          pageTheme: detectPageTheme(),
        },
        iframe?.contentWindow,
      );
    } catch (error) {
      pagePostMessage(
        msgType,
        {
          success: false,
          message: error.message,
          pageTheme: detectPageTheme(),
        },
        iframe?.contentWindow,
      );
    }
  }
});

// Live synchronization for controls & contrast changes from popup
if (typeof chrome !== "undefined" && chrome.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes) => {
    if (changes[KEYS.CONTROLS]) {
      const val = changes[KEYS.CONTROLS].newValue;
      const controls = typeof val === "string" ? JSON.parse(val) : val;
      const iframe = document.getElementById("__menuWindowIframe");
      if (iframe?.contentWindow) {
        pagePostMessage(
          "IF_C_GET_CURRENT_CONTROLS",
          {
            success: true,
            controls,
            pageTheme: detectPageTheme(),
          },
          iframe.contentWindow,
        );
      }
    }
  });
}

// Watch for live webpage theme toggles (e.g. YouTube, GitHub dark mode toggle)
try {
  const __themeObserver = new MutationObserver(() => {
    const iframe = document.getElementById("__menuWindowIframe");
    if (iframe?.contentWindow) {
      chromeStorageGetLocal(KEYS.CONTROLS, (controls) => {
        pagePostMessage(
          "IF_C_GET_CURRENT_CONTROLS",
          {
            success: true,
            controls,
            pageTheme: detectPageTheme(),
          },
          iframe.contentWindow,
        );
      });
    }
  });

  __themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: [
      "class",
      "data-theme",
      "data-mode",
      "data-color-mode",
      "data-bs-theme",
      "theme",
    ],
  });

  if (window.matchMedia) {
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", () => {
        const iframe = document.getElementById("__menuWindowIframe");
        if (iframe?.contentWindow) {
          chromeStorageGetLocal(KEYS.CONTROLS, (controls) => {
            pagePostMessage(
              "IF_C_GET_CURRENT_CONTROLS",
              {
                success: true,
                controls,
                pageTheme: detectPageTheme(),
              },
              iframe.contentWindow,
            );
          });
        }
      });
  }
} catch {
  // ignore
}
}
