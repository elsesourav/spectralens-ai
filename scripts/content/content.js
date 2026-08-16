/* --- DOM Cleanup Helpers --- */

function removeElementBySelector(container, selector) {
  container.querySelector(selector)?.remove();
}

function removeElementsBySelector(container, selector) {
  container.querySelectorAll(selector)?.forEach((el) => el.remove());
}

/** Strip all attributes from an element and all its descendants */
function removeAllAttributes(container) {
  if (container.attributes) {
    Array.from(container.attributes).forEach((attr) => {
      container.removeAttribute(attr.name);
    });
  }
  container.querySelectorAll("*").forEach((element) => {
    if (element.attributes) {
      Array.from(element.attributes).forEach((attr) => {
        element.removeAttribute(attr.name);
      });
    }
  });
}

/* --- Content Scraping Constants --- */

const CONTENT_STABLE_WAIT_TIME = 1500; // ms - wait for content to stabilize

/* --- Main HTML Extraction --- */

/**
 * Extracts the visible HTML from a container, applying inline styles
 * and cleaning provider-specific UI elements (buttons, icons, etc.).
 * Returns a Promise that resolves with the cleaned outerHTML string
 * once the content has stabilized (no more text changes).
 */
function getProcessedHTML(container, provider) {
  return new Promise((resolve) => {
    if (container?.textContent?.trim()?.length < 10) {
      resolve(null);
      return;
    }

    let lastContent = container.innerHTML;
    let intervalId;

    /** Compare computed styles against a fresh default element */
    function getUserAppliedStyles(el) {
      const computed = getComputedStyle(el);
      const fresh = document.createElement(el.tagName);
      document.body.appendChild(fresh);
      const defaultStyles = getComputedStyle(fresh);

      const applied = {};
      for (const prop of computed) {
        if (computed[prop] !== defaultStyles[prop]) {
          applied[prop] = computed[prop];
        }
      }
      fresh.remove();
      return applied;
    }

    /** Recursively copy relevant inline styles from src to dst */
    function applyStyles(src, dst) {
      if (!src || !dst) return;
      const maxWidth = "400px";

      // Remove HTML comment nodes from the clone
      if (src.nodeType === Node.COMMENT_NODE) {
        dst.remove();
        return;
      }

      if (
        src.nodeType === Node.ELEMENT_NODE &&
        dst.nodeType === Node.ELEMENT_NODE
      ) {
        const appliedStyles = getUserAppliedStyles(src);
        let styleStr = "";

        const allowedStyles = [
          "margin", "margin-top", "margin-right", "margin-bottom", "margin-left",
          "padding", "padding-top", "padding-right", "padding-bottom", "padding-left",
          "border-radius", "font-weight", "font-size",
        ];

        Object.entries(appliedStyles).forEach(([prop, val]) => {
          if (prop === "width" || prop === "max-width") {
            styleStr += `${prop}:min(${val}, ${maxWidth});`;
          } else if (
            prop === "height" || prop === "max-height" || prop === "min-height"
          ) {
            styleStr += `${prop}:auto;`;
          } else if (
            allowedStyles.includes(prop) &&
            val && val !== "auto" && val !== "normal" &&
            val !== "none" && val !== "rgba(0, 0, 0, 0)"
          ) {
            styleStr += `${prop}:${val};`;
          }
        });

        if (styleStr) {
          dst.setAttribute("style", styleStr);
        }
      }

      // Use static arrays to avoid live NodeList shifting when removing comments
      const srcChildren = Array.from(src.childNodes);
      const dstChildren = Array.from(dst.childNodes);
      for (let i = 0; i < srcChildren.length; i++) {
        applyStyles(srcChildren[i], dstChildren[i]);
      }
    }

    /** Remove provider-specific interactive UI elements */
    function cleanProviderElements(container, provider) {
      removeElementsBySelector(container, "button");
      removeElementsBySelector(container, "* > a:has(svg)");

      switch (provider) {
        case "google":
          removeElementsBySelector(container, ".DBd2Wb");
          removeElementsBySelector(container, "img");
          removeElementsBySelector(container, "svg");
          removeElementsBySelector(
            container,
            `div[data-container-id="main-col"] > div > div:has(img)`,
          );
          removeElementsBySelector(
            container,
            '[style*="display:none"], [style*="display: none"]',
          );
          removeElementsBySelector(
            container,
            "[jsmodel]:not(:has(strong)):not(:has(b))",
          );
          break;

        case "bing":
          removeElementsBySelector(container, "* > a");
          removeElementBySelector(container, ".gs_ans_head_group");
          break;

        case "perplexity":
          removeElementBySelector(container, "div:first-child:has(img)");
          removeElementsBySelector(container, " button:has(img)");
          removeElementsBySelector(container, "* > [rel='noopener']");
          break;

        case "grok":
          break;

        case "gemini":
          removeElementsBySelector(container, "* > button:has(mat-icon)");
          removeElementsBySelector(container, "response-element");
          break;

        case "chatgpt":
          removeElementsBySelector(container, "button");
          removeElementsBySelector(container, "[data-testid*='copy']");
          break;

        case "claude":
          removeElementsBySelector(container, "button");
          break;
      }
    }

    /** Clone, style, strip attributes, and return final clean HTML */
    function generateHTMLCode() {
      cleanProviderElements(container, provider);
      const clone = container.cloneNode(true);
      applyStyles(container, clone);
      removeAllAttributes(clone);
      return clone.outerHTML;
    }

    /** Poll until content stops changing, then resolve with final HTML */
    function checkForUpdates() {
      const currentContent = container.textContent.length;

      if (currentContent !== lastContent) {
        lastContent = currentContent;
      } else {
        clearInterval(intervalId);
        resolve(generateHTMLCode());
      }
    }

    checkForUpdates();
    intervalId = setInterval(checkForUpdates, CONTENT_STABLE_WAIT_TIME);
  });
}

/* --- Content Polling --- */

const POLL_MAX_ATTEMPTS = 40;
const POLL_CHECK_DELAY = 500; // ms

/**
 * Repeatedly calls `fetchFn` until it returns truthy content.
 * Returns an error message if `fetchFn` returns `false` (limit exceeded)
 * or after max attempts.
 */
function pollForContent(fetchFn) {
  const errorMsg =
    "<mark>Limit Exceeded or Slow Network, Try Again after some time.</mark>";

  return new Promise(async (resolve) => {
    for (let i = 0; i < POLL_MAX_ATTEMPTS; i++) {
      const html = await fetchFn();

      if (html === false) {
        resolve(errorMsg);
        return;
      } else if (html) {
        resolve(html);
        return;
      }
      await new Promise((r) => setTimeout(r, POLL_CHECK_DELAY));
    }
    resolve(errorMsg);
  });
}

/* --- AI Provider Input Helpers --- */

/** Type a prompt into Gemini's editor and submit it */
async function submitToGemini(prompt) {
  const editor = document.querySelector(
    "div.ql-editor.textarea, rich-textarea > div, div[contenteditable='true']",
  );

  if (editor) {
    editor.textContent = "";
    editor.textContent = prompt;

    editor.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        cancelable: true,
        inputType: "insertText",
        data: prompt,
      }),
    );

    await new Promise((r) => setTimeout(r, 200));

    const sendBtn = document.querySelector(
      "button.send-button, button[aria-label*='Send'], button[aria-label*='Submit'], .send-button",
    );
    if (sendBtn) {
      sendBtn.click();
    } else {
      console.error("Gemini send button not found.");
    }
  } else {
    console.error("Gemini input box not found.");
  }
}

/** Type a prompt into ChatGPT editor and submit it */
async function submitToChatGpt(prompt) {
  const editor = document.querySelector(
    "#prompt-textarea, textarea[data-id='root'], div[contenteditable='true'][id='prompt-textarea']",
  );

  if (editor) {
    if (editor.tagName.toLowerCase() === "textarea") {
      editor.value = prompt;
      editor.dispatchEvent(new Event("input", { bubbles: true }));
      editor.dispatchEvent(new Event("change", { bubbles: true }));
    } else {
      editor.textContent = prompt;
      editor.dispatchEvent(
        new InputEvent("input", {
          bubbles: true,
          cancelable: true,
          inputType: "insertText",
          data: prompt,
        }),
      );
    }

    await new Promise((r) => setTimeout(r, 200));

    const sendBtn = document.querySelector(
      "button[data-testid='send-button'], button[aria-label*='Send prompt'], button[aria-label*='Send']",
    );
    if (sendBtn && !sendBtn.disabled) {
      sendBtn.click();
    } else {
      editor.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Enter",
          code: "Enter",
          keyCode: 13,
          bubbles: true,
        }),
      );
    }
  }
}

/** Type a prompt into Claude editor and submit it */
async function submitToClaude(prompt) {
  const editor = document.querySelector(
    "div.ProseMirror, fieldset div[contenteditable='true'], div[contenteditable='true']",
  );

  if (editor) {
    editor.textContent = prompt;
    editor.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        cancelable: true,
        inputType: "insertText",
        data: prompt,
      }),
    );

    await new Promise((r) => setTimeout(r, 200));

    const sendBtn = document.querySelector(
      "button[aria-label*='Send Message'], button[aria-label*='Send']",
    );
    if (sendBtn) {
      sendBtn.click();
    }
  }
}

/* --- Global Styles --- */

onload = () => {
  const style = document.createElement("style");
  style.innerHTML = `
      iframe {
         overflow: hidden !important;
         overscroll-behavior: contain;
      }
   `;
  document.head.appendChild(style);
};
