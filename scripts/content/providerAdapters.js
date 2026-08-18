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
    const rgbMatch = str.match(
      /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?\s*\)/i,
    );
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
    const srgbMatch = str.match(
      /color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)/i,
    );
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
  function virtualizeComputedStyle(
    prop,
    val,
    tagName = "",
    isTopContainer = false,
  ) {
    if (
      !val ||
      val === "normal" ||
      val === "none" ||
      val === "auto" ||
      val === "0px"
    )
      return "";
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
        if (tag === "PRE" || tag === "CODE")
          return "var(--sl-bg-code, #f1f5f9)";
        if (isBlue && (a < 0.3 || lum > 190))
          return "var(--sl-accent-bg, rgba(59, 130, 246, 0.08))";
        // Near-white / very light surfaces
        if (r >= 235 && g >= 235 && b >= 235) {
          if (
            isTopContainer ||
            tag === "SECTION" ||
            tag === "MAIN" ||
            (tag === "DIV" && !tag.includes("BUTTON"))
          ) {
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
      if (
        tag === "PRE" ||
        tag === "CODE" ||
        tag === "SAMP" ||
        tag === "KBD" ||
        tag === "VAR"
      ) {
        return "var(--sl-font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace)";
      }
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

    /** Attach an image (Base64 dataUrl) to the provider editor or file input */
    async attachImage(imageDataUrl) {
      if (!imageDataUrl) return false;
      tabLog(this.id, "🖼️ Attaching image file to provider input/form...");

      try {
        const res = await fetch(imageDataUrl);
        const blob = await res.blob();
        const file = new File([blob], "screenshot.png", { type: "image/png" });

        // 1. Look for existing file inputs (<input type="file">)
        const fileInputs = Array.from(
          document.querySelectorAll('input[type="file"]'),
        );
        for (const fileInput of fileInputs) {
          try {
            const dt = new DataTransfer();
            dt.items.add(file);
            fileInput.files = dt.files;
            fileInput.dispatchEvent(new Event("change", { bubbles: true }));
            fileInput.dispatchEvent(new Event("input", { bubbles: true }));
            tabLog(
              this.id,
              "📁 Attached image file to input[type='file'] directly!",
            );
            await new Promise((r) => setTimeout(r, 600));
            return true;
          } catch (e) {
            tabLog(this.id, "File input notice:", e?.message);
          }
        }

        // 2. Synthetic ClipboardEvent paste onto input editor
        const input = this.findInput();
        if (input) {
          this.focusInput();
          const dt = new DataTransfer();
          dt.items.add(file);

          const pasteEv = new ClipboardEvent("paste", {
            bubbles: true,
            cancelable: true,
            clipboardData: dt,
          });
          input.dispatchEvent(pasteEv);
          tabLog(
            this.id,
            "📋 Dispatched synthetic ClipboardEvent paste to input element",
          );
          await new Promise((r) => setTimeout(r, 600));
          return true;
        }
      } catch (err) {
        tabLog(this.id, "❌ attachImage error:", err?.message);
      }
      return false;
    }

    /** Trigger submission via button click or Enter keydown */
    async submit() {
      const sendBtn = this.findSendButton();
      if (
        sendBtn &&
        !sendBtn.disabled &&
        sendBtn.getAttribute("aria-disabled") !== "true"
      ) {
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
        "button.copy-btn",
        "button.action-btn",
      ];
      for (const sel of selectors) {
        const btn =
          (container ? container.querySelector(sel) : null) ||
          document.querySelector(sel);
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
        clone
          .querySelectorAll(
            "[data-sae], [data-subtree], [style*='opacity'], [style*='pointer-events']",
          )
          .forEach((el) => {
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
            "div, span, p, section, article, ul, ol, li, h1, h2, h3, h4, h5, h6, b, strong, em, i",
          );
          for (const el of allEls) {
            if (preservedTags.has(el.tagName)) continue;
            // If element contains any preserved elements inside, don't remove
            if (
              el.querySelector(
                "hr, br, img, svg, video, audio, canvas, iframe, input, textarea",
              )
            )
              continue;

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
            "overflow-x",
            "overflow-y",
            "white-space",
            "word-break",
          ];

          const copyStylesRecursive = (live, cloned, isTop = true) => {
            if (
              !live ||
              !cloned ||
              live.nodeType !== 1 ||
              cloned.nodeType !== 1
            )
              return;
            const comp = window.getComputedStyle(live);
            if (comp) {
              let styleStr = cloned.getAttribute("style") || "";
              for (const p of props) {
                const rawVal = comp.getPropertyValue(p);
                const themeVal = virtualizeComputedStyle(
                  p,
                  rawVal,
                  live.tagName,
                  isTop,
                );
                if (themeVal) {
                  styleStr += `;${p}:${themeVal}`;
                }
              }
              if (styleStr) {
                cloned.setAttribute("style", styleStr);
              }
            }

            // Ensure proper code block scrolling and formatting
            if (cloned.tagName === "PRE") {
              cloned.style.overflowX = "auto";
              cloned.style.maxWidth = "100%";
              cloned.style.whiteSpace = "pre";
              cloned.style.display = "block";
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

        // Safety check: Ensure cleaning did not wipe out real response text
        const cloneText = (clone.textContent || "").trim();
        const liveText = (container.textContent || "").trim();
        if (liveText.length > 20 && cloneText.length < 10) {
          tabLog(
            this.id || "ProviderAdapter",
            `⚠️ Cloned tree lost content during pruning (${liveText.length} → ${cloneText.length}). Preserving source container structure.`,
          );
          const safeClone = container.cloneNode(true);
          safeClone
            .querySelectorAll(
              'button, form, dialog, [role="toolbar"], .copy-button, .action-button, svg[aria-hidden="true"]',
            )
            .forEach((el) => el.remove());
          targetNode = safeClone;
        } else {
          targetNode = clone;
        }
      }

      // Return exact theme-aware HTML wrapped in isolated container with text-selection enabled
      let innerContent = (
        targetNode.innerHTML ||
        targetNode.textContent ||
        ""
      ).trim();

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
        innerContent = innerContent.replace(
          /<(div|span|p|section|article|b|strong|em|i|li|ul|ol)\b[^>]*>\s*<\/\1>/gi,
          "",
        );
      }

      return `<div class="spectralens-isolated-response select-text" style="font-family: var(--sl-font-family, 'Google Sans', Roboto, -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif); font-size: 13px; line-height: 1.55; max-width: 100%; box-sizing: border-box; overflow-wrap: break-word; color: var(--sl-text-primary, #0f172a); user-select: text !important;">${innerContent.trim()}</div>`;
    }

    /** Extract theme-aware styled HTML directly from the response container */
    async getCurrentResponse() {
      const container = this.findResponseContainer();
      if (!container) return "";
      return this.extractStyledHtml(container);
    }

    /** Observe response streaming until completion */
    observeResponse(timeoutMs = 25000, previousContent = "") {
      return new Promise(async (resolve) => {
        const startTime = Date.now();
        let lastTextLength = 0;
        let idleCount = 0;
        let hasSeenChange = !previousContent;

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
              const currentContent = (container.textContent || "").trim();
              const currentLength = currentContent.length;

              if (previousContent && !hasSeenChange) {
                if (currentContent !== previousContent && currentLength > 10) {
                  hasSeenChange = true;
                  lastTextLength = currentLength;
                  idleCount = 0;
                }
                return;
              }

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
        'div[role="textbox"][aria-label="Chat with ChatGPT"], #prompt-textarea, textarea[data-id="root"], div.ProseMirror[contenteditable="true"], div[contenteditable="true"]',
      );
    }

    async attachImage(imageDataUrl) {
      if (!imageDataUrl) return false;
      tabLog("ChatGPTTab", "🖼️ Attaching image file to ChatGPT...");
      try {
        const arr = imageDataUrl.split(",");
        const mime = arr[0].match(/:(.*?);/)?.[1] || "image/png";
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const file = new File([u8arr], "screenshot.png", {
          type: mime,
          lastModified: Date.now(),
        });

        // 1. Check file input
        const fileInput = document.querySelector(
          'input[type="file"], input[accept*="image"]',
        );
        if (fileInput) {
          const dt = new DataTransfer();
          dt.items.add(file);
          fileInput.files = dt.files;
          fileInput.dispatchEvent(new Event("change", { bubbles: true }));
          fileInput.dispatchEvent(new Event("input", { bubbles: true }));
          tabLog("ChatGPTTab", "📁 Dispatched image to ChatGPT file input!");
          await new Promise((r) => setTimeout(r, 600));
          return true;
        }

        // 2. Synthetic ClipboardEvent paste onto input editor
        const input = this.findInput();
        if (input) {
          this.focusInput();
          const dt = new DataTransfer();
          dt.items.add(file);
          const pasteEv = new ClipboardEvent("paste", {
            bubbles: true,
            cancelable: true,
            clipboardData: dt,
          });
          input.dispatchEvent(pasteEv);
          tabLog(
            "ChatGPTTab",
            "📋 Dispatched synthetic paste event to ChatGPT input!",
          );
          await new Promise((r) => setTimeout(r, 600));
          return true;
        }
      } catch (err) {
        tabLog("ChatGPTTab", "❌ attachImage error:", err?.message);
      }
      return false;
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
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }

      await new Promise((r) => setTimeout(r, 100));
      return true;
    }

    findSendButton() {
      return document.querySelector(
        'button[data-testid="send-button"], button[aria-label*="Send prompt" i], button[aria-label*="Send" i], button[data-testid="fruitjuice-send-button"]',
      );
    }

    async submit() {
      await new Promise((r) => setTimeout(r, 150));
      const btn = this.findSendButton();
      if (btn && !btn.disabled) {
        tabLog("ChatGPTTab", "🔘 Clicking ChatGPT Send button...");
        try {
          btn.click();
          btn.dispatchEvent(
            new MouseEvent("click", {
              bubbles: true,
              cancelable: true,
              view: window,
            }),
          );
          return true;
        } catch {}
      }

      // Fallback: Dispatch Enter key
      const input = this.findInput();
      if (input) {
        tabLog("ChatGPTTab", "↵ Dispatching Enter key to ChatGPT input...");
        input.focus();
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
        input.dispatchEvent(
          new KeyboardEvent("keyup", {
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
      const messages = document.querySelectorAll(
        '[data-message-author-role="assistant"], article div.markdown',
      );
      if (messages.length > 0) {
        for (let i = messages.length - 1; i >= 0; i--) {
          const msg = messages[i];
          const innerMarkdown =
            msg.querySelector("div.markdown.prose, div.markdown") || msg;
          const text = (innerMarkdown.textContent || "").trim();
          if (text.length > 10) {
            return innerMarkdown;
          }
        }
        return messages[messages.length - 1];
      }
      return document.querySelector(
        "article [data-message-author-role='assistant'] .markdown",
      );
    }

    getJunkSelectors() {
      return [
        ...super.getJunkSelectors(),
        'button[data-testid*="turn-action"]',
        'div[data-testid="fruitjuice-send-button"]',
        ".text-xs.text-token-text-tertiary",
        "div.text-center.text-xs",
        'button[aria-label*="Copy" i]',
        'button[aria-label*="Read aloud" i]',
        'button[aria-label*="Good response" i]',
        'button[aria-label*="Bad response" i]',
      ];
    }

    observeResponse(timeoutMs = 25000, previousContent = "") {
      return new Promise(async (resolve) => {
        const startTime = Date.now();
        let lastTextLength = 0;
        let idleCount = 0;
        let hasSeenStreaming = false;

        const initialTurnCount = document.querySelectorAll(
          '[data-message-author-role="assistant"]',
        ).length;

        const checkInterval = setInterval(async () => {
          const isStreamingNow = this.isStreaming();
          if (isStreamingNow) {
            hasSeenStreaming = true;
          }

          const currentTurnCount = document.querySelectorAll(
            '[data-message-author-role="assistant"]',
          ).length;

          const container = this.findResponseContainer();
          if (container) {
            const currentContent = (container.textContent || "").trim();
            const currentLength = currentContent.length;

            if (previousContent) {
              const isNewTurn =
                currentTurnCount > initialTurnCount ||
                (hasSeenStreaming && !isStreamingNow);
              if (!isNewTurn || currentContent === previousContent) {
                return;
              }
            }

            if (currentLength > 20) {
              const isFinished = hasSeenStreaming
                ? !isStreamingNow
                : idleCount >= 3;

              if (currentLength === lastTextLength) {
                idleCount++;
                if (isFinished || idleCount >= 4) {
                  clearInterval(checkInterval);
                  const md = await this.getCurrentResponse();
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
            resolve(
              response ||
                formatProviderError(
                  this.id,
                  "No response generated or login required",
                ),
            );
          }
        }, 350);
      });
    }

    isStreaming() {
      return Boolean(
        document.querySelector(
          'button[data-testid="stop-button"], button[aria-label*="Stop streaming" i], button[aria-label*="Stop generating" i]',
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
        'div[data-testid="chat-input"], div.ProseMirror[contenteditable="true"], fieldset div[contenteditable="true"], div[contenteditable="true"]',
      );
    }

    async attachImage(imageDataUrl) {
      if (!imageDataUrl) return false;
      tabLog("ClaudeTab", "🖼️ Attaching image file to Claude...");
      try {
        const arr = imageDataUrl.split(",");
        const mime = arr[0].match(/:(.*?);/)?.[1] || "image/png";
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const file = new File([u8arr], "screenshot.png", {
          type: mime,
          lastModified: Date.now(),
        });

        // 1. Check file input
        const fileInput = document.querySelector(
          'input[type="file"], input[accept*="image"]',
        );
        if (fileInput) {
          const dt = new DataTransfer();
          dt.items.add(file);
          fileInput.files = dt.files;
          fileInput.dispatchEvent(new Event("change", { bubbles: true }));
          fileInput.dispatchEvent(new Event("input", { bubbles: true }));
          tabLog("ClaudeTab", "📁 Dispatched image to Claude file input!");
          await new Promise((r) => setTimeout(r, 600));
          return true;
        }

        // 2. Synthetic ClipboardEvent paste onto input editor
        const input = this.findInput();
        if (input) {
          this.focusInput();
          const dt = new DataTransfer();
          dt.items.add(file);
          const pasteEv = new ClipboardEvent("paste", {
            bubbles: true,
            cancelable: true,
            clipboardData: dt,
          });
          input.dispatchEvent(pasteEv);
          tabLog(
            "ClaudeTab",
            "📋 Dispatched synthetic paste event to Claude input!",
          );
          await new Promise((r) => setTimeout(r, 600));
          return true;
        }
      } catch (err) {
        tabLog("ClaudeTab", "❌ attachImage error:", err?.message);
      }
      return false;
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
      input.dispatchEvent(new Event("input", { bubbles: true }));

      await new Promise((r) => setTimeout(r, 100));
      return true;
    }

    findSendButton() {
      return document.querySelector(
        'button[aria-label*="Send Message" i], button[aria-label*="Send" i], button.cursor-pointer:has(svg)',
      );
    }

    async submit() {
      await new Promise((r) => setTimeout(r, 150));
      const btn = this.findSendButton();
      if (btn && !btn.disabled) {
        tabLog("ClaudeTab", "🔘 Clicking Claude Send button...");
        try {
          btn.click();
          btn.dispatchEvent(
            new MouseEvent("click", {
              bubbles: true,
              cancelable: true,
              view: window,
            }),
          );
          return true;
        } catch {}
      }

      // Fallback: Dispatch Enter key
      const input = this.findInput();
      if (input) {
        tabLog("ClaudeTab", "↵ Dispatching Enter key to Claude input...");
        input.focus();
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
        input.dispatchEvent(
          new KeyboardEvent("keyup", {
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
      const responses = document.querySelectorAll(
        "div.font-claude-response, div.standard-markdown, [role='article'][aria-label*='Claude responded' i], div.font-claude-message",
      );
      if (responses.length > 0) {
        for (let i = responses.length - 1; i >= 0; i--) {
          const resp = responses[i];
          const innerMarkdown =
            resp.querySelector(
              "div.standard-markdown, p.font-claude-response-body, div.font-claude-message",
            ) || resp;
          const text = (innerMarkdown.textContent || "").trim();
          if (text.length > 10) {
            return innerMarkdown;
          }
        }
        return responses[responses.length - 1];
      }
      return document.querySelector("div.font-claude-response");
    }

    getJunkSelectors() {
      return [
        ...super.getJunkSelectors(),
        ".font-claude-message-actions",
        'button[data-testid="retry-button"]',
        'button[aria-label="Copy Content"]',
        'button[aria-label*="Copy" i]',
      ];
    }

    observeResponse(timeoutMs = 25000, previousContent = "") {
      return new Promise(async (resolve) => {
        const startTime = Date.now();
        let lastTextLength = 0;
        let idleCount = 0;
        let hasSeenStreaming = false;

        const initialTurnCount = document.querySelectorAll(
          "div.font-claude-response, [role='article'][aria-label*='Claude responded' i]",
        ).length;

        const checkInterval = setInterval(async () => {
          const isStreamingNow = this.isStreaming();
          if (isStreamingNow) {
            hasSeenStreaming = true;
          }

          const currentTurnCount = document.querySelectorAll(
            "div.font-claude-response, [role='article'][aria-label*='Claude responded' i]",
          ).length;

          const container = this.findResponseContainer();
          if (container) {
            const currentContent = (container.textContent || "").trim();
            const currentLength = currentContent.length;

            if (previousContent) {
              const isNewTurn =
                currentTurnCount > initialTurnCount ||
                (hasSeenStreaming && !isStreamingNow);
              if (!isNewTurn || currentContent === previousContent) {
                return;
              }
            }

            if (currentLength > 20) {
              const isFinished = hasSeenStreaming
                ? !isStreamingNow
                : idleCount >= 3;

              if (currentLength === lastTextLength) {
                idleCount++;
                if (isFinished || idleCount >= 4) {
                  clearInterval(checkInterval);
                  const md = await this.getCurrentResponse();
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
            resolve(
              response ||
                formatProviderError(
                  this.id,
                  "No response generated or login required",
                ),
            );
          }
        }, 350);
      });
    }

    isStreaming() {
      const streamingEl = document.querySelector(
        'div[data-is-streaming="true"], button[aria-label*="Stop" i]',
      );
      return Boolean(streamingEl);
    }

    isComplete() {
      return !this.isStreaming() && Boolean(this.findResponseContainer());
    }
  }

  /* -------------------------------------------------------------------------- */
  /* 3. Google Gemini Adapter (gemini.google.com)                               */
  /* -------------------------------------------------------------------------- */
  /* 3. Gemini Adapter (gemini.google.com)                                      */
  /* -------------------------------------------------------------------------- */
  class GeminiAdapter extends BaseProviderAdapter {
    constructor() {
      super("gemini", "Gemini", /gemini\.google\.com/);
    }

    findInput() {
      return document.querySelector(
        'div.ql-editor[contenteditable="true"], div[contenteditable="true"][role="textbox"], rich-textarea div[contenteditable="true"], rich-textarea > div, div.ql-editor.textarea, textarea[aria-label*="prompt" i], div[role="textbox"]',
      );
    }

    async attachImage(imageDataUrl) {
      if (!imageDataUrl) return false;
      tabLog("GeminiTab", "🖼️ Attaching image file to Gemini...");
      try {
        const arr = imageDataUrl.split(",");
        const mime = arr[0].match(/:(.*?);/)?.[1] || "image/png";
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const file = new File([u8arr], "screenshot.png", {
          type: mime,
          lastModified: Date.now(),
        });

        // Snapshot DOM state BEFORE dispatching the paste
        const beforeUploadCardCount = document.querySelectorAll(
          "uploader-file-card, .file-chip, .attachment-chip, .uploaded-file-chip",
        ).length;
        const beforeImgCount = document.querySelectorAll(
          'img[src*="blob:"], img.uploaded-image',
        ).length;

        // 1. Try file input first
        const fileInput = document.querySelector(
          'input[type="file"], input[accept*="image"]',
        );
        let dispatched = false;
        if (fileInput) {
          try {
            const dt = new DataTransfer();
            dt.items.add(file);
            fileInput.files = dt.files;
            fileInput.dispatchEvent(
              new Event("change", { bubbles: true, composed: true }),
            );
            fileInput.dispatchEvent(
              new Event("input", { bubbles: true, composed: true }),
            );
            tabLog("GeminiTab", "📁 Dispatched image to file input!");
            dispatched = true;
          } catch {}
        }

        // 2. Synthetic ClipboardEvent paste onto input editor
        if (!dispatched) {
          const input = this.findInput();
          if (input) {
            this.focusInput();
            const dt = new DataTransfer();
            dt.items.add(file);
            const pasteEv = new ClipboardEvent("paste", {
              bubbles: true,
              cancelable: true,
              clipboardData: dt,
            });
            input.dispatchEvent(pasteEv);
            tabLog(
              "GeminiTab",
              "📋 Dispatched synthetic paste event to Gemini input!",
            );
            dispatched = true;
          }
        }

        if (!dispatched) return false;

        // 3. Wait for Gemini to actually process and upload the image
        tabLog(
          "GeminiTab",
          "⏳ Waiting for Gemini to process & upload image...",
        );
        const uploadStart = Date.now();
        const maxWaitMs = 15000;
        let uploadConfirmed = false;

        while (Date.now() - uploadStart < maxWaitMs) {
          await new Promise((r) => setTimeout(r, 500));

          // Count NEW upload cards / chips that appeared AFTER our paste
          const currentUploadCardCount = document.querySelectorAll(
            "uploader-file-card, .file-chip, .attachment-chip, .uploaded-file-chip",
          ).length;
          const currentImgCount = document.querySelectorAll(
            'img[src*="blob:"], img.uploaded-image',
          ).length;

          const newCardsAppeared =
            currentUploadCardCount > beforeUploadCardCount;
          const newImagesAppeared = currentImgCount > beforeImgCount;

          // Check if uploading progress indicators are still active
          const isStillUploading = Boolean(
            document.querySelector(
              'mat-progress-bar, mat-spinner, .upload-progress, div[role="progressbar"], .loading-spinner, .mat-mdc-progress-bar',
            ),
          );

          if ((newCardsAppeared || newImagesAppeared) && !isStillUploading) {
            // Wait a bit more to let Gemini finalize the upload
            await new Promise((r) => setTimeout(r, 800));

            // Double-check it's still stable (no progress bar reappeared)
            const stillUploading = Boolean(
              document.querySelector(
                'mat-progress-bar, mat-spinner, .upload-progress, div[role="progressbar"], .mat-mdc-progress-bar',
              ),
            );
            if (!stillUploading) {
              tabLog(
                "GeminiTab",
                `✨ Image uploaded & confirmed in ${Date.now() - uploadStart}ms! (cards: ${beforeUploadCardCount}→${currentUploadCardCount}, imgs: ${beforeImgCount}→${currentImgCount})`,
              );
              uploadConfirmed = true;
              break;
            }
          }

          // Log progress every 2 seconds
          const elapsed = Date.now() - uploadStart;
          if (elapsed % 2000 < 500) {
            tabLog(
              "GeminiTab",
              `⏳ Still waiting for upload... (${Math.round(elapsed / 1000)}s, uploading: ${isStillUploading}, newCards: ${newCardsAppeared}, newImgs: ${newImagesAppeared})`,
            );
          }
        }

        if (!uploadConfirmed) {
          // Fallback: wait a generous fixed delay if detection couldn't confirm
          tabLog(
            "GeminiTab",
            "⏱️ Upload detection timed out. Waiting 3s fallback before proceeding...",
          );
          await new Promise((r) => setTimeout(r, 3000));
        }

        return true;
      } catch (err) {
        tabLog("GeminiTab", "❌ attachImage error:", err?.message);
      }
      return false;
    }

    async insertPrompt(text) {
      const input = this.findInput();
      if (!input) return false;

      this.focusInput();
      await new Promise((r) => setTimeout(r, 100));

      try {
        document.execCommand("selectAll", false, null);
        document.execCommand("delete", false, null);
      } catch {}

      let inserted = false;
      try {
        inserted = document.execCommand("insertText", false, text);
      } catch {}

      if (!inserted || (input.textContent || "").trim() !== text.trim()) {
        input.textContent = text;
      }

      input.dispatchEvent(
        new InputEvent("input", {
          bubbles: true,
          cancelable: true,
          inputType: "insertText",
          data: text,
        }),
      );
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));

      tabLog(
        "GeminiTab",
        `✍️ Prompt inserted into Gemini: "${text.slice(0, 30)}..."`,
      );
      await new Promise((r) => setTimeout(r, 150));
      return true;
    }

    findSendButton() {
      const selectors = [
        "button.send-button",
        'button[aria-label*="Send message" i]',
        'button[aria-label*="Submit" i]',
        'button[aria-label*="Send" i]',
        'button[mattooltip*="Send" i]',
        ".send-button-container button",
        'button[data-test-id="send-button"]',
        "div.send-button-container button",
        "button.send-button-wrapper",
      ];
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el && el.offsetParent !== null && !el.disabled) {
          return el;
        }
      }
      return null;
    }

    async submit() {
      await new Promise((r) => setTimeout(r, 150));
      const btn = this.findSendButton();
      if (btn) {
        tabLog("GeminiTab", "🔘 Clicking Gemini Send button...");
        try {
          btn.click();
          btn.dispatchEvent(
            new MouseEvent("click", {
              bubbles: true,
              cancelable: true,
              view: window,
            }),
          );
          return true;
        } catch {}
      }

      // Fallback: Dispatch Enter key
      const input = this.findInput();
      if (input) {
        tabLog("GeminiTab", "↵ Dispatching Enter key to Gemini input...");
        input.focus();
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
        input.dispatchEvent(
          new KeyboardEvent("keyup", {
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
      // Strictly target the latest model response turn
      const modelResponses = document.querySelectorAll(
        'model-response, message-content, div[data-test-id="model-response"]',
      );
      if (modelResponses.length > 0) {
        const latestResp = modelResponses[modelResponses.length - 1];
        const innerContent = latestResp.querySelector(
          ".model-response-text, .markdown, .response-content, .sparkle-text-output, structured-content-container, .markdown-main-panel",
        );
        return innerContent || latestResp;
      }

      return document.querySelector(
        ".markdown-main-panel, .model-response-text, message-content",
      );
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
        ".model-response-footer",
        "div.response-footer",
        'button[aria-label*="Copy" i]',
        'button[aria-label*="Like" i]',
        'button[aria-label*="Dislike" i]',
        'button[aria-label*="Share" i]',
        'button[aria-label*="Modify response" i]',
      ];
    }

    observeResponse(timeoutMs = 40000, previousContent = "") {
      return new Promise(async (resolve) => {
        const startTime = Date.now();
        let lastTextLength = 0;
        let idleCount = 0;
        let isDone = false;
        let hasSeenStreaming = false;

        const initialTurnCount = document.querySelectorAll(
          'model-response, message-content, div[data-test-id="model-response"]',
        ).length;

        // Listen for live network stream chunks from StreamGenerate / BardFrontendService
        let hasReceivedNetChunk = false;
        const netChunkListener = (e) => {
          if (e.detail?.raw) {
            hasReceivedNetChunk = true;
            tabLog(
              "GeminiTab",
              `📡 Network stream chunk captured from Gemini StreamGenerate (${e.detail.raw.length} bytes)`,
            );
          }
        };
        window.addEventListener("spectralens:network_chunk", netChunkListener);

        const cleanUp = () => {
          isDone = true;
          clearInterval(checkInterval);
          window.removeEventListener(
            "spectralens:network_chunk",
            netChunkListener,
          );
        };

        const checkInterval = setInterval(async () => {
          if (isDone) return;

          const isStreamingNow = this.isStreaming();
          if (isStreamingNow) {
            hasSeenStreaming = true;
          }

          const currentTurnCount = document.querySelectorAll(
            'model-response, message-content, div[data-test-id="model-response"]',
          ).length;

          // For multi-turn follow-up queries, wait until new turn starts
          if (previousContent) {
            const isNewTurnActive =
              currentTurnCount > initialTurnCount ||
              hasSeenStreaming ||
              hasReceivedNetChunk;

            if (!isNewTurnActive) {
              return;
            }
          }

          const container = this.findResponseContainer();

          if (container) {
            const currentContent = (container.textContent || "").trim();
            const currentLength = currentContent.length;

            if (previousContent && currentContent === previousContent) {
              return;
            }

            if (currentLength > 20) {
              if (currentLength === lastTextLength) {
                idleCount++;
                // Once text has stabilized for 5 consecutive checks (1.75s), extraction is complete!
                if (idleCount >= 5) {
                  cleanUp();
                  const md = await this.getCurrentResponse();
                  tabLog(
                    "GeminiTab",
                    `✅ Gemini response extracted, length: ${md?.length || 0}`,
                  );
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
            cleanUp();
            const response = await this.getCurrentResponse();
            if (response && response.length > 20) {
              resolve(response);
            } else {
              resolve(
                typeof formatProviderError === "function"
                  ? formatProviderError(
                      this.id,
                      "No response generated or login required",
                    )
                  : "> ⚠️ **Unable to retrieve Gemini response**",
              );
            }
          }
        }, 350);
      });
    }

    isStreaming() {
      const container = this.findResponseContainer();
      return Boolean(
        container?.classList?.contains("processing-state-visible") ||
        document.querySelector("div.response-container-header-processing-state") ||
        document.querySelector("mat-progress-bar") ||
        document.querySelector("mat-progress-spinner") ||
        document.querySelector("button.stop-button") ||
        document.querySelector('button[aria-label*="Stop response" i]') ||
        document.querySelector('button[aria-label*="Stop generating" i]') ||
        document.querySelector('button[aria-label*="Stop" i]') ||
        document.querySelector('button[data-test-id="stop-button"]') ||
        document.querySelector(".sparkle-icon-spinning") ||
        document.querySelector(".loading-indicator") ||
        document.querySelector(".loading-spinner"),
      );
    }

    isComplete() {
      const hasCompletedFooter = Boolean(
        document.querySelector(
          "div.response-footer.complete, button[aria-label*='Copy' i]",
        ),
      );
      return (
        (hasCompletedFooter || !this.isStreaming()) &&
        Boolean(this.findResponseContainer())
      );
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
        'div[role="textbox"][aria-label*="Ask Grok"], main div.ProseMirror, textarea[placeholder*="Ask Grok"], div[contenteditable="true"]',
      );
    }

    async attachImage(imageDataUrl) {
      if (!imageDataUrl) return false;
      tabLog("GrokTab", "🖼️ Attaching image file to Grok...");
      try {
        const arr = imageDataUrl.split(",");
        const mime = arr[0].match(/:(.*?);/)?.[1] || "image/png";
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const file = new File([u8arr], "screenshot.png", {
          type: mime,
          lastModified: Date.now(),
        });

        const fileInput = document.querySelector(
          'input[type="file"], input[accept*="image"]',
        );
        if (fileInput) {
          const dt = new DataTransfer();
          dt.items.add(file);
          fileInput.files = dt.files;
          fileInput.dispatchEvent(new Event("change", { bubbles: true }));
          fileInput.dispatchEvent(new Event("input", { bubbles: true }));
          tabLog("GrokTab", "📁 Dispatched image to Grok file input!");
          await new Promise((r) => setTimeout(r, 600));
          return true;
        }

        const input = this.findInput();
        if (input) {
          this.focusInput();
          const dt = new DataTransfer();
          dt.items.add(file);
          const pasteEv = new ClipboardEvent("paste", {
            bubbles: true,
            cancelable: true,
            clipboardData: dt,
          });
          input.dispatchEvent(pasteEv);
          tabLog(
            "GrokTab",
            "📋 Dispatched synthetic paste event to Grok input!",
          );
          await new Promise((r) => setTimeout(r, 600));
          return true;
        }
      } catch (err) {
        tabLog("GrokTab", "❌ attachImage error:", err?.message);
      }
      return false;
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
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }

      await new Promise((r) => setTimeout(r, 100));
      return true;
    }

    findSendButton() {
      return document.querySelector(
        'button[aria-label*="Send" i], button[type="submit"], button.bg-highlight',
      );
    }

    async submit() {
      await new Promise((r) => setTimeout(r, 150));
      const btn = this.findSendButton();
      if (btn && !btn.disabled) {
        tabLog("GrokTab", "🔘 Clicking Grok Send button...");
        try {
          btn.click();
          btn.dispatchEvent(
            new MouseEvent("click", {
              bubbles: true,
              cancelable: true,
              view: window,
            }),
          );
          return true;
        } catch {}
      }

      const input = this.findInput();
      if (input) {
        tabLog("GrokTab", "↵ Dispatching Enter key to Grok input...");
        input.focus();
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
        input.dispatchEvent(
          new KeyboardEvent("keyup", {
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
      const messages = document.querySelectorAll(
        '[data-testid="assistant-message"], div.response-content-markdown, main #last-reply-container, div.message-bubble',
      );
      if (messages.length > 0) {
        for (let i = messages.length - 1; i >= 0; i--) {
          const msg = messages[i];
          const innerMarkdown =
            msg.querySelector(
              "div.response-content-markdown, div.markdown, [dir='auto']",
            ) || msg;
          const text = (innerMarkdown.textContent || "").trim();
          if (text.length > 10) {
            return innerMarkdown;
          }
        }
        return messages[messages.length - 1];
      }
      return document.querySelector(
        "main #last-reply-container > div:nth-child(2) > div > [dir='auto']",
      );
    }

    getJunkSelectors() {
      return [
        ...super.getJunkSelectors(),
        'button[aria-label*="Copy" i]',
        'button[aria-label*="Share" i]',
        'button[aria-label*="Like" i]',
        'button[aria-label*="Dislike" i]',
      ];
    }

    observeResponse(timeoutMs = 25000, previousContent = "") {
      return new Promise(async (resolve) => {
        const startTime = Date.now();
        let lastTextLength = 0;
        let idleCount = 0;
        let hasSeenStreaming = false;

        const initialTurnCount = document.querySelectorAll(
          '[data-testid="assistant-message"], div.response-content-markdown, main #last-reply-container',
        ).length;

        const checkInterval = setInterval(async () => {
          const isStreamingNow = this.isStreaming();
          if (isStreamingNow) {
            hasSeenStreaming = true;
          }

          const currentTurnCount = document.querySelectorAll(
            '[data-testid="assistant-message"], div.response-content-markdown, main #last-reply-container',
          ).length;

          const container = this.findResponseContainer();
          if (container) {
            const currentContent = (container.textContent || "").trim();
            const currentLength = currentContent.length;

            if (previousContent) {
              const isNewTurn =
                currentTurnCount > initialTurnCount ||
                (hasSeenStreaming && !isStreamingNow);
              if (!isNewTurn || currentContent === previousContent) {
                return;
              }
            }

            if (currentLength > 20) {
              const isFinished = hasSeenStreaming
                ? !isStreamingNow
                : idleCount >= 3;

              if (currentLength === lastTextLength) {
                idleCount++;
                if (isFinished || idleCount >= 4) {
                  clearInterval(checkInterval);
                  const md = await this.getCurrentResponse();
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
            resolve(
              response ||
                formatProviderError(
                  this.id,
                  "No response generated or login required",
                ),
            );
          }
        }, 350);
      });
    }

    isStreaming() {
      return Boolean(
        document.querySelector(
          "main #last-reply-container .thinking-container, div.thinking-indicator",
        ),
      );
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
        '#ask-input, div[data-lexical-editor="true"], textarea[placeholder*="Ask" i], textarea[placeholder*="follow-up" i]',
      );
    }

    async attachImage(imageDataUrl) {
      if (!imageDataUrl) return false;
      tabLog("PerplexityTab", "🖼️ Attaching image file to Perplexity...");
      try {
        const arr = imageDataUrl.split(",");
        const mime = arr[0].match(/:(.*?);/)?.[1] || "image/png";
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const file = new File([u8arr], "screenshot.png", {
          type: mime,
          lastModified: Date.now(),
        });

        const fileInput = document.querySelector(
          'input[type="file"], input[accept*="image"]',
        );
        if (fileInput) {
          const dt = new DataTransfer();
          dt.items.add(file);
          fileInput.files = dt.files;
          fileInput.dispatchEvent(new Event("change", { bubbles: true }));
          fileInput.dispatchEvent(new Event("input", { bubbles: true }));
          tabLog(
            "PerplexityTab",
            "📁 Dispatched image to Perplexity file input!",
          );
          await new Promise((r) => setTimeout(r, 600));
          return true;
        }

        const input = this.findInput();
        if (input) {
          this.focusInput();
          const dt = new DataTransfer();
          dt.items.add(file);
          const pasteEv = new ClipboardEvent("paste", {
            bubbles: true,
            cancelable: true,
            clipboardData: dt,
          });
          input.dispatchEvent(pasteEv);
          tabLog(
            "PerplexityTab",
            "📋 Dispatched synthetic paste event to Perplexity input!",
          );
          await new Promise((r) => setTimeout(r, 600));
          return true;
        }
      } catch (err) {
        tabLog("PerplexityTab", "❌ attachImage error:", err?.message);
      }
      return false;
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
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }

      await new Promise((r) => setTimeout(r, 100));
      return true;
    }

    findSendButton() {
      return document.querySelector(
        'button[aria-label="Submit" i], button[aria-label*="Search" i], button.reset.interactable',
      );
    }

    async submit() {
      await new Promise((r) => setTimeout(r, 150));
      const btn = this.findSendButton();
      if (btn && !btn.disabled) {
        tabLog("PerplexityTab", "🔘 Clicking Perplexity Send button...");
        try {
          btn.click();
          btn.dispatchEvent(
            new MouseEvent("click", {
              bubbles: true,
              cancelable: true,
              view: window,
            }),
          );
          return true;
        } catch {}
      }

      const input = this.findInput();
      if (input) {
        tabLog(
          "PerplexityTab",
          "↵ Dispatching Enter key to Perplexity input...",
        );
        input.focus();
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
        input.dispatchEvent(
          new KeyboardEvent("keyup", {
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
      const proseContainers = document.querySelectorAll(
        "div.prose, #markdown-content-0, div[dir='auto'].prose, div[data-testid='answer-content']",
      );
      if (proseContainers.length > 0) {
        for (let i = proseContainers.length - 1; i >= 0; i--) {
          const container = proseContainers[i];
          const text = (container.textContent || "").trim();
          if (text.length > 15) {
            return container;
          }
        }
        return proseContainers[proseContainers.length - 1];
      }
      return document.querySelector("#markdown-content-0, div.prose");
    }

    getJunkSelectors() {
      return [
        ...super.getJunkSelectors(),
        'div[data-testid="sources-list"]',
        "div.citation",
        ".related-questions",
        'div[class*="Sources"]',
        'button[aria-label*="Copy" i]',
        'button[aria-label*="Share" i]',
      ];
    }

    observeResponse(timeoutMs = 25000, previousContent = "") {
      return new Promise(async (resolve) => {
        const startTime = Date.now();
        let lastTextLength = 0;
        let idleCount = 0;

        const checkInterval = setInterval(async () => {
          const isStreamingNow = this.isStreaming();
          const container = this.findResponseContainer();
          if (container) {
            const currentContent = (container.textContent || "").trim();
            const currentLength = currentContent.length;

            if (previousContent && currentContent === previousContent) {
              return;
            }

            if (currentLength > 20) {
              const isFinished = !isStreamingNow || idleCount >= 3;

              if (currentLength === lastTextLength) {
                idleCount++;
                if (isFinished || idleCount >= 4) {
                  clearInterval(checkInterval);
                  const md = await this.getCurrentResponse();
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
            resolve(
              response ||
                formatProviderError(
                  this.id,
                  "No response generated or login required",
                ),
            );
          }
        }, 350);
      });
    }

    isStreaming() {
      const submitBtn = this.findSendButton();
      const hasSpinner = Boolean(document.querySelector("svg.animate-spin"));
      return Boolean(
        hasSpinner ||
        (submitBtn &&
          (submitBtn.disabled ||
            submitBtn.getAttribute("aria-disabled") === "true")),
      );
    }

    isComplete() {
      return !this.isStreaming() && Boolean(this.findResponseContainer());
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
      return document.querySelector(
        'button[aria-label="Submit"], button.b_searchboxSubmit',
      );
    }

    findResponseContainer() {
      return (
        document
          .querySelector(".frame_cont iframe")
          ?.contentDocument?.querySelector("#ca_main .gs_multianshead_main") ||
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
  }

  /* -------------------------------------------------------------------------- */
  /* 7. Google Search / AI Overview Adapter (google.com)                        */
  /* -------------------------------------------------------------------------- */
  class GoogleSearchAdapter extends BaseProviderAdapter {
    constructor() {
      super("google", "Google AI Overview", /google\.com/);
    }

    /** Find and click Google's in-page dynamic "AI Mode" button on google.com homepage */
    async ensureAiMode() {
      if (window.location.pathname.startsWith("/search")) {
        return false;
      }
      tabLog("GoogleTab", "🔍 Finding and activating Google AI Mode button...");
      try {
        // 1. Exact Google AI Mode button from DOM
        const exactAiBtn =
          document.querySelector('button[jsname="B6rgad"].plR5qb') ||
          document.querySelector('button[jsname="B6rgad"]') ||
          document.querySelector("button.plR5qb") ||
          document.querySelector('button[jscontroller="jNZDL"]');

        if (exactAiBtn) {
          tabLog(
            "GoogleTab",
            "✨ Found exact Google AI Mode button (button[jsname='B6rgad'].plR5qb). Clicking to activate AI Mode...",
          );
          exactAiBtn.focus();
          exactAiBtn.click();
          exactAiBtn.dispatchEvent(
            new MouseEvent("mousedown", {
              bubbles: true,
              cancelable: true,
              view: window,
            }),
          );
          exactAiBtn.dispatchEvent(
            new MouseEvent("mouseup", {
              bubbles: true,
              cancelable: true,
              view: window,
            }),
          );
          exactAiBtn.dispatchEvent(
            new MouseEvent("click", {
              bubbles: true,
              cancelable: true,
              view: window,
            }),
          );
          await new Promise((r) => setTimeout(r, 500));
          return true;
        }

        // 2. Button with span.lTxWLe ("AI Mode")
        const aiSpan = Array.from(
          document.querySelectorAll("span.lTxWLe, span"),
        ).find((s) => s.textContent?.trim() === "AI Mode");
        if (aiSpan) {
          const parentBtn =
            aiSpan.closest("button, [role='link'], [role='button']") || aiSpan;
          tabLog(
            "GoogleTab",
            "✨ Found AI Mode span. Clicking parent button...",
          );
          parentBtn.click();
          parentBtn.dispatchEvent(
            new MouseEvent("click", {
              bubbles: true,
              cancelable: true,
              view: window,
            }),
          );
          await new Promise((r) => setTimeout(r, 500));
          return true;
        }

        // 3. Fallback AI Mode selectors
        const aiSelectors = [
          'button[aria-label*="AI Mode" i]',
          'a[aria-label*="AI Mode" i]',
          'div[role="button"][aria-label*="AI Mode" i]',
          "button.SbLVJc",
          "button.UTNPFf",
          "button.ONx74b",
          'a[href*="udm=50"]',
          "button.Sw4CSc",
        ];

        for (const sel of aiSelectors) {
          const el = document.querySelector(sel);
          if (el && el.offsetParent !== null) {
            tabLog(
              "GoogleTab",
              `✨ Found AI Mode element (${sel}). Clicking to activate...`,
            );
            el.click();
            el.dispatchEvent(
              new MouseEvent("click", {
                bubbles: true,
                cancelable: true,
                view: window,
              }),
            );
            await new Promise((r) => setTimeout(r, 500));
            return true;
          }
        }
      } catch (e) {
        tabLog("GoogleTab", "Error in ensureAiMode:", e?.message);
      }
      return false;
    }

    /** Attach an image to Google search / Google Lens directly */
    async attachImage(imageDataUrl) {
      if (!imageDataUrl) return false;
      tabLog(
        "GoogleTab",
        "🖼️ Processing direct image upload for Google AI / Lens...",
      );

      try {
        const arr = imageDataUrl.split(",");
        const mime = arr[0].match(/:(.*?);/)?.[1] || "image/png";
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const file = new File([u8arr], "screenshot.png", {
          type: mime,
          lastModified: Date.now(),
        });

        // 1. Try finding and clicking the Google Lens button on homepage
        const lensSelectors = [
          'div[aria-label="Search by image"]',
          "div.nDcEnd",
          'div[role="button"][aria-label*="image" i]',
          'div[role="button"][aria-label*="Search by image" i]',
          'div[jscontroller="e2B3Fd"]',
          'div[jsname="R5L9he"]',
          'div[jsname="enfct"]',
        ];

        let lensBtn = null;
        for (const sel of lensSelectors) {
          const el = document.querySelector(sel);
          if (el && el.offsetParent !== null) {
            lensBtn = el;
            break;
          }
        }

        if (lensBtn) {
          tabLog(
            "GoogleTab",
            "🔍 Found Google Lens icon. Clicking to open image dropzone...",
          );
          lensBtn.click();
          await new Promise((r) => setTimeout(r, 600));
        }

        // 2. Look for Google file input (<input type="file">)
        const fileInputs = Array.from(
          document.querySelectorAll(
            'input[type="file"], input[name="encoded_image"], input.FVO9Bd',
          ),
        );
        for (const fileInput of fileInputs) {
          try {
            const dt = new DataTransfer();
            dt.items.add(file);
            fileInput.files = dt.files;
            fileInput.dispatchEvent(
              new Event("change", { bubbles: true, composed: true }),
            );
            fileInput.dispatchEvent(
              new Event("input", { bubbles: true, composed: true }),
            );
            tabLog(
              "GoogleTab",
              "📁 Dispatched image file to Google's input[type='file']!",
            );
            await new Promise((r) => setTimeout(r, 800));
            return true;
          } catch (e) {
            tabLog("GoogleTab", "File input dispatch notice:", e?.message);
          }
        }

        // 3. Try Drag & Drop on Google drop zone
        const dropZones = Array.from(
          document.querySelectorAll(
            "div.Gdd5U, div.a9gg0e, div.m37tJe, textarea[name='q'], form[role='search']",
          ),
        );
        for (const dropZone of dropZones) {
          try {
            const dt = new DataTransfer();
            dt.items.add(file);
            dropZone.dispatchEvent(
              new DragEvent("dragenter", {
                bubbles: true,
                cancelable: true,
                dataTransfer: dt,
              }),
            );
            dropZone.dispatchEvent(
              new DragEvent("dragover", {
                bubbles: true,
                cancelable: true,
                dataTransfer: dt,
              }),
            );
            dropZone.dispatchEvent(
              new DragEvent("drop", {
                bubbles: true,
                cancelable: true,
                dataTransfer: dt,
              }),
            );
            tabLog(
              "GoogleTab",
              "📦 Dispatched DragEvent 'drop' to Google dropzone!",
            );
            await new Promise((r) => setTimeout(r, 800));
            return true;
          } catch (e) {
            tabLog("GoogleTab", "Drop zone dispatch notice:", e?.message);
          }
        }

        // 4. Fallback: Synthetic ClipboardEvent paste onto input
        const input = this.findInput();
        if (input) {
          this.focusInput();
          const dt = new DataTransfer();
          dt.items.add(file);
          const pasteEv = new ClipboardEvent("paste", {
            bubbles: true,
            cancelable: true,
            clipboardData: dt,
          });
          input.dispatchEvent(pasteEv);
          tabLog(
            "GoogleTab",
            "📋 Dispatched synthetic ClipboardEvent paste to search input",
          );
          await new Promise((r) => setTimeout(r, 600));
          return true;
        }
      } catch (err) {
        tabLog("GoogleTab", "❌ Error in attachImage:", err?.message);
      }
      return false;
    }

    findInput() {
      // If on search page, prioritize the follow-up textarea .ITIRGe
      if (window.location.pathname.startsWith("/search")) {
        const followUp = document.querySelector(
          'textarea.ITIRGe, textarea[placeholder*="Ask anything" i], textarea[aria-label*="Ask a follow up" i]',
        );
        if (followUp) return followUp;
      }
      return document.querySelector(
        'textarea.ITIRGe, textarea[name="q"], input[name="q"], textarea[title="Search"], textarea[aria-label="Search"], [role="combobox"]',
      );
    }

    async insertPrompt(text) {
      this._lastPrompt = text;

      // 1. Activate AI Mode first on homepage
      await this.ensureAiMode();

      // 2. Find and populate search / follow-up input
      const input = this.findInput();
      if (!input) return false;
      this.focusInput();

      const nativeSetter =
        Object.getOwnPropertyDescriptor(
          window.HTMLTextAreaElement.prototype,
          "value",
        )?.set ||
        Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          "value",
        )?.set;

      if (nativeSetter) {
        nativeSetter.call(input, text);
      } else {
        input.value = text;
      }

      input.dispatchEvent(
        new Event("input", { bubbles: true, composed: true }),
      );
      input.dispatchEvent(new Event("change", { bubbles: true }));
      input.dispatchEvent(new KeyboardEvent("input", { bubbles: true }));
      tabLog(
        "GoogleTab",
        `✍️ Prompt inserted into search box: "${text.slice(0, 30)}..."`,
      );
      await new Promise((r) => setTimeout(r, 200));
      return true;
    }

    findSendButton() {
      const selectors = [
        'button[jsname="B6rgad"].Sw4CSc',
        'button[jsname="B6rgad"]',
        "button.plR5qb.Sw4CSc",
        "button.plR5qb",
        'button[aria-label="Google Search"]',
        'input[name="btnK"]',
        'input[value="Google Search"]',
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
      await new Promise((r) => setTimeout(r, 150));

      const isSearchPage = window.location.pathname.startsWith("/search");
      const input = this.findInput();

      // Case 1: In-page follow-up conversation turn on /search page
      if (isSearchPage || input?.classList?.contains("ITIRGe")) {
        tabLog("GoogleTab", "↵ Dispatching Enter key to follow-up chat box...");
        try {
          input.focus();
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
          input.dispatchEvent(
            new KeyboardEvent("keypress", {
              key: "Enter",
              code: "Enter",
              keyCode: 13,
              which: 13,
              bubbles: true,
              cancelable: true,
            }),
          );
          input.dispatchEvent(
            new KeyboardEvent("keyup", {
              key: "Enter",
              code: "Enter",
              keyCode: 13,
              which: 13,
              bubbles: true,
              cancelable: true,
            }),
          );
        } catch {}

        const sendBtn =
          document.querySelector(
            'button[aria-label*="Send" i], button[aria-label*="Search" i], button[type="submit"]',
          ) || this.findSendButton();
        if (sendBtn) {
          try {
            sendBtn.click();
          } catch {}
        }
        return true;
      }

      // Case 2: Google Homepage initial search submission
      tabLog(
        "GoogleTab",
        "🚀 Submitting search from Google homepage with AI Mode...",
      );
      const btn = this.findSendButton();
      if (btn) {
        tabLog("GoogleTab", "🔘 Clicking Google Search / AI button...");
        try {
          btn.click();
          btn.dispatchEvent(
            new MouseEvent("click", {
              bubbles: true,
              cancelable: true,
              view: window,
            }),
          );
        } catch {}
      }

      const form = input
        ? input.closest("form")
        : document.querySelector('form[role="search"], form[action="/search"]');
      if (form) {
        tabLog("GoogleTab", "📄 Triggering form submit...");
        try {
          if (typeof form.requestSubmit === "function") {
            form.requestSubmit();
          } else {
            form.submit();
          }
          return true;
        } catch {
          form.submit();
          return true;
        }
      }

      if (this._lastPrompt) {
        tabLog("GoogleTab", "🌐 Navigating directly to AI search results...");
        window.location.href = `https://www.google.com/search?q=${encodeURIComponent(this._lastPrompt)}&hl=en&udm=50`;
        return true;
      }

      return true;
    }

    findResponseContainer() {
      // 1. Target the LATEST turn's AI content container in the conversation thread
      const turns = document.querySelectorAll(
        'div[data-scope-id="turn"], div.CKgc1d[jsname="CS7uPe"], div.CKgc1d',
      );
      if (turns.length > 0) {
        for (let i = turns.length - 1; i >= 0; i--) {
          const turn = turns[i];
          const aiContainer = turn.querySelector(
            'div[data-subtree="aimc"] div[data-container-id="main-col"] .Dn7Fzd, div[data-subtree="aimc"] div[data-container-id="main-col"], div[data-subtree="aimc"] .Dn7Fzd, div[data-subtree="aimc"], div.mZJni.Dn7Fzd, div[data-container-id="main-col"] .Dn7Fzd, div[data-container-id="main-col"], div.mZJni',
          );
          if (aiContainer) {
            const text = (aiContainer.textContent || "").trim();
            if (text.length > 20 && !text.startsWith("You sent:")) {
              return aiContainer;
            }
          }
        }
      }

      // 2. Global AI Overview content selectors on the page (matching newest / last element)
      const selectors = [
        'div[data-subtree="aimc"] div[data-container-id="main-col"] .Dn7Fzd',
        'div[data-subtree="aimc"] div[data-container-id="main-col"]',
        'div[data-subtree="aimc"] .Dn7Fzd',
        'div[data-subtree="aimc"] div.mZJni',
        'div[data-subtree="aimc"]',
        "div.mZJni.Dn7Fzd",
        "div.mZJni",
        "div.Dn7Fzd",
        'div[data-container-id="main-col"] .Dn7Fzd',
        'div[data-container-id="main-col"] div[jsname="N760b"]',
        'div[data-container-id="main-col"] div[data-attrid="wa:/description"]',
        'div[data-container-id="main-col"]',
        'div[data-attrid="wa:/description"]',
        "div.ULSXZd",
        "div.IZ6rdc",
        "div[data-sokoban-container]",
        "div.wDYxhc",
        "div.xpdopen",
        "div.kp-blk",
        "div.V3FYCf",
        "div.MjjYud",
        "#rso",
      ];

      for (const sel of selectors) {
        try {
          const matched = document.querySelectorAll(sel);
          if (matched.length > 0) {
            const lastEl = matched[matched.length - 1];
            if (lastEl && !lastEl.querySelector("textarea.ITIRGe")) {
              const text = (lastEl.textContent || "").trim();
              if (text.length > 25 && !text.startsWith("You sent:")) {
                return lastEl;
              }
            }
          }
        } catch {}
      }

      // 3. Fallback via Copy button parent (from the LAST copy button on the page)
      const copyBtns = Array.from(
        document.querySelectorAll(
          'button[aria-label="Copy text"].bKxaof, button[aria-label*="Copy text" i], button.bKxaof, button[aria-label="Copy text"]',
        ),
      );

      if (copyBtns.length > 0) {
        const lastCopyBtn = copyBtns[copyBtns.length - 1];
        const toolbar = lastCopyBtn.closest(
          '[role="toolbar"], div[jsaction], div.eGAasd, div',
        );
        if (toolbar && toolbar.parentElement) {
          const parent = toolbar.parentElement;
          const text = (parent.textContent || "").trim();
          if (
            text.length > 25 &&
            !parent.querySelector("textarea.ITIRGe") &&
            !parent.classList.contains("zkL70c") &&
            !text.startsWith("You sent:")
          ) {
            return parent;
          }
        }
      }

      return null;
    }

    getJunkSelectors() {
      return [
        ...super.getJunkSelectors(),
        'div[data-subtree="aimq"]',
        'div[aria-label*="You sent" i]',
        'div[data-xid*="user"]',
        'div[data-sfc-cp*="user"]',
        'div:has(> img[alt*="Visually searched" i])',
        'img[alt*="Visually searched" i]',
        'div[data-container-id="rhs-col"]',
        'div[data-xid="aim-aside-initial-corroboration-container"]',
        'div[data-xid="Gd7Hsc"]',
        'div[data-xid="YruvMc"]',
      ];
    }

    observeResponse(timeoutMs = 25000, previousContent = "") {
      return new Promise(async (resolve) => {
        const startTime = Date.now();
        let lastTextLength = 0;
        let idleCount = 0;
        let isDone = false;

        // Record initial state before sending / waiting for the new turn
        const initialTurnCount = document.querySelectorAll(
          'div[data-scope-id="turn"], div.CKgc1d[jsname="CS7uPe"], div.CKgc1d',
        ).length;
        const initialCopyBtnCount = document.querySelectorAll(
          'button[aria-label="Copy text"].bKxaof, button[aria-label*="Copy text" i], button.bKxaof',
        ).length;

        // Listen for live network stream chunks from /async/folif
        let hasReceivedNetChunk = false;
        const netChunkListener = (e) => {
          if (e.detail?.raw) {
            hasReceivedNetChunk = true;
            tabLog(
              "GoogleTab",
              `📡 Network stream chunk captured from /async/folif (${e.detail.raw.length} bytes)`,
            );
          }
        };
        window.addEventListener("spectralens:network_chunk", netChunkListener);

        const cleanUp = () => {
          isDone = true;
          clearInterval(checkInterval);
          window.removeEventListener(
            "spectralens:network_chunk",
            netChunkListener,
          );
        };

        // Activate AI Mode once on homepage if not already active
        await this.ensureAiMode();

        const checkInterval = setInterval(async () => {
          if (isDone) return;
          const currentCopyBtnCount = document.querySelectorAll(
            'button[aria-label="Copy text"].bKxaof, button[aria-label*="Copy text" i], button.bKxaof',
          ).length;
          const currentTurnCount = document.querySelectorAll(
            'div[data-scope-id="turn"], div.CKgc1d[jsname="CS7uPe"], div.CKgc1d',
          ).length;

          const container = this.findResponseContainer();

          if (container) {
            const currentContent = (container.textContent || "").trim();
            const currentLength = currentContent.length;

            // If this is a follow-up turn in an existing multi-turn thread:
            // Must wait until the NEW turn is created (currentTurnCount > initialTurnCount OR new copy button appeared)
            if (previousContent) {
              const hasNewTurnAppeared =
                currentTurnCount > initialTurnCount ||
                currentCopyBtnCount > initialCopyBtnCount ||
                hasReceivedNetChunk;

              if (!hasNewTurnAppeared || currentContent === previousContent) {
                return; // Still waiting for Google to begin streaming the new turn!
              }
            }

            if (currentLength > 25) {
              // Completion signal:
              // Turn 1: any copy button on page OR stable text
              // Turn 2+: new copy button appeared OR text is stable for 3 consecutive checks
              const isTurnFinished = previousContent
                ? currentCopyBtnCount > initialCopyBtnCount ||
                  (hasReceivedNetChunk && idleCount >= 2) ||
                  (currentTurnCount > initialTurnCount && idleCount >= 3)
                : currentCopyBtnCount > 0 ||
                  (hasReceivedNetChunk && idleCount >= 2) ||
                  idleCount >= 3;

              if (currentLength === lastTextLength) {
                idleCount++;
                if (isTurnFinished || idleCount >= 4) {
                  cleanUp();
                  const md = await this.getCurrentResponse();
                  tabLog(
                    "GoogleTab",
                    `✅ AI Overview extracted, length: ${md?.length || 0}`,
                  );
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
            cleanUp();
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
