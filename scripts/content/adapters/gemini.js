/**
 * SpectraLens AI — Gemini Adapter (gemini.google.com)
 */
(function (global) {
  "use strict";

  const BaseAdapter = global.BaseProviderAdapter || BaseProviderAdapter;

  class GeminiAdapter extends BaseAdapter {
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
            await new Promise((r) => setTimeout(r, 800));

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

          const elapsed = Date.now() - uploadStart;
          if (elapsed % 2000 < 500) {
            tabLog(
              "GeminiTab",
              `⏳ Still waiting for upload... (${Math.round(elapsed / 1000)}s, uploading: ${isStillUploading}, newCards: ${newCardsAppeared}, newImgs: ${newImagesAppeared})`,
            );
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
        if (this.isStreaming()) {
          return true;
        }
      }
      return false;
    }

    findResponseContainer() {
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

    createCompletionDetector() {
      const DetectorClass =
        global.GeminiCompletionDetector || GeminiCompletionDetector;
      return new DetectorClass(this);
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

  global.GeminiAdapter = GeminiAdapter;
})(typeof window !== "undefined" ? window : globalThis);
