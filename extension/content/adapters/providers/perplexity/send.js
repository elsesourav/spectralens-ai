/**
 * SpectraLens AI — Perplexity Send Script
 * Handles input location, Lexical editor text insertion, and button click submit for Perplexity.
 */
(function (global) {
  "use strict";

  const PerplexitySend = {
    findInput() {
      return document.querySelector(
        'div#ask-input, textarea#ask-input, div[data-lexical-editor="true"], textarea[placeholder*="Ask" i], textarea[placeholder*="follow-up" i], textarea[placeholder*="anything" i], textarea[placeholder*="search" i], textarea.overflow-hidden, div[role="textbox"]',
      );
    },

    focusInput() {
      const el = this.findInput();
      if (!el) return;
      el.focus();
      try {
        const sel = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
      } catch {}
    },

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
    },

    async insertPrompt(text) {
      const input = this.findInput();
      if (!input) return false;

      this.focusInput();
      await new Promise((r) => setTimeout(r, 60));

      if (input.tagName.toLowerCase() === "textarea") {
        input.value = text;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      } else {
        input.focus();

        try {
          document.execCommand("selectAll", false, null);
          document.execCommand("delete", false, null);
        } catch {}

        if ((input.textContent || "").trim().length > 0) {
          try {
            const sel = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(input);
            sel.removeAllRanges();
            sel.addRange(range);
            range.deleteContents();
          } catch {}
        }

        let inserted = false;
        try {
          inserted = document.execCommand("insertText", false, text);
        } catch {}

        const currentText = (input.textContent || "").trim();
        if (!inserted || currentText !== text.trim()) {
          const sel = window.getSelection();
          if (sel && sel.rangeCount > 0) {
            const curRange = sel.getRangeAt(0);
            curRange.deleteContents();
            const textNode = document.createTextNode(text);
            curRange.insertNode(textNode);
            curRange.selectNodeContents(textNode);
            curRange.collapse(false);
            sel.removeAllRanges();
            sel.addRange(curRange);
          } else {
            input.textContent = text;
          }
        }

        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }

      await new Promise((r) => setTimeout(r, 100));
      return Boolean((input.textContent || input.value || "").trim().length > 0);
    },

    findSendButton() {
      const input = this.findInput();
      const container =
        input?.closest(
          'div[data-ask-input-container="true"], div.bg-base, form, div.relative',
        ) || document;

      // 1. Exact Submit / Send aria-label
      const exactBtn = container.querySelector(
        'button[aria-label="Submit" i], button[aria-label="Send" i], button[aria-label="Ask" i]',
      );
      if (exactBtn) return exactBtn;

      // 2. Button with arrow-up SVG icon
      const arrowBtn = container.querySelector(
        'button:has(use[*|href*="arrow-up"]), button:has(svg.lucide-arrow-up), button:has(svg path[d*="M12 19V5"])',
      );
      if (arrowBtn) return arrowBtn;

      // 3. Submit button with bg-button-bg or bg-super
      const styledBtn = container.querySelector(
        'button.bg-button-bg:not([aria-label*="Model" i]):not([aria-label*="Dictation" i]), button.bg-super:not([aria-label*="Model" i]):not([aria-label*="Dictation" i])',
      );
      if (styledBtn) return styledBtn;

      return document.querySelector(
        'button[aria-label="Submit" i], button[aria-label="Send" i]',
      );
    },

    async executePrimarySubmit() {
      const btn = this.findSendButton();
      let activeBtn =
        btn && !btn.disabled && !btn.classList.contains("pointer-events-none")
          ? btn
          : null;

      if (!activeBtn && btn) {
        for (let i = 0; i < 8; i++) {
          await new Promise((r) => setTimeout(r, 100));
          if (!btn.disabled && !btn.classList.contains("pointer-events-none")) {
            activeBtn = btn;
            break;
          }
        }
      }

      if (activeBtn) {
        tabLog(
          "PerplexityTab",
          "🔘 Triggering submit on Perplexity send button...",
        );
        try {
          activeBtn.focus();
          activeBtn.click();
          return true;
        } catch (err) {
          tabLog(
            "PerplexityTab",
            "Button click threw, trying Enter fallback:",
            err?.message,
          );
        }
      }
      return false;
    },

    async verifySubmission(timeoutMs = 3000) {
      const startTime = Date.now();
      const input = this.findInput();
      const initialText = (input?.value || input?.textContent || "").trim();

      while (Date.now() - startTime < timeoutMs) {
        await new Promise((r) => setTimeout(r, 150));

        // Signal 1: Input cleared
        const currentInput = this.findInput();
        const currentText = (
          currentInput?.value ||
          currentInput?.textContent ||
          ""
        ).trim();
        if (initialText.length > 0 && currentText.length === 0) {
          return true;
        }

        // Signal 2: Stop button appeared
        const stopBtn = document.querySelector(
          'button[aria-label*="Stop" i], button[aria-label*="Cancel" i], .animate-pulse',
        );
        if (stopBtn && stopBtn.offsetParent !== null) {
          return true;
        }

        // Signal 3: Assistant streaming started
        const isStreaming = Boolean(
          document.querySelector(
            'button[aria-label*="Stop" i], button[data-testid="stop-button"], svg.animate-spin, div[data-testid="loading-indicator"], div.animate-pulse',
          ),
        );
        if (isStreaming) {
          return true;
        }
      }
      return false;
    },
  };

  global.PerplexitySend = PerplexitySend;
})(typeof window !== "undefined" ? window : globalThis);
