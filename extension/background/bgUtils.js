/* ---------------- offscreen utils ---------------- */
async function ensureOffscreen() {
   try {
      if (chrome.offscreen?.hasDocument && !(await chrome.offscreen.hasDocument())) {
         console.log("[Background] Creating offscreen document for OCR worker...");
         await chrome.offscreen.createDocument({
            url: chrome.runtime.getURL("offscreen/offscreen.html"),
            reasons: ["BLOBS", "DOM_PARSER"],
            justification: "Need hidden DOM/canvas for local OCR processing",
         });
         console.log("[Background] Offscreen document created successfully.");
      }
   } catch (e) {
      console.warn("[Background] ensureOffscreen notice:", e?.message);
   }
}

/* ---------------- offscreen OCR engine ---------------- */
async function performOcrExtraction(imageData, rectInfo) {
   console.log("[Background] performOcrExtraction initializing offscreen document...");
   await ensureOffscreen();
   await wait(120);

   return new Promise((resolve) => {
      console.log("[Background] Posting C_OF_START_QRC to offscreen OCR worker...");
      runtimeSendMessage("C_OF_START_QRC", { imageData, rectInfo }, (res) => {
         console.log("[Background] OCR Worker response received:", res);
         if (res && res.success) {
            resolve(res);
         } else {
            console.error("[Background] OCR failed:", res?.error || res?.message);
            resolve(res || { success: false });
         }
      });
   });
}
const __OCR__ = performOcrExtraction;

/* ---------------- injects screen selector ---------------- */
function injectScreenSelector(tabId) {
   executeScript(
      tabId,
      () => {
         const existingFrame = document.getElementById("screenSelectorIframe");

         if (!existingFrame) {
            const frame = document.createElement("iframe");
            frame.setAttribute("id", "screenSelectorIframe");
            frame.setAttribute("allowtransparency", "true");
            frame.setAttribute("frameborder", "0");

            // Set inline styles for transparency
            frame.style = `
               position: fixed;
               width: 100svw;
               height: 100svh;
               inset: 0;
               border: none;
               background: transparent !important;
               z-index: 825003265;
               pointer-events: auto;
               isolation: isolate;
            `;

            // Add additional style attributes to ensure transparency
            const currentStyle = frame.getAttribute("style") || "";
            frame.setAttribute(
               "style",
               `${currentStyle}; color-scheme: normal !important;`
            );

            frame.src = chrome.runtime.getURL("./inject/selection.html");
            document.body.append(frame);
         }
      },
      tabId
   );
}
const __SELECT__ = injectScreenSelector;

/* ---------------- injects floating menu widget ---------------- */
function injectFloatingMenuWidget(tabId) {
   executeScript(
      tabId,
      () => {
         const existingMWF = document.getElementById("spectralensWidgetIframe");
         const existingMWB = document.getElementById("spectralensWidgetBack");

         if (!existingMWF) {
            /* ---------------- theme detection ---------------- */
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

                  if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
                     return "dark";
                  }
               } catch {
                  // ignore
               }
               return "light";
            }

            function setupThemeObserver(callback) {
               const observer = new MutationObserver(() => {
                  callback(detectPageTheme());
               });

               observer.observe(document.documentElement, {
                  attributes: true,
                  attributeFilter: ["class", "data-theme", "data-mode", "data-color-mode", "data-bs-theme", "color-scheme", "theme"],
               });

               if (document.body) {
                  observer.observe(document.body, {
                     attributes: true,
                     attributeFilter: ["class", "data-theme", "data-mode", "data-color-mode", "data-bs-theme", "color-scheme", "theme"],
                  });
               }

               return observer;
            }

            const currentTheme = detectPageTheme();

            const frame = document.createElement("iframe");
            frame.setAttribute("id", "spectralensWidgetIframe");
            frame.setAttribute("frameborder", "0");
            frame.setAttribute("allowtransparency", "true");
            frame.setAttribute("allow", "clipboard-write; clipboard-read");

            frame.setAttribute(
               "style",
               "background: transparent !important; background-color: transparent !important; color-scheme: normal !important; border: none !important; border-radius: 9999px;"
            );

            const style = document.createElement("style");
            style.textContent = `
               #spectralensWidgetIframe {
                  position: fixed;
                  top: 0px;
                  left: 0px;
                  width: 154px;
                  height: 48px;
                  background: transparent !important;
                  background-color: transparent !important;
                  color-scheme: normal !important;
                  border: none !important;
                  border-radius: 9999px;
                  z-index: 2147483646;
                  overscroll-behavior: contain !important;
                  transition: opacity 200ms ease-in-out;
               }
            `;

            document.head.appendChild(style);
            frame.src = chrome.runtime.getURL(`./inject/menuWindow.html?pageTheme=${currentTheme}`);
            document.body.append(frame);
         } else {
            existingMWF.style.display = "block";
         }

          if (!existingMWB) {
            const back = document.createElement("div");
            back.setAttribute("id", "spectralensWidgetBack");
            const defaultLeft = window.innerWidth - 180;
            back.setAttribute(
               "style",
               `
                 position: fixed;
                 top: 80px;
                 left: ${defaultLeft}px;
                 width: 84px;
                 height: 46px;
                 background: transparent !important;
                 z-index: 2147483647;
                 cursor: move;
                 border-radius: 24px 0 0 24px;
                 `
            );
            document.body.append(back);

            const onEnter = window.handleWidgetPointerEnter || window.__pointerenter__;
            const onLeave = window.handleWidgetPointerLeave || window.__pointerleave__;
            const onDown = window.handleWidgetPointerDown || window.__pointerdown__;
            const onMove = window.handleWidgetPointerMove || window.__pointermove__;
            const onUp = window.handleWidgetPointerUp || window.__pointerup__;

            if (typeof onEnter === "function") back.addEventListener("pointerenter", onEnter);
            if (typeof onLeave === "function") back.addEventListener("pointerleave", onLeave);
            if (typeof onDown === "function") back.addEventListener("pointerdown", onDown);
            if (typeof onMove === "function") window.addEventListener("pointermove", onMove);
            if (typeof onUp === "function") back.addEventListener("pointerup", onUp);
         } else {
            existingMWB.style.display = "block";
         }
      },
      tabId
   );
}
const __PUSH_MENU__ = injectFloatingMenuWidget;

function chromeTabMediaAccess(tabId, isBlocked = false) {
   if (!isBlocked) {
      chrome.declarativeNetRequest.updateSessionRules({
         removeRuleIds: [tabId],
      });
      return;
   }
   chrome.declarativeNetRequest.updateSessionRules({
      addRules: [
         {
            id: tabId,
            priority: 1,
            action: { type: "block" },
            condition: {
               resourceTypes: ["image", "media", "font"],
               tabIds: [tabId],
            },
         },
      ],
   });
}
