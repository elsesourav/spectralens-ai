if (window !== window.top) {
  // Floating menu only operates on top-level browsing context
  // Subframes (like analytics, ads, style_engines) must not mount duplicate menu listeners
} else {
const widgetIframeSize = { width: "154px", height: "48px" };
let widgetSpacing = 0;
let isWidgetDragging = false;
const dragPointerOffset = { x: 0, y: 0 };
let widgetIframeElement = null;
let widgetBackElement = null;
let isFirstWidgetSetup = true;
let isRestoringClosedPosition = false;
const lastClosedWidgetPosition = { x: 0, y: 0 };

// Collision detection function to keep floating widget within viewport bounds
const applyViewportBoundaryConstraint = (left, top) => {
  const menuWidth = parseInt(widgetIframeSize.width) || 154;
  const menuHeight = parseInt(widgetIframeSize.height) || 48;
  const margin = 12;

  // Get viewport dimensions
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // Constrain position to viewport bounds with safe margin
  const maxLeft = Math.max(0, viewportWidth - menuWidth - margin);
  const maxTop = Math.max(0, viewportHeight - menuHeight - margin);
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
    overlay.remove();
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
        badge: "⠿⠿ Step 2 of 3 • Full Drag & Move",
        badgeColor: "#10b981",
        title: "Fully Draggable Anywhere",
        desc: "Click and hold the grip handle or anywhere on the launcher back to move the widget anywhere on your screen. It automatically remembers your preferred position.",
        spotlight: { xOffset: 44, yOffset: 2, width: 52, height: 44, radius: "14px" },
      },
      {
        badge: "💬 Step 3 of 3 • Multi-AI & Context",
        badgeColor: "#a855f7",
        title: "Launch Chat & @ Features",
        desc: "Click the chat icon to open the full assistant. Use @page to send web links, metadata & top screenshots, or @screen to ask about visual areas.",
        spotlight: { xOffset: 104, yOffset: 2, width: 46, height: 44, radius: "22px" },
      },
    ];

    const overlay = document.createElement("div");
    overlay.id = "spectralens-tour-overlay";
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      user-select: none;
      transition: opacity 200ms ease;
      opacity: 0;
    `;

    // Spotlight Cutout Element
    const spotlight = document.createElement("div");
    spotlight.id = "spectralens-tour-spotlight";
    spotlight.style.cssText = `
      position: fixed;
      pointer-events: none;
      box-shadow: 0 0 0 9999px rgba(6, 8, 15, 0.78), 0 0 25px 4px rgba(99, 102, 241, 0.5);
      border: 1.5px solid rgba(139, 92, 246, 0.7);
      transition: all 250ms cubic-bezier(0.16, 1, 0.3, 1);
      z-index: 2147483647;
    `;

    // Guide Card Dialog
    const card = document.createElement("div");
    card.id = "spectralens-tour-card";
    const isAbove = top + 48 + 220 >= window.innerHeight;
    const cardTop = isAbove ? Math.max(16, top - 190) : top + 60;
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
      z-index: 2147483648;
      transition: all 200ms cubic-bezier(0.16, 1, 0.3, 1);
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

      // Attach button events (Intro only closes on explicit user dismiss buttons)
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

    document.body.appendChild(overlay);

    // Initial step render
    renderStep(1);

    // Smooth fade in
    setTimeout(() => {
      overlay.style.opacity = "1";
    }, 40);
  });
}

function handleWidgetPointerEnter() {
  ensureWidgetBackListeners();
  const menuFrame = document.getElementById("spectralensWidgetIframe");
  pagePostMessage("C_IF_MENU_WINDOW_DRAG_START", {}, menuFrame?.contentWindow);
  pagePostMessage("C_IF_ACTIVITY", {}, menuFrame?.contentWindow);
}

// Throttled user activity forwarding to wake up minimized widget
let lastUserActivityTimestamp = 0;
function notifyUserActivity() {
  const now = Date.now();
  if (now - lastUserActivityTimestamp > 1000) {
    lastUserActivityTimestamp = now;
    const iframe = document.getElementById("spectralensWidgetIframe");
    if (iframe?.contentWindow) {
      pagePostMessage("C_IF_ACTIVITY", {}, iframe.contentWindow);
    }
  }
}

window.addEventListener("mousemove", notifyUserActivity, { passive: true });
window.addEventListener("pointerdown", notifyUserActivity, { passive: true });
window.addEventListener("keydown", notifyUserActivity, { passive: true });
window.addEventListener("scroll", notifyUserActivity, { passive: true });

function handleWidgetPointerLeave() {
  isWidgetDragging = false;
  const menuFrame = document.getElementById("spectralensWidgetIframe");
  pagePostMessage("C_IF_MENU_WINDOW_DRAG_END", {}, menuFrame?.contentWindow);
}

function handleWidgetPointerDown(e) {
  removeIntroOverlay();
  isWidgetDragging = true;
  widgetBackElement = document.getElementById("spectralensWidgetBack");
  const rect = widgetBackElement?.getBoundingClientRect();
  dragPointerOffset.x = e.clientX - (rect ? rect.left : 0);
  dragPointerOffset.y = e.clientY - (rect ? rect.top : 0);

  if (widgetBackElement?.setPointerCapture)
    widgetBackElement.setPointerCapture(e.pointerId);
}

function handleWidgetPointerMove(e) {
  if (!isWidgetDragging) return;
  isRestoringClosedPosition = false;
  const newLeft = e.clientX - dragPointerOffset.x;
  const newTop = e.clientY - dragPointerOffset.y;

  // Apply collision detection to keep widget within viewport
  const constrainedPosition = applyViewportBoundaryConstraint(
    newLeft - widgetSpacing,
    newTop,
  );

  widgetBackElement = document.getElementById("spectralensWidgetBack");
  widgetIframeElement = document.getElementById("spectralensWidgetIframe");

  if (widgetBackElement) {
    widgetBackElement.style.left = `${constrainedPosition.x + widgetSpacing}px`;
    widgetBackElement.style.top = `${constrainedPosition.y}px`;
  }

  if (widgetIframeElement) {
    widgetIframeElement.style.left = `${constrainedPosition.x}px`;
    widgetIframeElement.style.top = `${constrainedPosition.y}px`;
  }
}

function handleWidgetPointerUp(e) {
  if (!isWidgetDragging) return;
  isWidgetDragging = false;

  widgetBackElement = document.getElementById("spectralensWidgetBack");
  widgetIframeElement = document.getElementById("spectralensWidgetIframe");

  if (widgetBackElement?.releasePointerCapture)
    widgetBackElement.releasePointerCapture(e.pointerId);

  const left = Number.parseFloat(widgetBackElement?.style.left) || 0;
  const top = Number.parseFloat(widgetBackElement?.style.top) || 0;

  // Apply collision detection to final position
  const constrainedPosition = applyViewportBoundaryConstraint(
    left - widgetSpacing,
    top,
  );

  if (widgetBackElement) {
    widgetBackElement.style.left = `${constrainedPosition.x + widgetSpacing}px`;
    widgetBackElement.style.top = `${constrainedPosition.y}px`;
  }

  if (widgetIframeElement) {
    widgetIframeElement.style.left = `${constrainedPosition.x}px`;
    widgetIframeElement.style.top = `${constrainedPosition.y}px`;
  }
}

// Attach globally to window for fail-safe runtime discovery
window.handleWidgetPointerEnter = handleWidgetPointerEnter;
window.handleWidgetPointerLeave = handleWidgetPointerLeave;
window.handleWidgetPointerDown = handleWidgetPointerDown;
window.handleWidgetPointerMove = handleWidgetPointerMove;
window.handleWidgetPointerUp = handleWidgetPointerUp;

window.__pointerenter__ = handleWidgetPointerEnter;
window.__pointerleave__ = handleWidgetPointerLeave;
window.__pointerdown__ = handleWidgetPointerDown;
window.__pointermove__ = handleWidgetPointerMove;
window.__pointerup__ = handleWidgetPointerUp;

function ensureWidgetBackListeners() {
  widgetBackElement = document.getElementById("spectralensWidgetBack");
  widgetIframeElement = document.getElementById("spectralensWidgetIframe");
  if (widgetBackElement && !widgetBackElement.__listenersAttached) {
    widgetBackElement.__listenersAttached = true;
    widgetBackElement.addEventListener("pointerenter", handleWidgetPointerEnter);
    widgetBackElement.addEventListener("pointerleave", handleWidgetPointerLeave);
    widgetBackElement.addEventListener("pointerdown", handleWidgetPointerDown);
    window.addEventListener("pointermove", handleWidgetPointerMove);
    widgetBackElement.addEventListener("pointerup", handleWidgetPointerUp);
  }
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
  ensureWidgetBackListeners();
  const { deltaX, deltaY } = data || {};
  isRestoringClosedPosition = false;
  widgetBackElement = document.getElementById("spectralensWidgetBack");
  widgetIframeElement = document.getElementById("spectralensWidgetIframe");
  if (widgetIframeElement && deltaX !== undefined && deltaY !== undefined) {
    const curLeft = Number.parseFloat(widgetIframeElement.style.left) || 0;
    const curTop = Number.parseFloat(widgetIframeElement.style.top) || 0;
    const constrainedPosition = applyViewportBoundaryConstraint(
      curLeft + deltaX,
      curTop + deltaY,
    );
    widgetIframeElement.style.left = `${constrainedPosition.x}px`;
    widgetIframeElement.style.top = `${constrainedPosition.y}px`;
    if (widgetBackElement) {
      widgetBackElement.style.left = `${constrainedPosition.x + widgetSpacing}px`;
      widgetBackElement.style.top = `${constrainedPosition.y}px`;
    }
  }
});

pageOnMessage("IF_C_MENU_WINDOW_RESIZE", async (data) => {
  const { width, height, isOpen } = data;
  if (isOpen) {
    removeIntroOverlay();
  }
  ensureWidgetBackListeners();

  widgetBackElement = document.getElementById("spectralensWidgetBack");
  widgetIframeElement = document.getElementById("spectralensWidgetIframe");

  widgetIframeSize.width = width;
  widgetIframeSize.height = height;

  if (widgetIframeElement) {
    widgetIframeElement.style.borderRadius = isOpen ? "16px" : "9999px";
  }

  const w = parseInt(width) || 440;
  widgetSpacing = 0;
  const newBackWidth = isOpen ? w - 44 : 96;
  const newBackHeight = isOpen ? 44 : 48;
  if (widgetBackElement) {
    widgetBackElement.style.width = `${newBackWidth}px`;
    widgetBackElement.style.height = `${newBackHeight}px`;
  }

  const rect = widgetBackElement.getBoundingClientRect();

  // If opening: remember closed position before expanding
  if (isOpen && !isRestoringClosedPosition) {
    lastClosedWidgetPosition.x = parseInt(rect.left);
    lastClosedWidgetPosition.y = parseInt(rect.top);
    isRestoringClosedPosition = true;
  }

  // Calculate constrained position ensuring full window stays inside viewport
  const targetX = isOpen
    ? rect.left - widgetSpacing
    : (isRestoringClosedPosition ? lastClosedWidgetPosition.x - widgetSpacing : rect.left - widgetSpacing);
  const targetY = isOpen
    ? rect.top
    : (isRestoringClosedPosition ? lastClosedWidgetPosition.y : rect.top);

  const constrainedPosition = applyViewportBoundaryConstraint(targetX, targetY);

  if (!isOpen && isRestoringClosedPosition) {
    isRestoringClosedPosition = false;
  }

  dragPointerOffset.x = constrainedPosition.x + widgetSpacing;
  dragPointerOffset.y = constrainedPosition.y;
  widgetBackElement.style.left = `${constrainedPosition.x + widgetSpacing}px`;
  widgetBackElement.style.top = `${constrainedPosition.y}px`;
  widgetIframeElement.style.left = `${constrainedPosition.x}px`;
  widgetIframeElement.style.top = `${constrainedPosition.y}px`;

  // for first time remove transition
  if (!isFirstWidgetSetup) {
    widgetIframeElement.style.transition =
      "left 300ms cubic-bezier(0.16, 1, 0.3, 1), top 300ms cubic-bezier(0.16, 1, 0.3, 1), width 300ms cubic-bezier(0.16, 1, 0.3, 1), height 300ms cubic-bezier(0.16, 1, 0.3, 1), border-radius 300ms cubic-bezier(0.16, 1, 0.3, 1)";
  } else {
    isFirstWidgetSetup = false;
    if (!isOpen) {
      setTimeout(() => {
        checkAndShowDailyIntro(constrainedPosition.x, constrainedPosition.y);
      }, 100);
    }
  }

  widgetIframeElement.style.borderRadius = isOpen ? "20px" : "24px";
  widgetIframeElement.style.width = widgetIframeSize.width;
  widgetIframeElement.style.height = widgetIframeSize.height;

  setTimeout(() => {
    widgetIframeElement.style.transition = "";
  }, 320);
});

runtimeSendMessage("C_B_ON_LOAD", async (r) => {
  //  console.log(`Menu loaded: ${JSON.stringify(r)}`);
});

pageOnMessage("IF_C_SELECT_COORDS", async (data) => {
  const coordinates = data?.coordinates || data;
  document.getElementById("screenSelectorIframe")?.remove();
  const menuFrame = document.getElementById("spectralensWidgetIframe");
  const menuBack = document.getElementById("spectralensWidgetBack");
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

  const menuFrame = document.getElementById("spectralensWidgetIframe");
  const menuBack = document.getElementById("spectralensWidgetBack");
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
  const menuFrame = document.getElementById("spectralensWidgetIframe");
  const menuBack = document.getElementById("spectralensWidgetBack");
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
  const menuFrame = document.getElementById("spectralensWidgetIframe");
  const menuBack = document.getElementById("spectralensWidgetBack");
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
  isFirstWidgetSetup = true;
  sendResponse("ok");
  document.getElementById("spectralensWidgetIframe")?.remove();
  const back = document.getElementById("spectralensWidgetBack");

  if (back) {
    back.removeEventListener("pointerenter", handleWidgetPointerEnter);
    back.removeEventListener("pointerleave", handleWidgetPointerLeave);
    back.removeEventListener("pointerdown", handleWidgetPointerDown);
    window.removeEventListener("pointermove", handleWidgetPointerMove);
    back.removeEventListener("pointerup", handleWidgetPointerUp);
    back.remove();
  }
});

runtimeOnMessage("B_C_RESET_POSITION", async (_, __, sendResponse) => {
  widgetBackElement = document.getElementById("spectralensWidgetBack");
  widgetIframeElement = document.getElementById("spectralensWidgetIframe");
  if (widgetIframeElement && widgetBackElement) {
    const defaultLeft = 24;
    const defaultTop = 80;
    widgetBackElement.style.left = `${defaultLeft + widgetSpacing}px`;
    widgetBackElement.style.top = `${defaultTop}px`;
    widgetIframeElement.style.left = `${defaultLeft}px`;
    widgetIframeElement.style.top = `${defaultTop}px`;
  }
  sendResponse && sendResponse("ok");
});

window.addEventListener("message", async (event) => {
  const msgType = typeof event?.data?.type === "string" ? event.data.type : "";
  if (!msgType) return;

  if (msgType === "IF_B_CAPTURE_SCREEN") {
    console.log(`[SpectraLens:ContentBridge] 📸 Hiding extension UI for clean screen capture...`);
    const framesToHide = Array.from(
      document.querySelectorAll("#spectralensWidgetIframe, #screenSelectorIframe, #spectralens-widget-intro, #spectralens-tour-overlay, iframe[id*='menuWindow']"),
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
        const iframe = document.getElementById("spectralensWidgetIframe");
        if (res) {
          pagePostMessage(msgType, res, iframe?.contentWindow);
        }
      });
    }, 45);
    return;
  }

  if (msgType === "IF_B_CAPTURE_PAGE") {
    console.log(`[SpectraLens:ContentBridge] 📄 Extracting active page metadata, text, and top-section screenshot...`);
    const iframe = document.getElementById("spectralensWidgetIframe");

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
          "script, style, noscript, iframe, svg, #spectralensWidgetIframe, #screenSelectorIframe, [aria-hidden='true']",
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
        document.querySelectorAll("#spectralensWidgetIframe, #screenSelectorIframe, #spectralens-widget-intro, #spectralens-tour-overlay, iframe[id*='menuWindow']"),
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
      const iframe = document.getElementById("spectralensWidgetIframe");
      if (res) {
        pagePostMessage(msgType, res, iframe?.contentWindow);
      } else {
        console.warn(`[SpectraLens:ContentBridge] ⚠️ Background returned empty/null response for "${msgType}"`);
      }
    });
  } else if (msgType === "IF_C_GET_CURRENT_CONTROLS") {
    const iframe = document.getElementById("spectralensWidgetIframe");
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
      const iframe = document.getElementById("spectralensWidgetIframe");
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
  const themeMutationObserver = new MutationObserver(() => {
    const iframe = document.getElementById("spectralensWidgetIframe");
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

  themeMutationObserver.observe(document.documentElement, {
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
        const iframe = document.getElementById("spectralensWidgetIframe");
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
