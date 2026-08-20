/**
 * SpectraLens AI — ChatGPT Send Script
 * Handles input location, image attachment, prompt insertion, and submit execution for ChatGPT.
 */
(function (global) {
  "use strict";

  const ChatGPTSend = {
    findInput() {
      return document.querySelector(
        '#prompt-textarea, div[role="textbox"][aria-label*="ChatGPT" i], div[role="textbox"], textarea[data-id="root"], div.ProseMirror[contenteditable="true"], div[contenteditable="true"]',
      );
    },

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
    },

    async insertPrompt(text) {
      const input = this.findInput();
      if (!input) return false;

      input.focus();
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
    },

    findSendButton() {
      return document.querySelector(
        'button[data-testid="send-button"], button[aria-label*="Send prompt" i], button[aria-label*="Send" i], button[data-testid="fruitjuice-send-button"]',
      );
    },

    async verifySubmission(timeoutMs = 3000) {
      const startTime = Date.now();
      const input = this.findInput();
      const initialText = (input?.value || input?.textContent || "").trim();

      while (Date.now() - startTime < timeoutMs) {
        await new Promise((r) => setTimeout(r, 150));

        // Signal 1: Input editor cleared
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
          'button[data-testid="stop-button"], button[aria-label*="Stop" i]',
        );
        if (stopBtn && stopBtn.offsetParent !== null) {
          return true;
        }

        // Signal 3: Assistant response streaming has started
        const isStreaming = Boolean(
          document.querySelector(
            'button[data-testid="stop-button"], button[aria-label*="Stop streaming" i], button[aria-label*="Stop generating" i], button[aria-label*="Stop" i], .result-streaming, [data-is-streaming="true"], div[class*="streaming"]',
          ),
        );
        if (isStreaming) {
          return true;
        }
      }
      return false;
    },
  };

  global.ChatGPTSend = ChatGPTSend;
})(typeof window !== "undefined" ? window : globalThis);
