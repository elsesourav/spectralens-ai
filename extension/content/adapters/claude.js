/**
 * SpectraLens AI — Claude Adapter (claude.ai)
 */
(function (global) {
  "use strict";

  const BaseAdapter = global.BaseProviderAdapter || BaseProviderAdapter;

  class ClaudeAdapter extends BaseAdapter {
    constructor() {
      super("claude", "Claude", /claude\.ai/);
    }

    findInput() {
      return (
        document.querySelector('div.ProseMirror[contenteditable="true"]') ||
        document.querySelector('div[contenteditable="true"][data-placeholder]') ||
        document.querySelector('div[aria-label*="Write your prompt" i]') ||
        document.querySelector('fieldset div[contenteditable="true"]') ||
        document.querySelector('div[data-testid="chat-input"]') ||
        document.querySelector('div[contenteditable="true"]') ||
        document.querySelector('textarea')
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
      await new Promise((r) => setTimeout(r, 60));

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
        input.innerHTML = `<p>${text}</p>`;

        const beforeInput = new InputEvent("beforeinput", {
          bubbles: true,
          cancelable: true,
          inputType: "insertText",
          data: text,
        });
        const notCancelled = input.dispatchEvent(beforeInput);
        if (notCancelled) {
          try {
            document.execCommand("selectAll", false, null);
            document.execCommand("insertText", false, text);
          } catch {}
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
      }

      await new Promise((r) => setTimeout(r, 100));
      return true;
    }

    findSendButton() {
      return (
        document.querySelector('button[aria-label*="Send Message" i]') ||
        document.querySelector('button[aria-label*="Send" i]') ||
        document.querySelector('button[data-testid="send-button"]') ||
        document.querySelector('fieldset button[type="submit"]') ||
        document.querySelector('fieldset button:not([disabled]):has(svg)') ||
        document.querySelector('button.cursor-pointer:has(svg)')
      );
    }

    async verifySubmission(timeoutMs = 3000) {
      const startTime = Date.now();
      const input = this.findInput();
      const initialText = (input?.textContent || input?.value || "").trim();

      while (Date.now() - startTime < timeoutMs) {
        await new Promise((r) => setTimeout(r, 150));

        // Signal 1: Input editor cleared
        const currentInput = this.findInput();
        const currentText = (
          currentInput?.textContent ||
          currentInput?.value ||
          ""
        ).trim();
        if (
          initialText.length > 0 &&
          (currentText.length === 0 || currentInput?.innerHTML === "<p><br></p>")
        ) {
          return true;
        }

        // Signal 2: Stop button appeared
        const stopBtn = document.querySelector(
          'button[aria-label*="Stop" i], button[data-testid="stop-button"]',
        );
        if (stopBtn && stopBtn.offsetParent !== null) {
          return true;
        }

        // Signal 3: Assistant streaming started
        if (this.isStreaming()) {
          return true;
        }
      }
      return false;
    }

    findResponseContainer() {
      const candidates = [
        '[data-message-author-role="assistant"] div.standard-markdown',
        '[data-message-author-role="assistant"] div.progressive-markdown',
        '[data-message-author-role="assistant"]',
        'div.font-claude-response div.standard-markdown',
        'div.font-claude-response div.progressive-markdown',
        'div.font-claude-response',
        '[role="article"][aria-label*="Claude responded" i] div.standard-markdown',
        '[role="article"][aria-label*="Claude responded" i]',
        'div.font-claude-message div.standard-markdown',
        'div.font-claude-message',
        'div.standard-markdown',
        'div.progressive-markdown',
        'div[class*="font-claude"]',
      ];

      for (const sel of candidates) {
        const list = document.querySelectorAll(sel);
        if (list.length > 0) {
          for (let i = list.length - 1; i >= 0; i--) {
            const el = list[i];
            const txt = (el.textContent || "").trim();
            if (txt.length > 0) {
              return el;
            }
          }
        }
      }
      return document.querySelector(
        '[data-message-author-role="assistant"], div.font-claude-response, div.font-claude-message, div.standard-markdown',
      );
    }

    getJunkSelectors() {
      return [
        ...super.getJunkSelectors(),
        ".font-claude-message-actions",
        'button[data-testid="retry-button"]',
        'button[aria-label="Copy Content"]',
        'button[aria-label*="Copy" i]',
        'button[aria-label*="Thumbs" i]',
        'button[aria-label*="Feedback" i]',
        '[data-testid*="action-bar"]',
      ];
    }

    isStreaming() {
      return Boolean(
        document.querySelector(
          'div[data-is-streaming="true"], button[aria-label*="Stop" i], button[data-testid="stop-button"], svg.animate-spin, div.animate-pulse, .ant-spin'
        )
      );
    }

    createCompletionDetector() {
      const DetectorClass =
        global.ClaudeCompletionDetector || ClaudeCompletionDetector;
      return new DetectorClass(this);
    }

    isComplete() {
      return !this.isStreaming() && Boolean(this.findResponseContainer());
    }
  }

  global.ClaudeAdapter = ClaudeAdapter;
})(typeof window !== "undefined" ? window : globalThis);
