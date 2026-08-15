/* ---------------- offscreen utils ---------------- */
async function ensureOffscreen() {
   if (!(await chrome.offscreen.hasDocument())) {
      await chrome.offscreen.createDocument({
         url: "./../offscreen/offscreen.html",
         reasons: ["BLOBS"],
         justification: "Need hidden DOM/canvas",
      });
   }
}

/* ---------------- offscreen ---------------- */
async function __OCR__(imageData, rectInfo) {
   await ensureOffscreen();
   await wait(100);

   return new Promise((resolve) => {
      runtimeSendMessage("C_OF_START_QRC", { imageData, rectInfo }, (res) => {
         if (res.success) {
            resolve(res);
         } else {
            console.error("OCR failed:", res.message);
            resolve(res.message);
         }
      });
   });
}

/* ---------------- injects content script ---------------- */
function __SELECT__(tabId) {
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

function __PUSH_MENU__(tabId) {
   executeScript(
      tabId,
      () => {
         const existingMWF = document.getElementById("__menuWindowIframe");
         const existingMWB = document.getElementById("__menuWindowBack");

         if (!existingMWF) {
            /* ---------------- theme detection ---------------- */
            function detectPageTheme() {
               // Check if page has dark mode indicators
               const body = document.body;
               const html = document.documentElement;

               // Get computed styles
               const bodyStyles = getComputedStyle(body);
               const htmlStyles = getComputedStyle(html);

               // Check background colors
               const bodyBg = bodyStyles.backgroundColor;
               const htmlBg = htmlStyles.backgroundColor;

               // Convert rgb to brightness
               function getBrightness(rgb) {
                  const match = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
                  if (match) {
                     const r = parseInt(match[1]);
                     const g = parseInt(match[2]);
                     const b = parseInt(match[3]);
                     return (r * 299 + g * 587 + b * 114) / 1000;
                  }
                  return 255; // default to light if can't parse
               }

               // Focus on page content brightness only
               const hasDataTheme =
                  html.getAttribute("data-theme") === "dark" ||
                  body.getAttribute("data-theme") === "dark";
               const hasThemeClass =
                  html.classList.contains("dark") ||
                  body.classList.contains("dark") ||
                  html.classList.contains("dark-mode") ||
                  body.classList.contains("dark-mode");

               // Check background brightness - primary indicator
               const bodyBrightness = getBrightness(bodyBg);
               const htmlBrightness = getBrightness(htmlBg);
               const isDarkBackground =
                  bodyBrightness < 128 || htmlBrightness < 128;

               // Return theme based on content page indicators only (no system theme)
               if (hasDataTheme || hasThemeClass || isDarkBackground) {
                  return "dark";
               }

               return "light";
            }

            function setupThemeObserver(callback) {
               // Watch for theme changes
               const observer = new MutationObserver(() => {
                  callback(detectPageTheme());
               });

               // Observe changes to class and data attributes
               observer.observe(document.documentElement, {
                  attributes: true,
                  attributeFilter: ["class", "data-theme", "data-color-scheme"],
               });

               observer.observe(document.body, {
                  attributes: true,
                  attributeFilter: ["class", "data-theme", "data-color-scheme"],
               });

               // Watch for media query changes - removed system theme dependency
               // const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
               // mediaQuery.addListener(() => {
               //    callback(detectPageTheme());
               // });

               return observer;
            }

            const currentTheme = detectPageTheme();

            const frame = document.createElement("iframe");
            frame.setAttribute("id", "__menuWindowIframe");
            frame.setAttribute("frameborder", "0");
            frame.setAttribute("allowtransparency", "true");

            frame.setAttribute(
               "style",
               "background: transparent !important; background-color: transparent !important; color-scheme: normal !important; border: none !important; border-radius: 9999px;"
            );

            const style = document.createElement("style");
            style.textContent = `
               #__menuWindowIframe {
                  position: fixed;
                  top: 0px;
                  left: 0px;
                  width: 148px;
                  height: 48px;
                  background: transparent !important;
                  background-color: transparent !important;
                  color-scheme: normal !important;
                  border: none !important;
                  border-radius: 9999px;
                  z-index: 825003263;
                  overscroll-behavior: contain !important;
                  transition: opacity 200ms ease-in-out;
               }
            `;

            document.head.appendChild(style);
            frame.src = chrome.runtime.getURL("./inject/menuWindow.html");
            document.body.append(frame);
         } else {
            existingMWF.style.display = "block";
         }

         if (!existingMWB) {
            const back = document.createElement("div");
            back.setAttribute("id", "__menuWindowBack");
            const defaultLeft = window.innerWidth - 160;
            back.setAttribute(
               "style",
               `
               position: fixed;
               top: 80px;
               left: ${defaultLeft}px;
               width: 40px;
               height: 48px;
               background: transparent !important;
               z-index: 2147483646;
               cursor: move;
               border-radius: 12px 0 0 12px;
               `
            );
            document.body.append(back);

            back.addEventListener("pointerenter", __pointerenter__);
            back.addEventListener("pointerleave", __pointerleave__);
            back.addEventListener("pointerdown", __pointerdown__);
            window.addEventListener("pointermove", __pointermove__);
            back.addEventListener("pointerup", __pointerup__);
         } else {
            existingMWB.style.display = "block";
         }
      },
      tabId
   );
}

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
