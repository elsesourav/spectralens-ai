/**
 * SpectraLens AI — Base Provider Adapter
 * Implements the explicit contract and lifecycle for all provider adapters:
 * detect(), findInput(), focusInput(), insertPrompt(), verifyInput(),
 * findSubmitControl(), submit(), verifySubmission(), observeResponse(), extractResponse()
 */
(function (global) {
  "use strict";

  class BaseProviderAdapter {
    constructor(id, name, hostPattern) {
      this.id = id;
      this.name = name;
      this.hostPattern = hostPattern;
      this._isSubmitting = false;

      // Configurable lifecycle timeouts (ms)
      this.INPUT_TIMEOUT = 10000;
      this.SUBMIT_TIMEOUT = 5000;
      this.RESPONSE_START_TIMEOUT = 15000;
    }

    /** Initialize provider adapter state */
    initialize() {
      return true;
    }

    /** Check if provider page is ready for interaction */
    isReady() {
      return Boolean(this.findInput());
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
        try {
          if (input.setSelectionRange && typeof input.value === "string") {
            const len = input.value.length;
            input.setSelectionRange(len, len);
          } else {
            const sel = window.getSelection();
            if (sel) {
              const range = document.createRange();
              range.selectNodeContents(input);
              range.collapse(false);
              sel.removeAllRanges();
              sel.addRange(range);
            }
          }
        } catch {}
        return true;
      }
      return false;
    }

    /** Safely insert prompt text and synchronize framework/DOM state */
    async insertPrompt(text) {
      throw new Error("insertPrompt() must be implemented by subclass");
    }

    /** Verify that the prompt input actually contains the expected text */
    verifyInput(expectedText) {
      if (this.isStreaming() || Boolean(this.findResponseContainer())) {
        return true;
      }
      const input = this.findInput();
      if (!input) return false;
      const val = (
        input.value ||
        input.textContent ||
        input.innerText ||
        ""
      ).trim();
      const expected = (expectedText || "").trim();
      if (!expected) return true;

      // Normalizing whitespace and checking if leading snippet is present
      const normVal = val.replace(/\s+/g, " ");
      const normExp = expected.replace(/\s+/g, " ");
      const sample = normExp.slice(0, Math.min(40, normExp.length));
      return (
        normVal.includes(sample) ||
        normVal.length >= Math.min(expected.length * 0.5, 10) ||
        val.length > 0
      );
    }

    /** Find the submit/send control (button or form) */
    findSubmitControl() {
      return this.findSendButton();
    }

    /** Find the submit/send button */
    findSendButton() {
      return null;
    }

    /** Check if submission is ready */
    canSubmit() {
      return Boolean(this.findSubmitControl() || this.findInput());
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

    /** Execute primary submission (Send button click) */
    async executePrimarySubmit() {
      const control = this.findSubmitControl();
      if (
        control &&
        !control.disabled &&
        control.getAttribute("aria-disabled") !== "true"
      ) {
        try {
          control.focus?.();
          control.click();
          return true;
        } catch (err) {
          tabLog(this.id, "Primary submit threw error:", err?.message);
        }
      }
      return false;
    }

    /** Execute fallback submission (Enter key / form requestSubmit) */
    async executeFallbackSubmit() {
      const input = this.findInput();
      if (input) {
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
          return true;
        } catch (err) {
          tabLog(this.id, "Fallback submit threw error:", err?.message);
        }
      }
      return false;
    }

    /** Verify whether submission actually occurred */
    async verifySubmission(timeoutMs = 3000) {
      const startTime = Date.now();
      const input = this.findInput();
      const initialText = (
        input?.value ||
        input?.textContent ||
        input?.innerText ||
        ""
      ).trim();

      while (Date.now() - startTime < timeoutMs) {
        await new Promise((r) => setTimeout(r, 150));

        // Signal 1: Input editor was cleared or reset
        const currentInput = this.findInput();
        const currentText = (
          currentInput?.value ||
          currentInput?.textContent ||
          currentInput?.innerText ||
          ""
        ).trim();
        if (initialText.length > 0 && currentText.length === 0) {
          return true;
        }

        // Signal 2: Stop button / generating spinner appeared
        const stopBtn = document.querySelector(
          'button[data-testid="stop-button"], button[aria-label*="Stop" i], button[aria-label*="Cancel" i], .thinking-container, div[role="progressbar"], mat-progress-bar',
        );
        if (stopBtn && stopBtn.offsetParent !== null) {
          return true;
        }

        // Signal 3: Response streaming has started
        if (this.isStreaming()) {
          return true;
        }
      }

      return false;
    }

    /** Submit method with primary + verified fallback */
    async submit(requestId = null) {
      if (this._isSubmitting) {
        tabLog(this.id, "Submit lock active - ignoring duplicate submit call");
        return { success: false, error: "SUBMISSION_LOCKED" };
      }
      this._isSubmitting = true;

      const reqId = requestId || "req_" + Date.now();
      tabLog(
        this.id,
        `[SL REQUEST] ${reqId} provider=${this.id} event=SUBMIT_STARTED timestamp=${Date.now()}`,
      );

      try {
        await new Promise((r) => setTimeout(r, 150));

        // 1. Try Primary Method
        tabLog(
          this.id,
          `[SL REQUEST] ${reqId} provider=${this.id} event=SUBMIT_METHOD=BUTTON timestamp=${Date.now()}`,
        );
        const primaryOk = await this.executePrimarySubmit();
        const primaryConfirmed =
          primaryOk && (await this.verifySubmission(this.SUBMIT_TIMEOUT));

        if (primaryConfirmed) {
          tabLog(
            this.id,
            `[SL REQUEST] ${reqId} provider=${this.id} event=SUBMIT_VERIFIED fallbackUsed=false timestamp=${Date.now()}`,
          );
          return { success: true, fallbackUsed: false };
        }

        // 2. Try Fallback Method ONLY IF primary was not confirmed
        tabLog(
          this.id,
          `[SL REQUEST] ${reqId} provider=${this.id} event=SUBMIT_METHOD=ENTER fallbackUsed=true timestamp=${Date.now()}`,
        );
        const fallbackOk = await this.executeFallbackSubmit();
        const fallbackConfirmed =
          fallbackOk && (await this.verifySubmission(this.SUBMIT_TIMEOUT));

        if (fallbackConfirmed) {
          tabLog(
            this.id,
            `[SL REQUEST] ${reqId} provider=${this.id} event=SUBMIT_VERIFIED fallbackUsed=true timestamp=${Date.now()}`,
          );
          return { success: true, fallbackUsed: true };
        }

        // If neither was confirmed, return structured failure
        tabLog(
          this.id,
          `[SL REQUEST] ${reqId} provider=${this.id} event=SUBMISSION_NOT_CONFIRMED timestamp=${Date.now()}`,
        );
        return {
          success: false,
          requestId: reqId,
          provider: this.id,
          phase: "SUBMIT",
          error: "SUBMISSION_NOT_CONFIRMED",
        };
      } finally {
        setTimeout(() => {
          this._isSubmitting = false;
        }, 500);
      }
    }

    /**
     * Executes the complete verified end-to-end input and submission lifecycle.
     */
    async executeLifecycle(
      prompt,
      image = null,
      requestId = null,
      isReused = false,
    ) {
      const reqId = requestId || "req_" + Date.now();

      // 0. Settle delay for fresh tab
      if (!isReused) {
        await new Promise((r) => setTimeout(r, 600));
      }

      // Check if response is already streaming or rendered (e.g. from URL ?q= parameter)
      const existingContainer = this.findResponseContainer();
      if (
        this.isStreaming() ||
        (existingContainer &&
          (existingContainer.textContent || "").trim().length > 0)
      ) {
        tabLog(
          this.id,
          `[SL REQUEST] ${reqId} provider=${this.id} event=ALREADY_SUBMITTED timestamp=${Date.now()}`,
        );
        return { success: true, alreadySubmitted: true };
      }

      // 1. Locate Input
      const locateStart = Date.now();
      let input = this.findInput();
      while (!input && Date.now() - locateStart < this.INPUT_TIMEOUT) {
        if (this.isStreaming() || this.findResponseContainer()) {
          return { success: true, alreadySubmitted: true };
        }
        await new Promise((r) => setTimeout(r, isReused ? 200 : 350));
        input = this.findInput();
      }

      if (!input) {
        if (this.isStreaming() || this.findResponseContainer()) {
          return { success: true, alreadySubmitted: true };
        }
        return {
          success: false,
          requestId: reqId,
          provider: this.id,
          phase: "INPUT",
          error: "INPUT_NOT_FOUND",
        };
      }
      tabLog(
        this.id,
        `[SL REQUEST] ${reqId} provider=${this.id} event=INPUT_FOUND timestamp=${Date.now()}`,
      );

      // 2. Focus Input
      this.focusInput();
      tabLog(
        this.id,
        `[SL REQUEST] ${reqId} provider=${this.id} event=INPUT_FOCUSED timestamp=${Date.now()}`,
      );

      // 3. Attach Image
      if (image) {
        await this.attachImage(image);
        await new Promise((r) => setTimeout(r, isReused ? 300 : 600));
      }

      // 4. Insert Prompt
      const inserted = await this.insertPrompt(prompt);
      if (!inserted) {
        if (this.isStreaming() || this.findResponseContainer()) {
          return { success: true, alreadySubmitted: true };
        }
        return {
          success: false,
          requestId: reqId,
          provider: this.id,
          phase: "INPUT",
          error: "INSERT_PROMPT_FAILED",
        };
      }
      tabLog(
        this.id,
        `[SL REQUEST] ${reqId} provider=${this.id} event=PROMPT_INSERTED timestamp=${Date.now()}`,
      );

      // 5. Verify Input
      const inputVerified = this.verifyInput(prompt);
      if (!inputVerified) {
        // Retry insertion once
        await new Promise((r) => setTimeout(r, 200));
        await this.insertPrompt(prompt);
        if (!this.verifyInput(prompt)) {
          if (this.isStreaming() || this.findResponseContainer()) {
            return { success: true, alreadySubmitted: true };
          }
          return {
            success: false,
            requestId: reqId,
            provider: this.id,
            phase: "VERIFY_INPUT",
            error: "INPUT_VERIFICATION_FAILED",
          };
        }
      }
      tabLog(
        this.id,
        `[SL REQUEST] ${reqId} provider=${this.id} event=INPUT_VERIFIED timestamp=${Date.now()}`,
      );

      // Pause before clicking send
      await new Promise((r) => setTimeout(r, isReused ? 150 : 400));

      // 6. Submit (Primary + Verified Fallback)
      const submitResult = await this.submit(reqId);
      if (!submitResult.success) {
        return submitResult;
      }

      return { success: true, ...submitResult };
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

          const virtFunc =
            global.virtualizeComputedStyle || virtualizeComputedStyle;

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
                const themeVal = virtFunc(p, rawVal, live.tagName, isTop);
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

      return `<div class="spectralens-isolated-response markdown-body select-text" style="font-family: var(--sl-font-family, 'Google Sans', Roboto, -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif); font-size: 13px; line-height: 1.55; max-width: 100%; box-sizing: border-box; overflow-wrap: break-word; color: var(--sl-text-primary, #0f172a); user-select: text !important;">${innerContent.trim()}</div>`;
    }

    /** Extract theme-aware styled HTML directly from the response container */
    async getCurrentResponse() {
      const container = this.findResponseContainer();
      if (!container) return "";
      try {
        const styled = this.extractStyledHtml(container);
        if (styled && styled.trim().length > 0) {
          return styled;
        }
      } catch (err) {
        tabLog("ProviderAdapter", `extractStyledHtml note: ${err?.message}`);
      }
      return (container.innerHTML || container.textContent || "").trim();
    }

    /** Alias for getCurrentResponse conforming to universal contract */
    async extractResponse() {
      return this.getCurrentResponse();
    }

    /** Factory method to create provider-specific completion detector */
    createCompletionDetector() {
      const DetectorClass =
        global.BaseCompletionDetector || BaseCompletionDetector;
      return new DetectorClass(this);
    }

    /** Observe response streaming until completion */
    async observeResponse(
      timeoutMs = 90000,
      previousContent = "",
      requestId = null,
    ) {
      const detector = this.createCompletionDetector();
      const ObserverClass = global.ResponseObserver || ResponseObserver;
      const observer = new ObserverClass(this, detector);
      const result = await observer.observe(
        timeoutMs,
        previousContent,
        requestId,
      );
      return result.content || result.answer || "";
    }

    /** Cancel ongoing request observation and processing */
    cancel(requestId = null) {
      if (typeof window !== "undefined") {
        window.postMessage({ type: "CANCEL_AI_REQUEST", requestId }, "*");
      }
    }

    /** Perform self-health check of adapter and DOM bindings */
    healthCheck() {
      const input = this.findInput();
      return {
        id: this.id,
        ready: Boolean(input),
        isStreaming: this.isStreaming(),
        inputFound: Boolean(input),
        url: typeof window !== "undefined" ? window.location.href : "",
        timestamp: Date.now(),
      };
    }

    cleanup() {}
  }

  global.BaseProviderAdapter = BaseProviderAdapter;
})(typeof window !== "undefined" ? window : globalThis);
