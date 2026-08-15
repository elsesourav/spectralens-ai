const __iframeSize = { width: "148px", height: "48px" };
const __spacing = 0;
let __isDragging = false;
const __pointerOffset = { x: 0, y: 0 };
let __main_menu__ = null;
let __menu_back__ = null;
let __isFirstSetup = true;
let __isNoMoveOpenToClose = false;
const __lastLocation = { x: 0, y: 0 };

// Collision detection function to keep back within viewport bounds
const __applyCollisionDetection__ = (left, top) => {
   const menuWidth = parseInt(__iframeSize.width);
   const menuHeight = parseInt(__iframeSize.height);

   // Get viewport dimensions
   const VW = window.innerWidth;
   const VH = window.innerHeight;

   // Constrain position to viewport bounds
   const constrainedLeft = Math.max(0, Math.min(left, VW - menuWidth));
   const constrainedTop = Math.max(0, Math.min(top, VH - menuHeight));

   return { x: constrainedLeft, y: constrainedTop };
};

function __pointerenter__() {
   __menu_back__ = document.getElementById("__menuWindowBack");
   __main_menu__ = document.getElementById("__menuWindowIframe");
   const menuFrame = document.getElementById("__menuWindowIframe");
   pagePostMessage("C_IF_MENU_WINDOW_DRAG_START", {}, menuFrame?.contentWindow);
}

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
      newTop
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
      top
   );
   __menu_back__.style.left = `${constrainedPosition.x + __spacing}px`;
   __menu_back__.style.top = `${constrainedPosition.y}px`;

   __main_menu__.style.left = `${constrainedPosition.x}px`;
   __main_menu__.style.top = `${constrainedPosition.y}px`;
}

function detectPageTheme() {
   try {
      const docCls = document.documentElement.className || "";
      const bodyCls = document.body?.className || "";
      const docTheme =
         document.documentElement.getAttribute("data-theme") ||
         document.documentElement.getAttribute("data-mode") ||
         document.documentElement.getAttribute("data-color-mode") ||
         document.body?.getAttribute("data-theme") ||
         "";

      if (
         docCls.includes("dark") ||
         bodyCls.includes("dark") ||
         docTheme.toLowerCase().includes("dark")
      ) {
         return "dark";
      }

      if (
         docCls.includes("light") ||
         bodyCls.includes("light") ||
         docTheme.toLowerCase().includes("light")
      ) {
         return "light";
      }

      // Check computed background color of body or root
      const bodyBg = window.getComputedStyle(
         document.body || document.documentElement
      ).backgroundColor;
      const rgb = bodyBg.match(/\d+/g);
      if (rgb && rgb.length >= 3) {
         const [r, g, b] = rgb.map(Number);
         const brightness = (r * 299 + g * 587 + b * 114) / 1000;
         if (brightness < 128 && (rgb.length < 4 || Number(rgb[3]) > 0.3)) {
            return "dark";
         }
      }

      // Fallback to system preferences
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
      const curLeft = Number.parseFloat(__main_menu__.style.left) || 0;
      const curTop = Number.parseFloat(__main_menu__.style.top) || 0;
      const constrainedPosition = __applyCollisionDetection__(
         curLeft + deltaX,
         curTop + deltaY
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

   if (__main_menu__) {
      __main_menu__.style.borderRadius = isOpen ? "16px" : "9999px";
   }

   const w = parseInt(width) || 440;
   const newBackWidth = isOpen ? w - 44 : 38;
   const newBackHeight = isOpen ? 40 : 48;
   if (__menu_back__) {
      __menu_back__.style.width = `${newBackWidth}px`;
      __menu_back__.style.height = `${newBackHeight}px`;
   }

   const rect = __menu_back__.getBoundingClientRect();
   let constrainedPosition = __applyCollisionDetection__(
      rect.left - __spacing,
      rect.top
   );

   // if no change open and close then set old position
   if (isOpen && !__isNoMoveOpenToClose) {
      __lastLocation.x = parseInt(rect.left);
      __lastLocation.y = parseInt(rect.top);
      __isNoMoveOpenToClose = true;
   } else if (__isNoMoveOpenToClose) {
      __isNoMoveOpenToClose = false;
      constrainedPosition = {
         x: __lastLocation.x - __spacing,
         y: __lastLocation.y,
      };
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
   }

   __main_menu__.style.borderRadius = isOpen ? "20px" : "24px";
   __main_menu__.style.width = __iframeSize.width;
   __main_menu__.style.height = __iframeSize.height;

   setTimeout(() => {
      __main_menu__.style.transition = "";
   }, 320);
});

runtimeSendMessage("C_B_ON_LOAD", async (r) => {
   console.log(`Menu loaded: ${JSON.stringify(r)}`);
});

pageOnMessage("IF_C_SELECT_COORDS", async ({ coordinates }) => {
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
   runtimeSendMessage("C_B_CAPTURE_DOM", {
      coordinates,
      devicePixelRatio: window.devicePixelRatio,
   });
});

runtimeOnMessage("B_C_OCR_RESULT", async (data, _, sendResponse) => {
   const { text, image } = data;
   sendResponse({ success: true });

   const menuFrame = document.getElementById("__menuWindowIframe");
   const menuBack = document.getElementById("__menuWindowBack");
   if (menuFrame) {
      menuFrame.style.display = "block";
      pagePostMessage(
         "C_IF_SET_INPUTS",
         { input: text, image },
         menuFrame.contentWindow
      );
      pagePostMessage("C_IF_OPEN_CHAT", {}, menuFrame.contentWindow);
      pagePostMessage("C_IF_VISIBLE", {}, menuFrame.contentWindow);
      pagePostMessage("C_IF_SHOW", {}, menuFrame.contentWindow);
   }
   if (menuBack) {
      menuBack.style.display = "block";
   }
});

pageOnMessage("IF_C_SELECT_CANCEL", async () => {
   console.log("Selection cancelled");
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
   document.getElementById("screenSelectorIframe")?.remove();
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
   if (event?.data?.type?.includes("IF_B_")) {
      // console.log("Received message from background:", event.data);

      runtimeSendMessage(event.data.type, { ...event.data }, (res) => {
         const iframe = document.getElementById("__menuWindowIframe");
         pagePostMessage(event.data.type, res, iframe?.contentWindow);
      });

   } else if (event?.data?.type === "IF_C_GET_CURRENT_CONTROLS") {
      const iframe = document.getElementById("__menuWindowIframe");
      try {
         const getControlsSettings = await chromeStorageGetLocal(KEYS.CONTROLS);
         pagePostMessage(
            event.data.type,
            {
               success: true,
               controls: getControlsSettings,
               pageTheme: detectPageTheme(),
            },
            iframe?.contentWindow
         );
      } catch (error) {
         pagePostMessage(
            event.data.type,
            {
               success: false,
               message: error.message,
               pageTheme: detectPageTheme(),
            },
            iframe?.contentWindow
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
               iframe.contentWindow
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
               iframe.contentWindow
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
                     iframe.contentWindow
                  );
               });
            }
         });
   }
} catch {
   // ignore
}
