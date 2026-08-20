/**
 * SpectraLens AI — Grok Send Script
 * Handles input location, synthetic pasting, and submit execution for Grok.
 */
(function (global) {
  "use strict";

  const GrokSend = {
    findInput() {
      return document.querySelector(
        'div[role="textbox"], textarea[placeholder*="Ask" i], textarea[placeholder*="anything" i], textarea[placeholder*="Grok" i], textarea, main div.ProseMirror, div[contenteditable="true"]',
      );
    },

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
          input.focus();
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
    },

    async insertPrompt(text) {
      const input = this.findInput();
      if (!input) return false;

      input.focus();
      await new Promise((r) => setTimeout(r, 50));

      if (
        input.tagName.toLowerCase() === "textarea" ||
        input.tagName.toLowerCase() === "input"
      ) {
        input.value = text;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      } else {
        try {
          input.focus();
          document.execCommand("selectAll", false, null);
          document.execCommand("insertText", false, text);
        } catch {}
        if (
          !input.textContent ||
          !input.textContent.includes(text.slice(0, 10))
        ) {
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
      }

      await new Promise((r) => setTimeout(r, 100));
      return true;
    },

    findSendButton() {
      return document.querySelector(
        'button[aria-label*="Send" i], button[type="submit"], button.bg-highlight, div[role="button"][aria-label*="Send" i]',
      );
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

        // Signal 2: Thinking / stop container appeared
        const stopBtn = document.querySelector(
          '.thinking-container, div.thinking-indicator, button[aria-label*="Stop" i]',
        );
        if (stopBtn && stopBtn.isConnected) {
          return true;
        }

        // Signal 3: Streaming started
        const isStreaming = Boolean(
          document.querySelector(
            "main #last-reply-container .thinking-container, div.thinking-indicator",
          ),
        );
        if (isStreaming) {
          return true;
        }
      }
      return false;
    },
  };

  global.GrokSend = GrokSend;
})(typeof window !== "undefined" ? window : globalThis);
