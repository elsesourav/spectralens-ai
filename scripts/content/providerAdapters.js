/**
 * ============================================================================
 * SPECTRALENS AI — PROVIDER ADAPTER ARCHITECTURE
 * ============================================================================
 * Isolated, modular automation adapters for each AI provider web interface.
 * Implements input injection, event triggering, streaming observation,
 * and clean response extraction without monolithic if/else statements.
 * ============================================================================
 */

(function (global) {
  "use strict";

  /** Forward logs to background console */
  function tabLog(tag, message, data = null) {
    console.log(`[SpectraLens:${tag}] ${message}`, data || "");
    try {
      if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
        chrome.runtime
          .sendMessage({
            type: "TAB_LOG",
            tag,
            message,
            data,
          })
          .catch(() => {});
      }
    } catch {}
  }

  /**
   * Parse RGB, RGBA, Hex (#rgb, #rrggbb), and CSS Color Level 4 (rgb(r g b / a), color(srgb))
   */
  function parseRgbColor(colorStr) {
    if (!colorStr || typeof colorStr !== "string") return null;
    const str = colorStr.trim();

    // 1. Standard rgb(r, g, b) or rgba(r, g, b, a) or space-separated rgb(r g b)
    const rgbMatch = str.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?\s*\)/i);
    if (rgbMatch) {
      return {
        r: Math.round(parseFloat(rgbMatch[1])),
        g: Math.round(parseFloat(rgbMatch[2])),
        b: Math.round(parseFloat(rgbMatch[3])),
        a: rgbMatch[4] !== undefined ? parseFloat(rgbMatch[4]) : 1,
      };
    }

    // 2. Hex #rrggbb, #rgba, #rgb
    if (str.startsWith("#")) {
      const hex = str.slice(1);
      if (hex.length === 3 || hex.length === 4) {
        return {
          r: parseInt(hex[0] + hex[0], 16),
          g: parseInt(hex[1] + hex[1], 16),
          b: parseInt(hex[2] + hex[2], 16),
          a: hex[3] ? parseInt(hex[3] + hex[3], 16) / 255 : 1,
        };
      }
      if (hex.length === 6 || hex.length === 8) {
        return {
          r: parseInt(hex.slice(0, 2), 16),
          g: parseInt(hex.slice(2, 4), 16),
          b: parseInt(hex.slice(4, 6), 16),
          a: hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1,
        };
      }
    }

    // 3. color(srgb r g b)
    const srgbMatch = str.match(/color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)/i);
    if (srgbMatch) {
      return {
        r: Math.round(parseFloat(srgbMatch[1]) * 255),
        g: Math.round(parseFloat(srgbMatch[2]) * 255),
        b: Math.round(parseFloat(srgbMatch[3]) * 255),
        a: srgbMatch[4] !== undefined ? parseFloat(srgbMatch[4]) : 1,
      };
    }

    return null;
  }

  /**
   * Deep Theme-Aware Color Virtualizer
   * Replaces static hardcoded computed colors with dynamic SpectraLens CSS variables
   * so the entire response automatically adapts to Light, Dark, High-Contrast & Custom themes.
   */
  function virtualizeComputedStyle(prop, val, tagName = "", isTopContainer = false) {
    if (!val || val === "normal" || val === "none" || val === "auto" || val === "0px") return "";
    if (val === "rgba(0, 0, 0, 0)" || val === "transparent") {
      return prop.includes("background") ? "transparent" : "";
    }

    const tag = (tagName || "").toUpperCase();

    // 1. Color / Background / Border / Fill / Stroke Virtualization
    if (
      prop === "color" ||
      prop === "background-color" ||
      (prop.includes("border") && prop.includes("color")) ||
      prop === "fill" ||
      prop === "stroke"
    ) {
      const rgb = parseRgbColor(val);
      if (!rgb) {
        if (prop === "color") return "var(--sl-text-primary, #0f172a)";
        return val;
      }
      const { r, g, b, a } = rgb;
      if (a < 0.05) return prop.includes("background") ? "transparent" : "";

      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      const isBlue = b > r + 30 && b > g;
      const isRed = r > g + 40 && r > b + 40;
      const isGreen = g > r + 30 && g > b + 30;

      // Text Colors
      if (prop === "color") {
        if (tag === "A" || isBlue) return "var(--sl-text-link, #2563eb)";
        if (isRed) return "var(--sl-text-danger, #ef4444)";
        if (isGreen) return "var(--sl-text-success, #10b981)";
        if (lum < 80 || lum > 210) return "var(--sl-text-primary, #0f172a)";
        if (lum >= 80 && lum < 140) return "var(--sl-text-secondary, #334155)";
        return "var(--sl-text-muted, #64748b)";
      }

      // Background Colors
      if (prop === "background-color") {
        if (tag === "PRE" || tag === "CODE") return "var(--sl-bg-code, #f1f5f9)";
        if (isBlue && (a < 0.3 || lum > 190)) return "var(--sl-accent-bg, rgba(59, 130, 246, 0.08))";
        // Near-white / very light surfaces
        if (r >= 235 && g >= 235 && b >= 235) {
          if (isTopContainer || tag === "SECTION" || tag === "MAIN" || (tag === "DIV" && !tag.includes("BUTTON"))) {
            return "transparent";
          }
          return "var(--sl-bg-surface-elevated, #ffffff)";
        }
        // Subtle pills / chips
        if (lum >= 190) {
          return "var(--sl-bg-surface-subtle, #f1f5f9)";
        }
        // Dark host mode backgrounds
        if (lum < 70) {
          if (isTopContainer) return "transparent";
          return "var(--sl-bg-surface, rgba(30, 41, 59, 0.7))";
        }
        return "var(--sl-bg-surface-subtle, #f1f5f9)";
      }

      // Border Colors
      if (prop.includes("border") && prop.includes("color")) {
        if (isBlue) return "var(--sl-accent, #3b82f6)";
        if (lum > 175) return "var(--sl-border-subtle, #e2e8f0)";
        return "var(--sl-border-strong, #cbd5e1)";
      }

      // SVG Fill & Stroke
      if (prop === "fill" || prop === "stroke") {
        if (isBlue) return "var(--sl-text-link, #2563eb)";
        return "currentColor";
      }
    }

    // 2. Box Shadow Virtualization
    if (prop === "box-shadow" && val && val !== "none") {
      return "var(--sl-shadow, 0 1px 3px rgba(0, 0, 0, 0.06))";
    }

    // 3. Font Family Normalization
    if (prop === "font-family") {
      return "var(--sl-font-family, 'Google Sans', Roboto, -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif)";
    }

    // 4. Compact Font-Size & Line-Height Scaling (Fit cleanly in chatbot popup/menu)
    if (prop === "font-size") {
      const match = String(val).match(/([\d.]+)px/i);
      if (match) {
        const px = parseFloat(match[1]);
        if (px >= 24) return "15px";
        if (px >= 20) return "14px";
        if (px >= 16) return "12.5px";
        if (px >= 14) return "12px";
        if (px >= 12) return "11px";
        return `${Math.max(10, Math.round(px * 0.82))}px`;
      }
    }

    if (prop === "line-height") {
      const match = String(val).match(/([\d.]+)px/i);
      if (match) {
        const px = parseFloat(match[1]);
        if (px >= 28) return "20px";
        if (px >= 22) return "18px";
        if (px >= 18) return "16px";
        return `${Math.max(14, Math.round(px * 0.82))}px`;
      }
    }

    // 5. Margin & Padding Compact Scaling for small chatbot view
    if (prop.startsWith("margin-") || prop.startsWith("padding-")) {
      const match = String(val).match(/([\d.]+)px/i);
      if (match) {
        const px = parseFloat(match[1]);
        if (px > 14) return "8px";
        if (px > 10) return "6px";
      }
    }

    return val;
  }

  /**
   * Abstract Base Provider Adapter
   */
  class BaseProviderAdapter {
    constructor(id, name, hostPattern) {
      this.id = id;
      this.name = name;
      this.hostPattern = hostPattern;
    }

    /** Check if the current page matches this provider */
    detect() {
      if (this.hostPattern instanceof RegExp) {
        return this.hostPattern.test(window.location.hostname);
      }
      return window.location.hostname.includes(this.hostPattern);
    }

    /** Find the prompt input element */
    findInput() {
      throw new Error("findInput() must be implemented by subclass");
    }

    /** Focus the prompt input element */
    focusInput() {
      const input = this.findInput();
      if (input) {
        input.focus();
        return true;
      }
      return false;
    }

    /** Safely insert prompt text and synchronize framework/DOM state */
    async insertPrompt(text) {
      throw new Error("insertPrompt() must be implemented by subclass");
    }

    /** Find the submit/send button */
    findSendButton() {
      return null;
    }

    /** Check if submission is ready */
    canSubmit() {
      return Boolean(this.findSendButton() || this.findInput());
    }

    /** Trigger submission via button click or Enter keydown */
    async submit() {
      const sendBtn = this.findSendButton();
      if (sendBtn && !sendBtn.disabled && sendBtn.getAttribute("aria-disabled") !== "true") {
        sendBtn.click();
        return true;
      }

      const input = this.findInput();
      if (input) {
        input.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "Enter",
            code: "Enter",
            keyCode: 13,
            which: 13,
            bubbles: true,
            cancelable: true,
          }),
        );
        return true;
      }
      return false;
    }

    /** Find the response/assistant message container */
    findResponseContainer() {
      return null;
    }

    /** Check if response is currently streaming */
    isStreaming() {
      return false;
    }

    /** Check if response generation has completed */
    isComplete() {
      return true;
    }

    /** Find native copy button on the response */
    findCopyButton() {
      const container = this.findResponseContainer();
      const selectors = [
        'button[aria-label*="Copy" i]',
        'button[data-testid*="copy" i]',
        'button[title*="Copy" i]',
        'div[role="button"][aria-label*="Copy" i]',
        'button.copy-btn',
        'button.action-btn',
      ];
      for (const sel of selectors) {
        const btn = (container ? container.querySelector(sel) : null) || document.querySelector(sel);
        if (btn && btn.offsetParent !== null) {
          return btn;
        }
      }
      return null;
    }

    /** Base junk selectors to remove before DOM serialization */
    getJunkSelectors() {
      return [
        "button",
        "form",
        "dialog",
        "aside",
        "nav",
        "footer",
        '[role="dialog"]',
        '[role="alert"]',
        '[role="toolbar"]',
        '[aria-hidden="true"]',
        ".copy-button",
        ".action-button",
        ".screen-reader-only",
        ".sr-only",
        '[style*="display: none"]',
        '[style*="display:none"]',
        '[style*="visibility: hidden"]',
        '[style*="visibility:hidden"]',
      ];
    }

    /** Clean cloned DOM before converting or styling */
    cleanCloneNode(clone) {
      if (!clone || !clone.querySelectorAll) return;
      const selectors = this.getJunkSelectors();
      for (const sel of selectors) {
        try {
          clone.querySelectorAll(sel).forEach((el) => el.remove());
        } catch {}
      }

      // Unhide Google AI and provider streaming/animation accessibility nodes (e.g. data-sae with opacity:0)
      try {
        clone.querySelectorAll("[data-sae], [data-subtree], [style*='opacity'], [style*='pointer-events']").forEach((el) => {
          el.removeAttribute("data-sae");
          if (el.style.opacity === "0" || el.style.opacity === "0.0") {
            el.style.opacity = "1";
          }
          if (el.style.pointerEvents === "none") {
            el.style.pointerEvents = "auto";
          }
          if (el.style.visibility === "hidden") {
            el.style.visibility = "visible";
          }
        });
      } catch {}

      // Prune empty container elements (e.g. empty div, span, p, section) that have no text and no children
      // preserving void/standalone elements like hr, br, img, svg, video, audio, canvas
      try {
        const preservedTags = new Set([
          "HR",
          "BR",
          "IMG",
          "SVG",
          "VIDEO",
          "AUDIO",
          "CANVAS",
          "IFRAME",
          "INPUT",
          "TEXTAREA",
        ]);

        let removedAny = true;
        let passes = 0;
        while (removedAny && passes < 4) {
          removedAny = false;
          passes++;
          const allEls = clone.querySelectorAll(
            "div, span, p, section, article, ul, ol, li, h1, h2, h3, h4, h5, h6, b, strong, em, i"
          );
          for (const el of allEls) {
            if (preservedTags.has(el.tagName)) continue;
            // If element contains any preserved elements inside, don't remove
            if (el.querySelector("hr, br, img, svg, video, audio, canvas, iframe, input, textarea")) continue;

            const text = (el.textContent || "").trim();
            if (text === "" && el.children.length === 0) {
              el.remove();
              removedAny = true;
            }
          }
        }
      } catch {}
    }

    /**
     * Extracts exact styled HTML from the live DOM container,
     * converting all visual styles to responsive theme-aware CSS variables.
     */
    extractStyledHtml(container) {
      if (!container) return "";
      let targetNode = container;

      if (typeof container.cloneNode === "function") {
        const clone = container.cloneNode(true);

        // 1. Recursive Theme-Aware Computed Style Snapshotting
        try {
          const props = [
            "color",
            "background-color",
            "border-color",
            "border-top-color",
            "border-bottom-color",
            "border-left-color",
            "border-right-color",
            "border-width",
            "border-style",
            "border-radius",
            "font-family",
            "font-size",
            "font-weight",
            "font-style",
            "line-height",
            "letter-spacing",
            "text-align",
            "display",
            "flex-direction",
            "flex-wrap",
            "align-items",
            "justify-content",
            "gap",
            "margin-top",
            "margin-bottom",
            "margin-left",
            "margin-right",
            "padding-top",
            "padding-bottom",
            "padding-left",
            "padding-right",
            "list-style-type",
            "list-style-position",
            "box-shadow",
            "fill",
            "stroke",
          ];

          const copyStylesRecursive = (live, cloned, isTop = true) => {
            if (!live || !cloned || live.nodeType !== 1 || cloned.nodeType !== 1) return;
            const comp = window.getComputedStyle(live);
            if (comp) {
              let styleStr = cloned.getAttribute("style") || "";
              for (const p of props) {
                const rawVal = comp.getPropertyValue(p);
                const themeVal = virtualizeComputedStyle(p, rawVal, live.tagName, isTop);
                if (themeVal) {
                  styleStr += `;${p}:${themeVal}`;
                }
              }
              if (styleStr) {
                cloned.setAttribute("style", styleStr);
              }
            }

            // Ensure safe anchor attributes
            if (cloned.tagName === "A") {
              cloned.setAttribute("target", "_blank");
              cloned.setAttribute("rel", "noopener noreferrer");
            }

            const liveChildren = Array.from(live.children || []);
            const cloneChildren = Array.from(cloned.children || []);
            const count = Math.min(liveChildren.length, cloneChildren.length);
            for (let i = 0; i < count; i++) {
              copyStylesRecursive(liveChildren[i], cloneChildren[i], false);
            }
          };

          copyStylesRecursive(container, clone, true);
        } catch (e) {
          tabLog("ProviderAdapter", `Style virtualization note: ${e.message}`);
        }

        // 2. Clean out junk action toolbars from cloned tree
        if (clone && clone.querySelectorAll) {
          this.cleanCloneNode(clone);
        }

        targetNode = clone;
      }

      // Return exact theme-aware HTML wrapped in isolated container with text-selection enabled
      let innerContent = (targetNode.innerHTML || targetNode.textContent || "").trim();

      // Clean hidden opacity/pointer-events artifacts left from provider streaming
      innerContent = innerContent
        .replace(/opacity:\s*0(?:\.0+)?\s*;?/gi, "opacity: 1;")
        .replace(/pointer-events:\s*none\s*;?/gi, "pointer-events: auto;")
        .replace(/visibility:\s*hidden\s*;?/gi, "visibility: visible;")
        .replace(/<!--TgQPHd[^>]*-->/gi, "");

      // Remove empty container tags like <div></div>, <span></span>, <p></p> (preserving <hr>, <br>, <img>, <svg>)
      let prevContent = "";
      let iterations = 0;
      while (prevContent !== innerContent && iterations < 3) {
        prevContent = innerContent;
        iterations++;
        innerContent = innerContent.replace(/<(div|span|p|section|article|b|strong|em|i|li|ul|ol)\b[^>]*>\s*<\/\1>/gi, "");
      }

      return `<div class="spectralens-isolated-response select-text" style="font-family: var(--sl-font-family, 'Google Sans', Roboto, -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif); font-size: 13px; line-height: 1.55; max-width: 100%; box-sizing: border-box; overflow-wrap: break-word; color: var(--sl-text-primary, #0f172a); user-select: text !important;">${innerContent.trim()}</div>`;
    }

    /** Provider-specific post-processing hook for extracted Markdown */
    postProcessResponse(md) {
      if (!md || typeof md !== "string") return "";
      let cleaned = md;
      if (typeof stripAiUiBoilerplate === "function") {
        cleaned = stripAiUiBoilerplate(cleaned);
      }
      return cleaned.trim();
    }

    /** Extract cleaned, structured Semantic Markdown directly from the response container */
    async getCurrentResponse() {
      const container = this.findResponseContainer();
      if (!container) return "";

      // 1. Clone container to safely clean DOM elements before serialization
      let targetNode = container;
      if (typeof container.cloneNode === "function") {
        const clone = container.cloneNode(true);
        if (clone && clone.querySelectorAll) {
          this.cleanCloneNode(clone);
          targetNode = clone;
        }
      }

      // 2. Standard AST DOM to Markdown conversion
      let md = "";
      if (typeof domToMarkdown === "function") {
        md = domToMarkdown(targetNode);
      } else if (typeof htmlToMarkdown === "function") {
        md = htmlToMarkdown(targetNode.innerHTML || targetNode.textContent);
      } else if (typeof getProcessedHTML === "function") {
        md = await getProcessedHTML(targetNode, this.id);
      } else {
        md = targetNode.innerText || targetNode.textContent;
      }

      // 3. Provider-specific post-processing rules
      if (md) {
        md = this.postProcessResponse(md);
      }

      return (md || "").trim();
    }

    /** Observe response streaming until completion */
    observeResponse(timeoutMs = 25000) {
      return new Promise(async (resolve) => {
        const startTime = Date.now();
        let lastTextLength = 0;
        let idleCount = 0;

        const checkInterval = setInterval(async () => {
          if (Date.now() - startTime > timeoutMs) {
            clearInterval(checkInterval);
            const response = await this.getCurrentResponse();
            resolve(response || "<mark>Response generation timed out.</mark>");
            return;
          }

          if (this.isComplete()) {
            const container = this.findResponseContainer();
            if (container) {
              const currentLength = (container.textContent || "").length;
              if (currentLength > 0 && currentLength === lastTextLength) {
                idleCount++;
                if (idleCount >= 3) {
                  clearInterval(checkInterval);
                  resolve(await this.getCurrentResponse());
                  return;
                }
              } else {
                lastTextLength = currentLength;
                idleCount = 0;
              }
            }
          }
        }, 400);
      });
    }

    cleanup() {}
  }

  /* -------------------------------------------------------------------------- */
  /* 1. ChatGPT Adapter (chatgpt.com)                                           */
  /* -------------------------------------------------------------------------- */
  class ChatGPTAdapter extends BaseProviderAdapter {
    constructor() {
      super("chatgpt", "ChatGPT", /chatgpt\.com/);
    }

    findInput() {
      return document.querySelector(
        'div[role="textbox"][aria-label="Chat with ChatGPT"], #prompt-textarea, textarea[data-id="root"], div.ProseMirror[contenteditable="true"]',
      );
    }

    async insertPrompt(text) {
      const input = this.findInput();
      if (!input) return false;

      this.focusInput();
      await new Promise((r) => setTimeout(r, 50));

      if (input.tagName.toLowerCase() === "textarea") {
        const nativeSetter = Object.getOwnPropertyDescriptor(
          window.HTMLTextAreaElement.prototype,
          "value",
        )?.set;
        if (nativeSetter) {
          nativeSetter.call(input, text);
        } else {
          input.value = text;
        }
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      } else {
        // ProseMirror Rich Text Editor
        input.textContent = "";
        const beforeInput = new InputEvent("beforeinput", {
          bubbles: true,
          cancelable: true,
          inputType: "insertText",
          data: text,
        });
        const notCancelled = input.dispatchEvent(beforeInput);
        if (notCancelled) {
          const success = document.execCommand("insertText", false, text);
          if (!success) {
            input.textContent = text;
          }
        }
        input.dispatchEvent(
          new InputEvent("input", {
            bubbles: true,
            cancelable: true,
            inputType: "insertText",
            data: text,
          }),
        );
      }

      await new Promise((r) => setTimeout(r, 100));
      return true;
    }

    findSendButton() {
      return document.querySelector(
        'button[data-testid="send-button"], button[aria-label*="Send prompt"], button[aria-label*="Send"]',
      );
    }

    findResponseContainer() {
      const messages = document.querySelectorAll(
        '[data-message-author-role="assistant"]',
      );
      if (messages.length > 0) {
        const lastMsg = messages[messages.length - 1];
        return lastMsg.querySelector("div.markdown.prose, div.markdown") || lastMsg;
      }
      return document.querySelector("article [data-message-author-role='assistant'] .markdown");
    }

    getJunkSelectors() {
      return [
        ...super.getJunkSelectors(),
        'button[data-testid*="turn-action"]',
        'div[data-testid="fruitjuice-send-button"]',
        '.text-xs.text-token-text-tertiary',
        'div.text-center.text-xs',
      ];
    }

    postProcessResponse(md) {
      let cleaned = super.postProcessResponse(md);
      cleaned = cleaned.replace(/ChatGPT can make mistakes\. Check important info\./gi, "");
      return cleaned.trim();
    }

    isStreaming() {
      return Boolean(
        document.querySelector(
          'button[data-testid="stop-button"], button[aria-label*="Stop streaming"], button[aria-label*="Stop generating"]',
        ),
      );
    }

    isComplete() {
      return !this.isStreaming() && Boolean(this.findResponseContainer());
    }
  }

  /* -------------------------------------------------------------------------- */
  /* 2. Claude Adapter (claude.ai)                                              */
  /* -------------------------------------------------------------------------- */
  class ClaudeAdapter extends BaseProviderAdapter {
    constructor() {
      super("claude", "Claude", /claude\.ai/);
    }

    findInput() {
      return document.querySelector(
        'div[data-testid="chat-input"], div.ProseMirror[contenteditable="true"], fieldset div[contenteditable="true"]',
      );
    }

    async insertPrompt(text) {
      const input = this.findInput();
      if (!input) return false;

      this.focusInput();
      await new Promise((r) => setTimeout(r, 50));

      input.textContent = "";
      const beforeInput = new InputEvent("beforeinput", {
        bubbles: true,
        cancelable: true,
        inputType: "insertText",
        data: text,
      });
      const notCancelled = input.dispatchEvent(beforeInput);
      if (notCancelled) {
        const success = document.execCommand("insertText", false, text);
        if (!success) {
          input.textContent = text;
        }
      }
      input.dispatchEvent(
        new InputEvent("input", {
          bubbles: true,
          cancelable: true,
          inputType: "insertText",
          data: text,
        }),
      );

      await new Promise((r) => setTimeout(r, 100));
      return true;
    }

    findSendButton() {
      return document.querySelector(
        'button[aria-label*="Send Message"], button[aria-label*="Send"]',
      );
    }

    findResponseContainer() {
      const responses = document.querySelectorAll(
        "div.font-claude-response, div.standard-markdown, [role='article'][aria-label*='Claude responded']",
      );
      if (responses.length > 0) {
        const last = responses[responses.length - 1];
        return last.querySelector("div.standard-markdown, p.font-claude-response-body") || last;
      }
      return document.querySelector("div.font-claude-response");
    }

    getJunkSelectors() {
      return [
        ...super.getJunkSelectors(),
        '.font-claude-message-actions',
        'button[data-testid="retry-button"]',
        'button[aria-label="Copy Content"]',
      ];
    }

    postProcessResponse(md) {
      let cleaned = super.postProcessResponse(md);
      return cleaned.trim();
    }

    isStreaming() {
      const streamingEl = document.querySelector('div[data-is-streaming="true"], button[aria-label*="Stop"]');
      return Boolean(streamingEl);
    }

    isComplete() {
      return !this.isStreaming() && Boolean(this.findResponseContainer());
    }
  }

  /* -------------------------------------------------------------------------- */
  /* 3. Google Gemini Adapter (gemini.google.com)                               */
  /* -------------------------------------------------------------------------- */
  class GeminiAdapter extends BaseProviderAdapter {
    constructor() {
      super("gemini", "Gemini", /gemini\.google\.com/);
    }

    findInput() {
      return document.querySelector(
        'div[role="textbox"][aria-label*="Enter a prompt"], div.ql-editor.textarea, rich-textarea > div, div[contenteditable="true"]',
      );
    }

    async insertPrompt(text) {
      const input = this.findInput();
      if (!input) return false;

      this.focusInput();
      await new Promise((r) => setTimeout(r, 50));

      input.textContent = "";
      input.textContent = text;

      input.dispatchEvent(
        new InputEvent("input", {
          bubbles: true,
          cancelable: true,
          inputType: "insertText",
          data: text,
        }),
      );

      await new Promise((r) => setTimeout(r, 100));
      return true;
    }

    findSendButton() {
      return document.querySelector(
        "button.send-button, button[aria-label*='Send'], button[aria-label*='Submit'], .send-button-container button",
      );
    }

    findResponseContainer() {
      const responses = document.querySelectorAll(
        "structured-content-container.model-response-text, .markdown-main-panel, model-response",
      );
      if (responses.length > 0) {
        return responses[responses.length - 1];
      }
      return document.querySelector(".markdown-main-panel");
    }

    getJunkSelectors() {
      return [
        ...super.getJunkSelectors(),
        "mat-icon",
        ".response-container-footer",
        "fact-check-badge",
        "source-links",
        'button[aria-label*="Show drafts"]',
        'button[aria-label*="drafts"]',
      ];
    }

    postProcessResponse(md) {
      let cleaned = super.postProcessResponse(md);
      cleaned = cleaned.replace(/Gemini may display inaccurate info.*responses\./gi, "");
      return cleaned.trim();
    }

    isStreaming() {
      const container = this.findResponseContainer();
      return Boolean(
        container?.classList?.contains("processing-state-visible") ||
        document.querySelector("div.response-container-header-processing-state"),
      );
    }

    isComplete() {
      const hasCompletedFooter = Boolean(document.querySelector("div.response-footer.complete"));
      return (hasCompletedFooter || !this.isStreaming()) && Boolean(this.findResponseContainer());
    }
  }

  /* -------------------------------------------------------------------------- */
  /* 4. Grok Adapter (grok.com)                                                 */
  /* -------------------------------------------------------------------------- */
  class GrokAdapter extends BaseProviderAdapter {
    constructor() {
      super("grok", "Grok", /grok\.com/);
    }

    findInput() {
      return document.querySelector(
        'div[role="textbox"][aria-label*="Ask Grok"], main div.ProseMirror, textarea[placeholder*="Ask Grok"]',
      );
    }

    async insertPrompt(text) {
      const input = this.findInput();
      if (!input) return false;

      this.focusInput();
      await new Promise((r) => setTimeout(r, 50));

      if (input.tagName.toLowerCase() === "textarea") {
        input.value = text;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      } else {
        input.textContent = "";
        const beforeInput = new InputEvent("beforeinput", {
          bubbles: true,
          cancelable: true,
          inputType: "insertText",
          data: text,
        });
        input.dispatchEvent(beforeInput);
        document.execCommand("insertText", false, text);
        input.dispatchEvent(
          new InputEvent("input", {
            bubbles: true,
            cancelable: true,
            inputType: "insertText",
            data: text,
          }),
        );
      }

      await new Promise((r) => setTimeout(r, 100));
      return true;
    }

    findSendButton() {
      return document.querySelector(
        'button[aria-label*="Send"], button[type="submit"], button.bg-highlight',
      );
    }

    findResponseContainer() {
      const messages = document.querySelectorAll(
        '[data-testid="assistant-message"], div.response-content-markdown, main #last-reply-container',
      );
      if (messages.length > 0) {
        return messages[messages.length - 1];
      }
      return document.querySelector("main #last-reply-container > div:nth-child(2) > div > [dir='auto']");
    }

    isStreaming() {
      return Boolean(document.querySelector("main #last-reply-container .thinking-container"));
    }

    isComplete() {
      return !this.isStreaming() && Boolean(this.findResponseContainer());
    }
  }

  /* -------------------------------------------------------------------------- */
  /* 5. Perplexity Adapter (perplexity.ai)                                      */
  /* -------------------------------------------------------------------------- */
  class PerplexityAdapter extends BaseProviderAdapter {
    constructor() {
      super("perplexity", "Perplexity", /perplexity\.ai/);
    }

    findInput() {
      return document.querySelector(
        '#ask-input, div[data-lexical-editor="true"], textarea[placeholder*="Ask"]',
      );
    }

    async insertPrompt(text) {
      const input = this.findInput();
      if (!input) return false;

      this.focusInput();
      await new Promise((r) => setTimeout(r, 50));

      if (input.tagName.toLowerCase() === "textarea") {
        input.value = text;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      } else {
        // Lexical editor
        input.textContent = "";
        const beforeInput = new InputEvent("beforeinput", {
          bubbles: true,
          composed: true,
          cancelable: true,
          inputType: "insertText",
          data: text,
        });
        input.dispatchEvent(beforeInput);
        document.execCommand("insertText", false, text);
        input.dispatchEvent(
          new InputEvent("input", {
            bubbles: true,
            composed: true,
            cancelable: true,
            inputType: "insertText",
            data: text,
          }),
        );
      }

      await new Promise((r) => setTimeout(r, 100));
      return true;
    }

    findSendButton() {
      return document.querySelector(
        'button[aria-label="Submit"], button[aria-label*="Search"], button.reset.interactable',
      );
    }

    findResponseContainer() {
      const proseContainers = document.querySelectorAll(
        "div.prose, #markdown-content-0, div[dir='auto'].prose",
      );
      if (proseContainers.length > 0) {
        return proseContainers[proseContainers.length - 1];
      }
      return document.querySelector("#markdown-content-0");
    }

    getJunkSelectors() {
      return [
        ...super.getJunkSelectors(),
        'div[data-testid="sources-list"]',
        'div.citation',
        '.related-questions',
        'div[class*="Sources"]',
      ];
    }

    postProcessResponse(md) {
      let cleaned = super.postProcessResponse(md);
      // Remove inline standalone citation badges like [1], [2] if needed
      cleaned = cleaned.replace(/\[\d+\]/g, "");
      return cleaned.trim();
    }

    isStreaming() {
      const submitBtn = this.findSendButton();
      return Boolean(submitBtn && (submitBtn.disabled || submitBtn.getAttribute("aria-disabled") === "true"));
    }

    isComplete() {
      return Boolean(this.findResponseContainer());
    }
  }

  /* -------------------------------------------------------------------------- */
  /* 6. Microsoft Bing / Copilot Adapter (bing.com)                             */
  /* -------------------------------------------------------------------------- */
  class BingCopilotAdapter extends BaseProviderAdapter {
    constructor() {
      super("bing", "Bing Copilot", /bing\.com/);
    }

    findInput() {
      return document.querySelector(
        'textarea[role="textbox"][placeholder*="Ask a follow-up"], textarea.b_searchboxForm',
      );
    }

    async insertPrompt(text) {
      const input = this.findInput();
      if (!input) return false;

      this.focusInput();
      input.value = text;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      await new Promise((r) => setTimeout(r, 100));
      return true;
    }

    findSendButton() {
      return document.querySelector('button[aria-label="Submit"], button.b_searchboxSubmit');
    }

    findResponseContainer() {
      return (
        document.querySelector(".frame_cont iframe")?.contentDocument?.querySelector("#ca_main .gs_multianshead_main") ||
        document.querySelector("#ca_main .gs_multianshead_main")
      );
    }

    getJunkSelectors() {
      return [
        ...super.getJunkSelectors(),
        ".cib-action-menu",
        "cib-feedback",
        ".attribution-item",
      ];
    }

    postProcessResponse(md) {
      let cleaned = super.postProcessResponse(md);
      cleaned = cleaned.replace(/Learn more:[\s\S]*$/i, "");
      return cleaned.trim();
    }
  }

  /* -------------------------------------------------------------------------- */
  /* 7. Google Search / AI Overview Adapter (google.com)                        */
  /* -------------------------------------------------------------------------- */
  class GoogleSearchAdapter extends BaseProviderAdapter {
    constructor() {
      super("google", "Google AI Overview", /google\.com/);
    }

    /** Find and click Google's exact "AI Mode" button or tab */
    async ensureAiMode() {
      try {
        // 1. Check for the dedicated "AI Mode" tab at the top of Google Search (e.g. a.XVMlrc)
        const aiModeTab = Array.from(
          document.querySelectorAll('a.XVMlrc, a[role="tab"], button[role="tab"], a, button')
        ).find((el) => {
          const txt = (el.textContent || "").trim();
          return /^AI Mode$/i.test(txt);
        });

        if (aiModeTab && aiModeTab.offsetParent !== null) {
          tabLog("GoogleTab", "✨ Found 'AI Mode' tab (a.XVMlrc). Clicking to enter AI Mode...");
          aiModeTab.click();
          await new Promise((r) => setTimeout(r, 600));
          return true;
        }

        // 2. Check for the homepage AI Mode pill button (button[jsname="B6rgad"])
        const pillSelectors = [
          'button[jsname="B6rgad"].Sw4CSc',
          'button[jsname="B6rgad"]',
          'button.plR5qb.Sw4CSc',
          'button.plR5qb',
          'div.u4Uk3c span.lTxWLe',
        ];

        for (const sel of pillSelectors) {
          const el = document.querySelector(sel);
          if (el) {
            const btn =
              el.tagName?.toLowerCase() === "button"
                ? el
                : el.closest("button") || el;
            if (btn && btn.offsetParent !== null) {
              tabLog("GoogleTab", `✨ Found 'AI Mode' pill button (${sel}). Activating...`);
              btn.click();
              await new Promise((r) => setTimeout(r, 400));
              return true;
            }
          }
        }

        // 3. Search specifically for "Generate AI Overview"
        const allInteractive = Array.from(
          document.querySelectorAll("button, [role='button']")
        );
        const aiBtn = allInteractive.find((el) => {
          const txt = (el.textContent || "").trim();
          const aria = el.getAttribute("aria-label") || "";
          return (
            /^(Generate|Show AI Overview|AI Overview)$/i.test(txt) ||
            /Generate AI Overview/i.test(aria)
          );
        });
        if (aiBtn && aiBtn.offsetParent !== null) {
          tabLog("GoogleTab", "✨ Found AI Overview button. Clicking...");
          aiBtn.click();
          await new Promise((r) => setTimeout(r, 400));
          return true;
        }
      } catch (e) {
        tabLog("GoogleTab", "Error in ensureAiMode:", e?.message);
      }
      return false;
    }

    findInput() {
      return document.querySelector(
        'textarea[name="q"], input[name="q"], textarea[title="Search"], textarea[aria-label="Search"], [role="combobox"]',
      );
    }

    async insertPrompt(text) {
      this._lastPrompt = text;

      // If already on search results page with a query, no need to re-type
      if (window.location.pathname.startsWith("/search")) {
        return true;
      }

      // 1. Activate AI Mode first if available
      await this.ensureAiMode();

      // 2. Find and populate search input
      const input = this.findInput();
      if (!input) return false;
      this.focusInput();

      const nativeSetter =
        Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set ||
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;

      if (nativeSetter) {
        nativeSetter.call(input, text);
      } else {
        input.value = text;
      }

      input.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      tabLog("GoogleTab", `✍️ Prompt inserted into search box: "${text.slice(0, 30)}..."`);
      await new Promise((r) => setTimeout(r, 200));
      return true;
    }

    findSendButton() {
      const selectors = [
        'button[jsname="B6rgad"].Sw4CSc',
        'button[jsname="B6rgad"]',
        'button.plR5qb.Sw4CSc',
        'button.plR5qb',
        'button[aria-label="Google Search"]',
        'input[name="btnK"]',
        'button[type="submit"]',
        'form[role="search"] button',
      ];

      for (const sel of selectors) {
        try {
          const el = document.querySelector(sel);
          if (el && el.offsetParent !== null) return el;
        } catch {}
      }

      return null;
    }

    async submit() {
      // If already on search results page, skip submit
      if (window.location.pathname.startsWith("/search")) {
        return true;
      }

      await new Promise((r) => setTimeout(r, 200));

      const btn = this.findSendButton();
      if (btn) {
        tabLog("GoogleTab", "🔘 Clicking AI Send button (jsname='B6rgad' / plR5qb)...");
        btn.click();
        await new Promise((r) => setTimeout(r, 300));
        return true;
      }

      const input = this.findInput();
      if (input) {
        tabLog("GoogleTab", "↵ Dispatching Enter key to search box...");
        input.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "Enter",
            code: "Enter",
            keyCode: 13,
            which: 13,
            bubbles: true,
            cancelable: true,
          }),
        );
        return true;
      }

      return false;
    }

    findResponseContainer() {
      // ONLY select the pure AI answer column (main-col), never broad parents with rhs-col!
      const selectors = [
        'div[data-container-id="main-col"] .Dn7Fzd',
        'div[data-container-id="main-col"] div[jsname="N760b"]',
        'div[data-container-id="main-col"] div[data-attrid="wa:/description"]',
        'div[data-container-id="main-col"]',
        'div.mZJni.Dn7Fzd',
        'div[data-attrid="wa:/description"]',
        'div.ULSXZd',
        'div.IZ6rdc',
        'div[data-sokoban-container]',
        'div.wDYxhc',
        'div.xpdopen',
        'div.kp-blk',
      ];
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el && el.textContent.trim().length > 25) {
          return el;
        }
      }
      return null;
    }

    getJunkSelectors() {
      return [
        ...super.getJunkSelectors(),
        'div[data-container-id="rhs-col"]',
        'div[data-xid="aim-aside-initial-corroboration-container"]',
        'div[data-xid="Gd7Hsc"]',
        'div[data-xid="YruvMc"]',
        'div.ub891',
        'div.nLDHre',
        'div.ofHStc',
        'div.SK38Xc',
        'div.tbIZh',
        'div.N6Axvb',
        'div.OBWDNe',
        'div.jR6h',
        'ul.aajpme',
        'div.UrecDd',
        'div.YOTKvb',
        'div.HvurC',
        'div.PpHF4',
        'div.DBNuff',
        'span.DHPVt',
        'button.vDOt8c',
        'div.a14YJe',
        'span.NMq1me',
      ];
    }

    postProcessResponse(md) {
      let cleaned = super.postProcessResponse(md);
      // Google-specific rules
      cleaned = cleaned
        .replace(/Quick results from the web[\s\S]*?(?=\n\n|\*\*[A-Z]|Hello|Hi\b|I am|Sure|Here|Please|$)/i, "")
        .replace(/#*\s*Share public link[\s\S]*$/i, "")
        .replace(/This public link shares a thread[\s\S]*$/i, "");
      return cleaned.trim();
    }

    /** Return exact raw HTML and CSS from Google AI with dynamic theme-aware color virtualization */
    async getCurrentResponse() {
      const container = this.findResponseContainer();
      if (!container) return "";
      return this.extractStyledHtml(container);
    }

    observeResponse(timeoutMs = 25000) {
      return new Promise(async (resolve) => {
        const startTime = Date.now();
        let lastTextLength = 0;
        let idleCount = 0;

        // Try clicking AI Mode or Generate button if present
        await this.ensureAiMode();

        const checkInterval = setInterval(async () => {
          const container = this.findResponseContainer();
          if (container) {
            const currentLength = (container.textContent || "").trim().length;
            if (currentLength > 20) {
              if (currentLength === lastTextLength) {
                idleCount++;
                if (idleCount >= 2) {
                  clearInterval(checkInterval);
                  const md = await this.getCurrentResponse();
                  tabLog("GoogleTab", `✅ AI Overview extracted, length: ${md?.length || 0}`);
                  resolve(md);
                  return;
                }
              } else {
                lastTextLength = currentLength;
                idleCount = 0;
              }
            }
          }

          if (Date.now() - startTime > timeoutMs) {
            clearInterval(checkInterval);
            const response = await this.getCurrentResponse();
            if (response && response.length > 20) {
              resolve(response);
            } else {
              resolve(
                typeof formatProviderError === "function"
                  ? formatProviderError(this.id, "No AI response found on page")
                  : "> ⚠️ **Unable to retrieve AI response**",
              );
            }
          }
        }, 350);
      });
    }

    isComplete() {
      return Boolean(this.findResponseContainer());
    }
  }

  /* -------------------------------------------------------------------------- */
  /* Adapter Registry                                                           */
  /* -------------------------------------------------------------------------- */
  const adapters = [
    new ChatGPTAdapter(),
    new ClaudeAdapter(),
    new GeminiAdapter(),
    new GrokAdapter(),
    new PerplexityAdapter(),
    new BingCopilotAdapter(),
    new GoogleSearchAdapter(),
  ];

  const ProviderAdapterRegistry = {
    getAllAdapters() {
      return adapters;
    },

    getAdapter(id) {
      return adapters.find((a) => a.id === id) || null;
    },

    getAdapterForCurrentPage() {
      return adapters.find((a) => a.detect()) || null;
    },
  };

  function formatProviderError(providerId, shortReason) {
    const providerNames = {
      google: "Google AI",
      chatgpt: "ChatGPT",
      claude: "Claude",
      gemini: "Gemini",
      grok: "Grok",
      perplexity: "Perplexity",
      bing: "Bing Copilot",
    };
    const name =
      providerNames[providerId?.toLowerCase()] ||
      (providerId
        ? providerId.charAt(0).toUpperCase() + providerId.slice(1)
        : "AI Provider");

    const cleanShort = shortReason
      ? String(shortReason)
          .replace(/^Error:\s*/i, "")
          .replace(/<[^>]*>/g, "")
          .trim()
          .slice(0, 60)
      : "No response";

    return `> ⚠️ **Please log in to ${name}**\n>\n> Unable to load response. Make sure you are signed in to **${name}** in your browser and have an active session, then ask again.\n\n*Error: ${cleanShort}*`;
  }

  // Export to global scope (works in both window & content script environments)
  global.formatProviderError = formatProviderError;
  global.BaseProviderAdapter = BaseProviderAdapter;
  global.ChatGPTAdapter = ChatGPTAdapter;
  global.ClaudeAdapter = ClaudeAdapter;
  global.GeminiAdapter = GeminiAdapter;
  global.GrokAdapter = GrokAdapter;
  global.PerplexityAdapter = PerplexityAdapter;
  global.BingCopilotAdapter = BingCopilotAdapter;
  global.GoogleSearchAdapter = GoogleSearchAdapter;
  global.ProviderAdapterRegistry = ProviderAdapterRegistry;

})(typeof window !== "undefined" ? window : globalThis);
