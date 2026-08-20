/**
 * SpectraLens AI — Google Search / AI Overview Send Script
 * Handles homepage AI mode button activation, Lens/Image attach, query box insertion, follow-up submit, and verification.
 */
(function (global) {
  "use strict";

  const GoogleSearchSend = {
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
    },

    /** Attach an image to Google search / Google Lens directly */
    async attachImage(imageDataUrl, inputElement = null) {
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
              "📁 Dispatched image file to Google's input[type='file']! Waiting 1s for upload to settle...",
            );
            await new Promise((r) => setTimeout(r, 1000));
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
              "📦 Dispatched DragEvent 'drop' to Google dropzone! Waiting 1s for upload to settle...",
            );
            await new Promise((r) => setTimeout(r, 1000));
            return true;
          } catch (e) {
            tabLog("GoogleTab", "Drop zone dispatch notice:", e?.message);
          }
        }

        // 4. Fallback: Synthetic ClipboardEvent paste onto input
        const input = inputElement || this.findInput();
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
            "GoogleTab",
            "📋 Dispatched synthetic ClipboardEvent paste to search input! Waiting 1s for upload to settle...",
          );
          await new Promise((r) => setTimeout(r, 1000));
          return true;
        }
      } catch (err) {
        tabLog("GoogleTab", "❌ Error in attachImage:", err?.message);
      }
      return false;
    },

    findInput() {
      if (window.location.pathname.startsWith("/search")) {
        const followUp = document.querySelector(
          'textarea.ITIRGe, textarea[placeholder*="Ask anything" i], textarea[aria-label*="Ask a follow up" i]',
        );
        if (followUp) return followUp;
      }
      return document.querySelector(
        'textarea.ITIRGe, textarea[name="q"], input[name="q"], textarea[title="Search"], textarea[aria-label="Search"], [role="combobox"]',
      );
    },

    async insertPrompt(text) {
      // 1. Activate AI Mode first on homepage
      await this.ensureAiMode();

      // 2. Find and populate search / follow-up input
      const input = this.findInput();
      if (!input) return false;
      input.focus();

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
    },

    findSendButton() {
      const selectors = [
        'button.vM789c',
        'button[aria-label="Submit search"]',
        'button[aria-label*="Search" i]',
        'button[aria-label*="Send" i]',
        'button.Tg7LZd',
        'button[jsname="v8b9eb"]',
        'button[jsname="j9hOBf"]',
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
          if (el && el.offsetParent !== null && !el.disabled) return el;
        } catch {}
      }

      return null;
    },

    async executePrimarySubmit() {
      const isSearchPage = window.location.pathname.startsWith("/search");
      const input = this.findInput();

      // Case 1: In-page follow-up conversation turn on /search page
      if (isSearchPage || input?.classList?.contains("ITIRGe")) {
        const sendBtn =
          document.querySelector(
            'button.vM789c, button[aria-label="Submit search"], button[aria-label*="Send" i], button[aria-label*="Search" i], button.Tg7LZd, button[type="submit"], form[role="search"] button',
          ) || this.findSendButton();

        if (sendBtn && !sendBtn.disabled) {
          tabLog("GoogleTab", "🔘 Clicking Google follow-up send button...");
          try {
            sendBtn.click();
            return true;
          } catch (err) {
            tabLog(
              "GoogleTab",
              "Send button click threw, fallback to Enter:",
              err?.message,
            );
          }
        }

        // Try Enter key directly on input
        if (input) {
          tabLog("GoogleTab", "↵ Dispatching Enter key on follow-up input...");
          input.focus();
          const enterEventInit = {
            key: "Enter",
            code: "Enter",
            keyCode: 13,
            which: 13,
            bubbles: true,
            cancelable: true,
          };
          input.dispatchEvent(new KeyboardEvent("keydown", enterEventInit));
          input.dispatchEvent(new KeyboardEvent("keypress", enterEventInit));
          input.dispatchEvent(new KeyboardEvent("keyup", enterEventInit));

          const form = input.closest("form");
          if (form) {
            try {
              if (typeof form.requestSubmit === "function") {
                form.requestSubmit();
              }
            } catch {}
          }
          return true;
        }
        return false;
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
          return true;
        } catch (err) {
          tabLog(
            "GoogleTab",
            "Homepage search button click threw:",
            err?.message,
          );
        }
      }
      return false;
    },

    async executeFallbackSubmit(lastPrompt = "") {
      const isSearchPage = window.location.pathname.startsWith("/search");
      const input = this.findInput();

      if (isSearchPage || input?.classList?.contains("ITIRGe")) {
        if (input) {
          tabLog("GoogleTab", "↵ Dispatching Enter key to follow-up chat box...");
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
          try {
            form.submit();
            return true;
          } catch {}
        }
      }

      if (lastPrompt) {
        tabLog("GoogleTab", "🌐 Navigating directly to AI search results...");
        window.location.href = `https://www.google.com/search?q=${encodeURIComponent(lastPrompt)}&hl=en&udm=50`;
        return true;
      }

      return false;
    },

    async verifySubmission(timeoutMs = 4000, lastPrompt = "") {
      const startTime = Date.now();
      const isSearchPage = window.location.pathname.startsWith("/search");
      const input = this.findInput();
      const initialText = (input?.value || input?.textContent || "").trim();

      while (Date.now() - startTime < timeoutMs) {
        await new Promise((r) => setTimeout(r, 150));

        // Signal 1: Homepage navigated to /search results
        if (!isSearchPage && window.location.pathname.startsWith("/search")) {
          return true;
        }

        // Signal 2: Search follow-up input was cleared
        if (isSearchPage) {
          const currentInput = this.findInput();
          const currentText = (
            currentInput?.value ||
            currentInput?.textContent ||
            ""
          ).trim();
          if (initialText.length > 0 && currentText.length === 0) {
            return true;
          }
        }

        // Signal 3: Assistant streaming active
        const isStreaming = Boolean(
          document.querySelector(
            'div.wDYxhc.UDvLbd, div.Dn7Fzd[aria-busy="true"], div[data-subtree="aimc"][aria-busy="true"], div.animate-pulse, div.FzLjke, span.CkgRle, div[class*="shimmer"], div.loading-container, div[role="progressbar"], div[data-is-streaming="true"], button[aria-label*="Generating" i]',
          ),
        );
        if (isStreaming) {
          return true;
        }
      }

      if (!isSearchPage && lastPrompt) {
        return true;
      }

      return false;
    },
  };

  global.GoogleSearchSend = GoogleSearchSend;
})(typeof window !== "undefined" ? window : globalThis);
