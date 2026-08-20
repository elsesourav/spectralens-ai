/**
 * SpectraLens AI — Gemini Send Script
 * Handles input location, file card/chip image processing, and prompt submission for Gemini.
 */
(function (global) {
  "use strict";

  const GeminiSend = {
    findInput() {
      return document.querySelector(
        'div.ql-editor[contenteditable="true"], div[contenteditable="true"][role="textbox"], rich-textarea div[contenteditable="true"], rich-textarea > div, div.ql-editor.textarea, textarea[aria-label*="prompt" i], div[role="textbox"]',
      );
    },

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
              "GeminiTab",
              "📋 Dispatched synthetic paste event to Gemini input!",
            );
            dispatched = true;
          }
        }

        if (!dispatched) return false;

        // 3. Wait for Gemini to process & upload image
        tabLog(
          "GeminiTab",
          "⏳ Waiting for Gemini to process & upload image...",
        );
        const uploadStart = Date.now();
        const maxWaitMs = 15000;
        let uploadConfirmed = false;

        while (Date.now() - uploadStart < maxWaitMs) {
          await new Promise((r) => setTimeout(r, 500));

          const currentUploadCardCount = document.querySelectorAll(
            "uploader-file-card, .file-chip, .attachment-chip, .uploaded-file-chip",
          ).length;
          const currentImgCount = document.querySelectorAll(
            'img[src*="blob:"], img.uploaded-image',
          ).length;

          const newCardsAppeared =
            currentUploadCardCount > beforeUploadCardCount;
          const newImagesAppeared = currentImgCount > beforeImgCount;

          const isStillUploading = Boolean(
            document.querySelector(
              'mat-progress-bar, mat-spinner, .upload-progress, div[role="progressbar"], .loading-spinner, .mat-mdc-progress-bar',
            ),
          );

          if ((newCardsAppeared || newImagesAppeared) && !isStillUploading) {
            await new Promise((r) => setTimeout(r, 800));

            const stillUploading = Boolean(
              document.querySelector(
                'mat-progress-bar, mat-spinner, .upload-progress, div[role="progressbar"], .mat-mdc-progress-bar',
              ),
            );
            if (!stillUploading) {
              tabLog(
                "GeminiTab",
                `✨ Image uploaded & confirmed in ${Date.now() - uploadStart}ms!`,
              );
              uploadConfirmed = true;
              break;
            }
          }
        }

        if (!uploadConfirmed) {
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
    },

    async insertPrompt(text) {
      const input = this.findInput();
      if (!input) return false;

      input.focus();
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
    },

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
    },

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
        if (initialText.length > 0 && currentText.length === 0) {
          return true;
        }

        // Signal 2: Stop button or progress bar appeared
        const stopBtn = document.querySelector(
          'button[aria-label*="Stop" i], mat-progress-bar, mat-spinner, div[role="progressbar"], .mat-mdc-progress-bar',
        );
        if (stopBtn && stopBtn.offsetParent !== null) {
          return true;
        }

        // Signal 3: Assistant streaming active
        const isStreaming = Boolean(
          document.querySelector(
            "mat-progress-bar, mat-progress-spinner, button.stop-button, button[aria-label*='Stop' i], .sparkle-icon-spinning, .loading-indicator, .loading-spinner",
          ),
        );
        if (isStreaming) {
          return true;
        }
      }
      return false;
    },
  };

  global.GeminiSend = GeminiSend;
})(typeof window !== "undefined" ? window : globalThis);
