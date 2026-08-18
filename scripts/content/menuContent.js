if (window !== window.top) {
  // Floating menu only operates on top-level browsing context
  // Subframes (like analytics, ads, style_engines) must not mount duplicate menu listeners
} else {
const __iframeSize = { width: "154px", height: "48px" };
let __spacing = 0;
let __isDragging = false;
const __pointerOffset = { x: 0, y: 0 };
let __main_menu__ = null;
let __menu_back__ = null;
let __isFirstSetup = true;
let __isNoMoveOpenToClose = false;
const __lastLocation = { x: 0, y: 0 };

// Collision detection function to keep back within viewport bounds
const __applyCollisionDetection__ = (left, top) => {
  const menuWidth = parseInt(__iframeSize.width) || 154;
  const menuHeight = parseInt(__iframeSize.height) || 48;
  const margin = 12;

  // Get viewport dimensions
  const VW = window.innerWidth;
  const VH = window.innerHeight;

  // Constrain position to viewport bounds with safe margin
  const maxLeft = Math.max(0, VW - menuWidth - margin);
  const maxTop = Math.max(0, VH - menuHeight - margin);
  const constrainedLeft = Math.max(margin, Math.min(left, maxLeft));
  const constrainedTop = Math.max(margin, Math.min(top, maxTop));

  return { x: constrainedLeft, y: constrainedTop };
};

const INTRO_STORAGE_KEY = "spectralens_last_intro_date";

function getTodayDateString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function removeIntroOverlay() {
  const overlay = document.getElementById("spectralens-tour-overlay");
  if (overlay) {
    overlay.style.opacity = "0";
    setTimeout(() => {
      overlay.remove();
    }, 250);
  }
}

function checkAndShowDailyIntro(left, top) {
  if (typeof chrome === "undefined" || !chrome.storage?.local) return;

  const todayStr = getTodayDateString();
  chrome.storage.local.get([INTRO_STORAGE_KEY], (res) => {
    const lastDate = res?.[INTRO_STORAGE_KEY];
    if (lastDate === todayStr) {
      // Max 1 time per day across all tabs
      return;
    }

    // Save today's date so it only shows once in a single day
    chrome.storage.local.set({ [INTRO_STORAGE_KEY]: todayStr });

    document.getElementById("spectralens-tour-overlay")?.remove();

    let currentStep = 1;
    const totalSteps = 3;

    const stepsData = [
      {
        badge: "✦ Step 1 of 3 • Brand Identity",
        badgeColor: "#3b82f6",
        title: "SpectraLens AI Assistant",
        desc: "Your smart multi-AI floating assistant on any webpage. Access Google AI, Perplexity, Claude, ChatGPT, and more right from this launcher.",
        spotlight: { xOffset: -4, yOffset: -4, width: 162, height: 56, radius: "28px" },
      },
      {
        badge: "⠿⠿ Step 2 of 3 • Movement",
        badgeColor: "#10b981",
        title: "Drag to Reposition",
        desc: "Click and hold the 6-dot grip handle in the center to move the widget anywhere on your screen. It automatically remembers your preferred position.",
        spotlight: { xOffset: 46, yOffset: 2, width: 44, height: 44, radius: "14px" },
      },
      {
        badge: "💬 Step 3 of 3 • Multi-AI & Context",
        badgeColor: "#a855f7",
        title: "Launch Chat & @ Features",
        desc: "Click the chat icon to open the full assistant. Use @page to send web links, metadata & top screenshots, or @screen to ask about visual areas.",
        spotlight: { xOffset: 104, yOffset: 2, width: 44, height: 44, radius: "22px" },
      },
    ];

    const overlay = document.createElement("div");
    overlay.id = "spectralens-tour-overlay";
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 2147483646;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      user-select: none;
      transition: opacity 250ms ease;
      opacity: 0;
    `;

    // Spotlight Cutout Element
    const spotlight = document.createElement("div");
    spotlight.id = "spectralens-tour-spotlight";
    spotlight.style.cssText = `
      position: fixed;
      pointer-events: none;
      box-shadow: 0 0 0 9999px rgba(6, 8, 15, 0.75), 0 0 25px 4px rgba(99, 102, 241, 0.5);
      border: 1.5px solid rgba(139, 92, 246, 0.7);
      transition: all 300ms cubic-bezier(0.16, 1, 0.3, 1);
      z-index: 2147483646;
    `;

    // Guide Card Dialog
    const card = document.createElement("div");
    card.id = "spectralens-tour-card";
    const isAbove = top + 48 + 220 >= window.innerHeight;
    const cardTop = isAbove ? Math.max(16, top - 180) : top + 64;
    const cardLeft = Math.max(16, Math.min(window.innerWidth - 336, left - 80));

    card.style.cssText = `
      position: fixed;
      left: ${cardLeft}px;
      top: ${cardTop}px;
      width: 320px;
      background: rgba(18, 20, 30, 0.94);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 18px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.65), 0 0 30px rgba(99, 102, 241, 0.15);
      padding: 16px 18px;
      color: #f8fafc;
      z-index: 2147483647;
      transition: all 250ms cubic-bezier(0.16, 1, 0.3, 1);
    `;

    function renderStep(stepIndex) {
      const data = stepsData[stepIndex - 1];
      if (!data) return;

      // Update spotlight geometry
      spotlight.style.left = `${left + data.spotlight.xOffset}px`;
      spotlight.style.top = `${top + data.spotlight.yOffset}px`;
      spotlight.style.width = `${data.spotlight.width}px`;
      spotlight.style.height = `${data.spotlight.height}px`;
      spotlight.style.borderRadius = data.spotlight.radius;

      // Render card content
      card.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
          <span style="font-size: 10px; font-weight: 700; color: ${data.badgeColor}; background: ${data.badgeColor}18; border: 1px solid ${data.badgeColor}35; padding: 2px 8px; border-radius: 12px; letter-spacing: 0.2px;">
            ${data.badge}
          </span>
          <button id="sl-tour-skip-x" style="background: transparent; border: none; color: #64748b; hover:color: #cbd5e1; cursor: pointer; font-size: 14px; padding: 0 4px; line-height: 1;" title="Dismiss Guide">✕</button>
        </div>
        <h4 style="margin: 0 0 6px 0; font-size: 14px; font-weight: 700; color: #ffffff; letter-spacing: -0.2px;">
          ${data.title}
        </h4>
        <p style="margin: 0 0 16px 0; font-size: 11.5px; line-height: 1.55; color: #94a3b8;">
          ${data.desc}
        </p>
        <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 12px;">
          <div style="display: flex; gap: 5px; align-items: center;">
            ${[1, 2, 3]
              .map(
                (i) => `
              <div style="width: ${i === stepIndex ? "14px" : "6px"}; height: 6px; border-radius: 3px; background: ${
                i === stepIndex ? "#818cf8" : "rgba(255,255,255,0.18)"
              }; transition: all 200ms ease;"></div>
            `,
              )
              .join("")}
          </div>
          <div style="display: flex; gap: 8px; align-items: center;">
            ${
              stepIndex > 1
                ? `<button id="sl-tour-back" style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); color: #cbd5e1; padding: 5px 12px; border-radius: 8px; font-size: 11px; font-weight: 600; cursor: pointer; transition: all 150ms ease;">Back</button>`
                : `<button id="sl-tour-skip" style="background: transparent; border: none; color: #64748b; padding: 5px 8px; font-size: 11px; font-weight: 600; cursor: pointer; transition: color 150ms ease;">Skip</button>`
            }
            <button id="sl-tour-next" style="background: linear-gradient(135deg, #4f46e5, #7c3aed, #2563eb); border: 1px solid rgba(255,255,255,0.2); color: #ffffff; padding: 5px 14px; border-radius: 8px; font-size: 11px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4); transition: transform 150ms ease;">
              ${stepIndex === totalSteps ? "Get Started ✨" : "Next →"}
            </button>
          </div>
        </div>
      `;

      // Attach button events
      card.querySelector("#sl-tour-skip-x")?.addEventListener("click", removeIntroOverlay);
      card.querySelector("#sl-tour-skip")?.addEventListener("click", removeIntroOverlay);
      card.querySelector("#sl-tour-back")?.addEventListener("click", () => {
        if (currentStep > 1) {
          currentStep--;
          renderStep(currentStep);
        }
      });
      card.querySelector("#sl-tour-next")?.addEventListener("click", () => {
        if (currentStep < totalSteps) {
          currentStep++;
          renderStep(currentStep);
        } else {
          removeIntroOverlay();
        }
      });
    }

    overlay.appendChild(spotlight);
    overlay.appendChild(card);

    // Clicking anywhere on backdrop outside the card closes guide
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        removeIntroOverlay();
      }
    });

    // Pressing Escape closes guide
    const handleKeydown = (e) => {
      if (e.key === "Escape") {
        removeIntroOverlay();
        window.removeEventListener("keydown", handleKeydown);
      }
    };
    window.addEventListener("keydown", handleKeydown);

    document.body.appendChild(overlay);

    // Initial step render
    renderStep(1);

    // Smooth fade in
    setTimeout(() => {
      overlay.style.opacity = "1";
    }, 40);
  });
}

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
  removeIntroOverlay();
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
  removeIntroOverlay();
  const { deltaX, deltaY } = data || {};
  __isNoMoveOpenToClose = false;
  __menu_back__ = document.getElementById("__menuWindowBack");
  __main_menu__ = document.getElementById("__menuWindowIframe");
  if (__main_menu__ && deltaX !== undefined && deltaY !== undefined) {
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
  if (isOpen) {
    removeIntroOverlay();
  }

  __menu_back__ = document.getElementById("__menuWindowBack");
  __main_menu__ = document.getElementById("__menuWindowIframe");

  __iframeSize.width = width;
  __iframeSize.height = height;

  if (__main_menu__) {
    __main_menu__.style.borderRadius = isOpen ? "16px" : "9999px";
  }

  const w = parseInt(width) || 440;
  __spacing = 0;
  const newBackWidth = isOpen ? w - 44 : 96;
  const newBackHeight = isOpen ? 44 : 48;
  if (__menu_back__) {
    __menu_back__.style.width = `${newBackWidth}px`;
    __menu_back__.style.height = `${newBackHeight}px`;
  }

  const rect = __menu_back__.getBoundingClientRect();

  // If opening: remember closed position before expanding
  if (isOpen && !__isNoMoveOpenToClose) {
    __lastLocation.x = parseInt(rect.left);
    __lastLocation.y = parseInt(rect.top);
    __isNoMoveOpenToClose = true;
  }

  // Calculate constrained position ensuring full window stays inside viewport
  const targetX = isOpen
    ? rect.left - __spacing
    : (__isNoMoveOpenToClose ? __lastLocation.x - __spacing : rect.left - __spacing);
  const targetY = isOpen
    ? rect.top
    : (__isNoMoveOpenToClose ? __lastLocation.y : rect.top);

  const constrainedPosition = __applyCollisionDetection__(targetX, targetY);

  if (!isOpen && __isNoMoveOpenToClose) {
    __isNoMoveOpenToClose = false;
  }

  __pointerOffset.x = constrainedPosition.x + __spacing;
  __pointerOffset.y = constrainedPosition.y;
  __menu_back__.style.left = `${constrainedPosition.x + __spacing}px`;
  __menu_back__.style.top = `${constrainedPosition.y}px`;
  __main_menu__.style.left = `${constrainedPosition.x}px`;
  __main_menu__.style.top = `${constrainedPosition.y}px`;

  // for first time remove transition
  if (!__isFirstSetup) {
    __main_menu__.style.transition =
      "left 300ms cubic-bezier(0.16, 1, 0.3, 1), top 300ms cubic-bezier(0.16, 1, 0.3, 1), width 300ms cubic-bezier(0.16, 1, 0.3, 1), height 300ms cubic-bezier(0.16, 1, 0.3, 1), border-radius 300ms cubic-bezier(0.16, 1, 0.3, 1)";
  } else {
    __isFirstSetup = false;
    if (!isOpen) {
      setTimeout(() => {
        checkAndShowDailyIntro(constrainedPosition.x, constrainedPosition.y);
      }, 100);
    }
  }

  __main_menu__.style.borderRadius = isOpen ? "20px" : "24px";
  __main_menu__.style.width = __iframeSize.width;
  __main_menu__.style.height = __iframeSize.height;

  setTimeout(() => {
    __main_menu__.style.transition = "";
  }, 320);
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

  if (msgType === "IF_B_CAPTURE_SCREEN") {
    console.log(`[SpectraLens:ContentBridge] 📸 Hiding extension UI for clean screen capture...`);
    const framesToHide = Array.from(
      document.querySelectorAll("#__menuWindowIframe, #screenSelectorIframe, #spectralens-widget-intro, #spectralens-tour-overlay, iframe[id*='menuWindow']"),
    );
    const savedStyles = framesToHide.map((f) => ({
      frame: f,
      visibility: f.style.visibility,
      opacity: f.style.opacity,
    }));

    framesToHide.forEach((f) => {
      f.style.visibility = "hidden";
      f.style.opacity = "0";
    });

    // Allow 1 render frame (40ms) for browser to paint the clean web page underneath
    setTimeout(() => {
      runtimeSendMessage(msgType, { ...event.data }, (res) => {
        // Restore frames immediately
        savedStyles.forEach(({ frame, visibility, opacity }) => {
          if (frame) {
            frame.style.visibility = visibility;
            frame.style.opacity = opacity;
          }
        });

        console.log(`[SpectraLens:ContentBridge] 📥 Received clean capture response from background:`, res);
        const iframe = document.getElementById("__menuWindowIframe");
        if (res) {
          pagePostMessage(msgType, res, iframe?.contentWindow);
        }
      });
    }, 45);
    return;
  }

  if (msgType === "IF_B_CAPTURE_PAGE") {
    console.log(`[SpectraLens:ContentBridge] 📄 Extracting active page metadata, text, and top-section screenshot...`);
    const iframe = document.getElementById("__menuWindowIframe");

    try {
      const title = document.title || "Web Page";
      const url = window.location.href;
      const hostname = window.location.hostname || "";
      const description =
        document.querySelector('meta[name="description"]')?.getAttribute("content") ||
        document.querySelector('meta[property="og:description"]')?.getAttribute("content") ||
        "";
      const keywords = document.querySelector('meta[name="keywords"]')?.getAttribute("content") || "";
      const author = document.querySelector('meta[name="author"]')?.getAttribute("content") || "";
      const favicon =
        document.querySelector('link[rel~="icon"]')?.href ||
        document.querySelector('link[rel="shortcut icon"]')?.href ||
        `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;

      // Extract clean readable text by cloning and stripping script/style/iframe tags
      const clone = document.body.cloneNode(true);
      clone
        .querySelectorAll(
          "script, style, noscript, iframe, svg, #__menuWindowIframe, #screenSelectorIframe, [aria-hidden='true']",
        )
        .forEach((el) => el.remove());

      const rawText = clone.innerText || clone.textContent || "";
      const text = rawText.replace(/\n\s*\n\s*\n/g, "\n\n").trim();
      const wordCount = text.split(/\s+/).filter(Boolean).length;

      // Save current scroll position to restore after capturing top of page
      const originalScrollX = window.scrollX || window.pageXOffset || 0;
      const originalScrollY = window.scrollY || window.pageYOffset || 0;

      // Scroll to very top of page for hero/top-section screenshot
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });

      // Temporarily hide frames to capture clean top-section screenshot
      const framesToHide = Array.from(
        document.querySelectorAll("#__menuWindowIframe, #screenSelectorIframe, #spectralens-widget-intro, #spectralens-tour-overlay, iframe[id*='menuWindow']"),
      );
      const savedStyles = framesToHide.map((f) => ({
        frame: f,
        visibility: f.style.visibility,
        opacity: f.style.opacity,
      }));

      framesToHide.forEach((f) => {
        f.style.visibility = "hidden";
        f.style.opacity = "0";
      });

      setTimeout(() => {
        runtimeSendMessage("IF_B_CAPTURE_SCREEN", {}, (captureRes) => {
          // Restore original scroll position immediately
          window.scrollTo({ top: originalScrollY, left: originalScrollX, behavior: "instant" });

          // Restore frames immediately
          savedStyles.forEach(({ frame, visibility, opacity }) => {
            if (frame) {
              frame.style.visibility = visibility;
              frame.style.opacity = opacity;
            }
          });

          const image = captureRes?.image || null;
          console.log(`[SpectraLens:ContentBridge] 📄 Top section page screenshot captured successfully: "${title}" (screenshot: ${Boolean(image)})`);

          pagePostMessage(
            msgType,
            {
              success: true,
              title,
              url,
              hostname,
              description,
              keywords,
              author,
              favicon,
              text,
              wordCount,
              image,
            },
            iframe?.contentWindow,
          );
        });
      }, 60);
    } catch (e) {
      console.error(`[SpectraLens:ContentBridge] ❌ Error extracting page context:`, e);
      pagePostMessage(
        msgType,
        {
          success: false,
          error: e?.message || "Failed to extract page context",
        },
        iframe?.contentWindow,
      );
    }
    return;
  }

  if (msgType.includes("IF_B_")) {
    console.log(`[SpectraLens:ContentBridge] 🌉 Forwarding "${msgType}" from iframe to background:`, event.data);

    runtimeSendMessage(msgType, { ...event.data }, (res) => {
      console.log(`[SpectraLens:ContentBridge] 📥 Received response from background for "${msgType}":`, res);
      const iframe = document.getElementById("__menuWindowIframe");
      if (res) {
        pagePostMessage(msgType, res, iframe?.contentWindow);
      } else {
        console.warn(`[SpectraLens:ContentBridge] ⚠️ Background returned empty/null response for "${msgType}"`);
      }
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
