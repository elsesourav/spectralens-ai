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

  /** Forward logs to background console only when developer mode is active */
  function tabLog(tag, message, data = null) {
    if (typeof isDevModeActive === "function" && !isDevModeActive()) return;
    console.log(`[SpectraLens:${tag}] ${message}`, data || "");
    try {
      if (
        typeof chrome !== "undefined" &&
        Boolean(chrome?.runtime?.id) &&
        chrome.runtime?.sendMessage
      ) {
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

  /* -------------------------------------------------------------------------- */
  /* Response Tracking & Completion Detection Architecture                      */
  /* -------------------------------------------------------------------------- */

  const RESPONSE_STATES = {
    WAITING: "WAITING",
    STARTED: "STARTED",
    STREAMING: "STREAMING",
    STABILIZING: "STABILIZING",
    COMPLETED: "COMPLETED",
    FAILED: "FAILED",
    TIMED_OUT: "TIMED_OUT",
    CANCELLED: "CANCELLED",
  };

  /**
   * Fast 32-bit FNV-1a Hash for normalized text comparison
   */
  function hashNormalizedText(str) {
    if (!str) return 0;
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  /**
   * ResponseTracker: Manages state machine, progress tracking, and text hashing.
   */
  class ResponseTracker {
    constructor(requestId, providerId) {
      this.requestId = requestId || "req_" + Date.now();
      this.providerId = providerId;
      this.state = RESPONSE_STATES.WAITING;
      this.responseNode = null;
      this.lastText = "";
      this.lastTextLength = 0;
      this.lastTextHash = 0;
      this.lastMutationTime = Date.now();
      this.startedAt = Date.now();
      this.lastProgressAt = Date.now();
      this.completedAt = null;
      this.sequence = 0;
      this.hasSeenStreaming = false;
      this.stabilizationStartTime = null;
      this.activeNetworkRequests = 0;
      this.lastNetworkActivityAt = 0;
      this.lastNetworkCompletedAt = 0;
      this.isNetworkCompleted = false;
    }

    setState(newState) {
      if (this.state === newState) return;
      this.state = newState;
    }

    recordProgress(currentText, node = null) {
      const normText = (currentText || "").trim();
      const newHash = hashNormalizedText(normText);
      const now = Date.now();

      if (node) this.responseNode = node;

      if (newHash !== this.lastTextHash && normText.length > 0) {
        if (this.state === RESPONSE_STATES.WAITING) {
          this.setState(RESPONSE_STATES.STARTED);
        } else {
          this.setState(RESPONSE_STATES.STREAMING);
        }
        this.lastText = normText;
        this.lastTextLength = normText.length;
        this.lastTextHash = newHash;
        this.lastProgressAt = now;
        this.lastMutationTime = now;
        this.sequence++;
        this.stabilizationStartTime = null;
        return true; // Meaningful progress occurred
      }

      this.lastMutationTime = now;
      return false; // No meaningful progress
    }
  }

  /**
   * BaseCompletionDetector: Evaluates multi-signal confidence scoring.
   */
  class BaseCompletionDetector {
    constructor(adapter) {
      this.adapter = adapter;
      this.CONFIDENCE_THRESHOLD = 75;
      this.STABILIZATION_REQUIRED_MS = 750;
    }

    /**
     * Calculates completion confidence score (0 - 100)
     */
    evaluate(tracker, currentText) {
      let score = 0;
      const now = Date.now();
      const isStreamingNow = this.adapter.isStreaming();

      // Signal A (+40): Generation / stop control is absent
      if (!isStreamingNow) {
        score += 40;
      }

      // Signal B (+35 / +25 / +15): Response text & hash have stabilized across window
      const stableDuration = now - tracker.lastProgressAt;
      if (
        stableDuration >= 1500 &&
        tracker.lastTextLength > 20 &&
        !isStreamingNow
      ) {
        score += 35; // Guaranteed completion if text hasn't mutated for 1.5s and stop button is absent
      } else if (
        stableDuration >= this.STABILIZATION_REQUIRED_MS &&
        tracker.lastTextLength > 20
      ) {
        score += 25;
      } else if (stableDuration >= 350 && tracker.lastTextLength > 20) {
        score += 15;
      }

      // Signal C (+15): Send control or input editor is enabled & ready
      const sendControl = this.adapter.findSubmitControl();
      const input = this.adapter.findInput();
      const inputReady =
        input &&
        input.isConnected &&
        !input.disabled &&
        input.getAttribute("contenteditable") !== "false";
      if (
        inputReady ||
        (sendControl && sendControl.isConnected && !sendControl.disabled)
      ) {
        score += 15;
      }

      // Signal D (+10): Response action buttons (copy, feedback, share) rendered
      const copyBtn = this.adapter.findCopyButton();
      if (copyBtn && copyBtn.isConnected) {
        score += 10;
      }

      // Signal E (+10): Provider-specific completion signal
      if (this.checkProviderSpecificSignal(tracker, currentText)) {
        score += 10;
      }

      // Signal F (+35): Network stream completed & no active network requests
      const isNetComplete =
        tracker.isNetworkCompleted ||
        (typeof window !== "undefined" &&
          window.__SPECTRALENS_ACTIVE_NET_REQUESTS__ === 0 &&
          window.__SPECTRALENS_LAST_NET_COMPLETED__ > 0);

      if (isNetComplete && !isStreamingNow && tracker.lastTextLength > 20) {
        score += 35;
      }

      return {
        score,
        isComplete: score >= this.CONFIDENCE_THRESHOLD,
        isStabilizing: score >= 45 && score < this.CONFIDENCE_THRESHOLD,
        isStreaming: score < 45 || isStreamingNow,
        stableDuration,
      };
    }

    checkProviderSpecificSignal(tracker, currentText) {
      return false;
    }
  }

  class ChatGPTCompletionDetector extends BaseCompletionDetector {
    checkProviderSpecificSignal(tracker, currentText) {
      const container = this.adapter.findResponseContainer();
      if (!container) return false;
      const turnArticle = container.closest(
        'article, [data-message-author-role="assistant"]',
      );
      const hasActionBar = Boolean(
        turnArticle?.querySelector(
          'button[aria-label*="Copy" i], button[data-testid*="copy" i], button[aria-label*="Good response" i]',
        ),
      );
      const isResultStreaming = Boolean(
        document.querySelector(".result-streaming, [data-is-streaming='true']"),
      );
      return hasActionBar && !isResultStreaming;
    }
  }

  class ClaudeCompletionDetector extends BaseCompletionDetector {
    checkProviderSpecificSignal(tracker, currentText) {
      const container = this.adapter.findResponseContainer();
      if (!container) return false;
      const turnContainer = container.closest(
        '[data-test-render-count], .font-claude-message, [role="article"]',
      );
      const hasCopyBtn = Boolean(
        turnContainer?.querySelector(
          'button[aria-label*="Copy" i], button[data-testid*="copy" i]',
        ),
      );
      const isStreamingAttr = Boolean(
        document.querySelector(
          'div[data-is-streaming="true"], svg.animate-spin',
        ),
      );
      return hasCopyBtn && !isStreamingAttr;
    }
  }

  class GeminiCompletionDetector extends BaseCompletionDetector {
    checkProviderSpecificSignal(tracker, currentText) {
      const isProgressBarActive = Boolean(
        document.querySelector(
          'mat-progress-bar, mat-spinner, div[role="progressbar"], .mat-mdc-progress-bar',
        ),
      );
      const hasFooter = Boolean(
        document.querySelector(
          "div.response-footer, button[aria-label*='Copy' i], button[aria-label*='Good response' i], div.actions-container",
        ),
      );
      return hasFooter && !isProgressBarActive;
    }
  }

  class GrokCompletionDetector extends BaseCompletionDetector {
    checkProviderSpecificSignal(tracker, currentText) {
      const isThinking = Boolean(
        document.querySelector(
          ".thinking-container, div.thinking-indicator",
        ),
      );
      const hasActions = Boolean(
        document.querySelector(
          'button[aria-label*="Copy" i], button[aria-label*="Share" i]',
        ),
      );
      return hasActions && !isThinking;
    }
  }

  class PerplexityCompletionDetector extends BaseCompletionDetector {
    checkProviderSpecificSignal(tracker, currentText) {
      const isPulsing = Boolean(
        document.querySelector(".animate-pulse, svg.animate-spin"),
      );
      const hasCopy = Boolean(
        document.querySelector(
          'button[aria-label="Copy"], button[aria-label*="Copy" i]:not([aria-label*="query" i])',
        ),
      );
      return hasCopy && !isPulsing;
    }
  }

  class GoogleAICompletionDetector extends BaseCompletionDetector {
    checkProviderSpecificSignal(tracker, currentText) {
      const isBusy = this.adapter.isStreaming();
      const hasCopy = Boolean(
        document.querySelector(
          'button[aria-label="Copy text"].bKxaof, button[aria-label*="Copy text" i], button.bKxaof, button[aria-label*="Copy" i], button[aria-label*="Share" i], button[aria-label*="Feedback" i], button[aria-label*="Helpful" i], button[aria-label*="Thumbs" i]',
        ),
      );
      const hasFollowUp = Boolean(
        document.querySelector(
          'textarea.ITIRGe, textarea[placeholder*="Ask anything" i], textarea[aria-label*="Ask a follow up" i]',
        ),
      );
      const hasSources = Boolean(
        document.querySelector(
          'div.KkW2ib, div[data-subtree="aimc"] a[href], div[data-container-id="main-col"] a[href], div.kno-ftr',
        ),
      );
      return !isBusy && (hasCopy || hasFollowUp || hasSources);
    }
  }

  /**
   * ResponseObserver: Manages MutationObserver and stabilization interval.
   */
  class ResponseObserver {
    constructor(adapter, detector) {
      this.adapter = adapter;
      this.detector = detector || new BaseCompletionDetector(adapter);
      this.THROTTLE_INTERVAL_MS = 200;
      this.START_TIMEOUT_MS = 15000;
      this.MAX_TIMEOUT_MS = 90000;
    }

    observe(timeoutMs = 90000, previousContent = "", requestId = null) {
      return new Promise(async (resolve) => {
        const tracker = new ResponseTracker(requestId, this.adapter.id);
        const maxTimeout = timeoutMs || this.MAX_TIMEOUT_MS;
        const initialTurnCount = this.getTurnCount();
        let isFinalized = false;
        let mutationObserver = null;
        let intervalTimer = null;
        let lastEvaluationTime = 0;

        // Cancellation listener
        const cancelListener = (event) => {
          const isMatch =
            event.data?.type === "CANCEL_AI_REQUEST" &&
            (!event.data.requestId ||
              event.data.requestId === tracker.requestId);
          if (isMatch) {
            tabLog(
              this.adapter.id,
              `[SL REQUEST] ${tracker.requestId} provider=${this.adapter.id} event=CANCELLED timestamp=${Date.now()}`,
            );
            clearTimeout(overallTimeoutId);
            finalize(RESPONSE_STATES.CANCELLED, "");
          }
        };

        // Network activity & completion listener
        const networkActivityListener = (event) => {
          tracker.lastNetworkActivityAt = Date.now();
          if (event.detail?.activeCount !== undefined) {
            tracker.activeNetworkRequests = event.detail.activeCount;
          }
          evaluate();
        };

        const networkCompletedListener = (event) => {
          tracker.lastNetworkCompletedAt = Date.now();
          tracker.isNetworkCompleted = true;
          if (event.detail?.activeCount !== undefined) {
            tracker.activeNetworkRequests = event.detail.activeCount;
          }
          tabLog(
            this.adapter.id,
            `[SL REQUEST] ${tracker.requestId} provider=${this.adapter.id} event=NETWORK_COMPLETED timestamp=${Date.now()}`,
          );
          evaluate();
        };

        if (typeof window !== "undefined") {
          window.addEventListener("message", cancelListener);
          window.addEventListener(
            "spectralens:network_activity",
            networkActivityListener,
          );
          window.addEventListener(
            "spectralens:network_completed",
            networkCompletedListener,
          );
        }

        const finalize = async (status, responseOverride = null) => {
          if (isFinalized) return;
          isFinalized = true;

          if (typeof window !== "undefined") {
            window.removeEventListener("message", cancelListener);
            window.removeEventListener(
              "spectralens:network_activity",
              networkActivityListener,
            );
            window.removeEventListener(
              "spectralens:network_completed",
              networkCompletedListener,
            );
          }

          if (mutationObserver) {
            mutationObserver.disconnect();
            mutationObserver = null;
          }
          if (intervalTimer) {
            clearInterval(intervalTimer);
            intervalTimer = null;
          }

          tracker.completedAt = Date.now();
          tracker.setState(status);

          let finalMarkdown = "";
          if (responseOverride !== null) {
            finalMarkdown = responseOverride;
          } else {
            finalMarkdown = (await this.adapter.getCurrentResponse()) || "";
          }

          tabLog(
            this.adapter.id,
            `[SL REQUEST] ${tracker.requestId} provider=${this.adapter.id} event=TAB_FINAL_RESPONSE sequence=${tracker.sequence} length=${finalMarkdown.length} timestamp=${Date.now()}`,
          );

          resolve({
            status:
              status === RESPONSE_STATES.COMPLETED ? "success" : "failure",
            isComplete: status === RESPONSE_STATES.COMPLETED,
            content: finalMarkdown,
            answer: finalMarkdown,
            provider: this.adapter.id,
            requestId: tracker.requestId,
            sequence: tracker.sequence,
            completedAt: tracker.completedAt,
          });
        };

        // Safety timeout
        const overallTimeoutId = setTimeout(() => {
          tabLog(
            this.adapter.id,
            `[SL REQUEST] ${tracker.requestId} provider=${this.adapter.id} event=RESPONSE_TIMED_OUT timestamp=${Date.now()}`,
          );
          finalize(RESPONSE_STATES.TIMED_OUT);
        }, maxTimeout);

        const evaluate = async () => {
          if (isFinalized) return;
          const now = Date.now();
          if (now - lastEvaluationTime < this.THROTTLE_INTERVAL_MS) return;
          lastEvaluationTime = now;

          const isStreamingNow = this.adapter.isStreaming();
          if (isStreamingNow) {
            tracker.hasSeenStreaming = true;
          }

          const currentTurnCount = this.getTurnCount();
          const container = this.adapter.findResponseContainer();

          if (!container) {
            // Check start timeout if no container appeared
            if (
              now - tracker.startedAt > this.START_TIMEOUT_MS &&
              !tracker.hasSeenStreaming
            ) {
              clearTimeout(overallTimeoutId);
              finalize(RESPONSE_STATES.TIMED_OUT);
            }
            return;
          }

          const currentRawText = (container.textContent || "").trim();

          // Multi-turn check: wait for new content
          if (previousContent) {
            const isNewTurn =
              currentTurnCount > initialTurnCount ||
              tracker.hasSeenStreaming;
            if (!isNewTurn || currentRawText === previousContent) {
              return;
            }
          }

          // Record meaningful progress
          const progressMade = tracker.recordProgress(
            currentRawText,
            container,
          );
          if (progressMade) {
            tabLog(
              this.adapter.id,
              `[SL REQUEST] ${tracker.requestId} provider=${this.adapter.id} event=TAB_STREAM_RESPONSE sequence=${tracker.sequence} chars=${tracker.lastTextLength} timestamp=${now}`,
            );
          }

          // Evaluate completion confidence score
          const evaluation = this.detector.evaluate(tracker, currentRawText);

          if (evaluation.isComplete) {
            clearTimeout(overallTimeoutId);
            finalize(RESPONSE_STATES.COMPLETED);
          } else if (evaluation.isStabilizing) {
            tracker.setState(RESPONSE_STATES.STABILIZING);
          }
        };

        // 1. Setup MutationObserver on document.body or container
        try {
          const target = document.body;
          if (target) {
            mutationObserver = new MutationObserver(() => {
              evaluate();
            });
            mutationObserver.observe(target, {
              childList: true,
              subtree: true,
              characterData: true,
            });
          }
        } catch (err) {
          tabLog(
            this.adapter.id,
            `MutationObserver setup notice: ${err?.message}`,
          );
        }

        // 2. Periodic polling tick (every 250ms) to ensure time-based stabilization triggers
        intervalTimer = setInterval(() => {
          evaluate();
        }, 250);
      });
    }

    getTurnCount() {
      const container = this.adapter.findResponseContainer();
      if (!container) return 0;
      const turns = document.querySelectorAll(
        '[data-message-author-role="assistant"], [data-testid="assistant-message"], model-response, div.font-claude-message, div[data-scope-id="turn"], div.response-content-markdown',
      );
      return turns.length;
    }
  }

  /**
   * Abstract Base Provider Adapter
   */
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
      return new BaseCompletionDetector(this);
    }

    /** Observe response streaming until completion */
    async observeResponse(
      timeoutMs = 90000,
      previousContent = "",
      requestId = null,
    ) {
      const detector = this.createCompletionDetector();
      const observer = new ResponseObserver(this, detector);
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

  /* -------------------------------------------------------------------------- */
  /* 1. ChatGPT Adapter (chatgpt.com)                                           */
  /* -------------------------------------------------------------------------- */
  class ChatGPTAdapter extends BaseProviderAdapter {
    constructor() {
      super("chatgpt", "ChatGPT", /chatgpt\.com|chat\.openai\.com/);
    }

    findInput() {
      return document.querySelector(
        '#prompt-textarea, div[role="textbox"][aria-label*="ChatGPT" i], div[role="textbox"], textarea[data-id="root"], div.ProseMirror[contenteditable="true"], div[contenteditable="true"]',
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
        if (this.isStreaming()) {
          return true;
        }
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

    isStreaming() {
      return Boolean(
        document.querySelector(
          'button[data-testid="stop-button"], button[aria-label*="Stop streaming" i], button[aria-label*="Stop generating" i], button[aria-label*="Stop" i], .result-streaming, [data-is-streaming="true"], div[class*="streaming"]'
        )
      );
    }

    createCompletionDetector() {
      return new ChatGPTCompletionDetector(this);
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
      return new ClaudeCompletionDetector(this);
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

    createCompletionDetector() {
      return new GeminiCompletionDetector(this);
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
        'div[role="textbox"], textarea[placeholder*="Ask" i], textarea[placeholder*="anything" i], textarea[placeholder*="Grok" i], textarea, main div.ProseMirror, div[contenteditable="true"]',
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
    }

    findSendButton() {
      return document.querySelector(
        'button[aria-label*="Send" i], button[type="submit"], button.bg-highlight, div[role="button"][aria-label*="Send" i]',
      );
    }

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

        // Signal 3: Streaming started or response container ready
        if (this.isStreaming() || Boolean(this.findResponseContainer())) {
          return true;
        }
      }
      return false;
    }

    findResponseContainer() {
      const selectors = [
        '[data-testid="assistant-message"]',
        'div.response-content-markdown',
        'div.markdown',
        'main #last-reply-container',
        'div.message-bubble',
        'div[dir="auto"]',
        'main div[class*="message"]',
        'div[class*="bubble"]',
      ];
      const messages = document.querySelectorAll(selectors.join(", "));
      if (messages.length > 0) {
        for (let i = messages.length - 1; i >= 0; i--) {
          const msg = messages[i];
          if (
            msg.closest('[data-testid="user-message"]') ||
            msg.classList.contains("user-message") ||
            msg.closest(".user-message")
          ) {
            continue;
          }
          const text = (msg.textContent || "").trim();
          if (text.length > 5) {
            return (
              msg.querySelector(
                "div.markdown, div.response-content-markdown, [dir='auto']",
              ) || msg
            );
          }
        }
        return messages[messages.length - 1];
      }
      return document.querySelector(
        "main #last-reply-container > div:nth-child(2) > div > [dir='auto'], main div[dir='auto']",
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

    createCompletionDetector() {
      return new GrokCompletionDetector(this);
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
        'div#ask-input, textarea#ask-input, div[data-lexical-editor="true"], textarea[placeholder*="Ask" i], textarea[placeholder*="follow-up" i], textarea[placeholder*="anything" i], textarea[placeholder*="search" i], textarea.overflow-hidden, div[role="textbox"]',
      );
    }

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
      await new Promise((r) => setTimeout(r, 60));

      if (input.tagName.toLowerCase() === "textarea") {
        input.value = text;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      } else {
        // ContentEditable / Lexical Editor (#ask-input)
        input.focus();

        // 1. Clear content by selecting all and deleting
        try {
          document.execCommand("selectAll", false, null);
          document.execCommand("delete", false, null);
        } catch {}

        // Fallback clear if DOM nodes remained
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

        // 2. Insert text using execCommand("insertText") - single dispatch
        let inserted = false;
        try {
          inserted = document.execCommand("insertText", false, text);
        } catch {}

        // 3. Fallback only if execCommand did not insert text
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

        // 4. Notify React with standard bubbling Events
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }

      await new Promise((r) => setTimeout(r, 100));
      return Boolean((input.textContent || input.value || "").trim().length > 0);
    }

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
    }

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
    }

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
        if (this.isStreaming()) {
          return true;
        }
      }
      return false;
    }

    findResponseContainer() {
      // 1. Find all individual, innermost prose blocks and return strictly the LAST one
      const proseContainers = document.querySelectorAll(
        "div[dir='auto'].prose, div.prose:not(:has(div.prose)), div[data-testid='answer-content']",
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

      // 2. Fallback: all prose containers
      const allProse = document.querySelectorAll("div.prose, #markdown-content-0");
      if (allProse.length > 0) {
        return allProse[allProse.length - 1];
      }

      return document.querySelector("div.prose, div[dir='auto']");
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

    createCompletionDetector() {
      return new PerplexityCompletionDetector(this);
    }

    isStreaming() {
      return Boolean(
        document.querySelector('button[aria-label*="Stop" i]') ||
        document.querySelector('button[data-testid="stop-button"]') ||
        document.querySelector("svg.animate-spin") ||
        document.querySelector('div[data-testid="loading-indicator"]') ||
        document.querySelector("div.animate-pulse"),
      );
    }

    isComplete() {
      return !this.isStreaming() && Boolean(this.findResponseContainer());
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

    async executePrimarySubmit() {
      const isSearchPage = window.location.pathname.startsWith("/search");
      const input = this.findInput();

      // Case 1: In-page follow-up conversation turn on /search page
      if (isSearchPage || input?.classList?.contains("ITIRGe")) {
        const sendBtn =
          document.querySelector(
            'button[aria-label*="Send" i], button[aria-label*="Search" i], button[type="submit"]',
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
    }

    async executeFallbackSubmit() {
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
          return true;
        }
        return false;
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

      if (this._lastPrompt) {
        tabLog("GoogleTab", "🌐 Navigating directly to AI search results...");
        window.location.href = `https://www.google.com/search?q=${encodeURIComponent(this._lastPrompt)}&hl=en&udm=50`;
        return true;
      }

      return false;
    }

    async verifySubmission(timeoutMs = 4000) {
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
        if (this.isStreaming()) {
          return true;
        }
      }

      // If we are on homepage and triggered search navigation, return true
      if (!isSearchPage && this._lastPrompt) {
        return true;
      }

      return false;
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

    isStreaming() {
      return Boolean(
        document.querySelector(
          'div.wDYxhc.UDvLbd, div.Dn7Fzd[aria-busy="true"], div[data-subtree="aimc"][aria-busy="true"], div.animate-pulse, div.FzLjke, span.CkgRle, div[class*="shimmer"], div.loading-container, div[role="progressbar"], div[data-is-streaming="true"], button[aria-label*="Generating" i]',
        ),
      );
    }

    createCompletionDetector() {
      return new GoogleAICompletionDetector(this);
    }

    async observeResponse(
      timeoutMs = 90000,
      previousContent = "",
      requestId = null,
    ) {
      await this.ensureAiMode();
      // Auto expand collapsed AI Overview if "Show more" button is present
      try {
        const expandBtn = document.querySelector(
          'div[data-subtree="aimc"] button[aria-expanded="false"], div.Dn7Fzd button[aria-expanded="false"], button.bN468b',
        );
        if (expandBtn) {
          expandBtn.click();
        }
      } catch {}
      return super.observeResponse(timeoutMs, previousContent, requestId);
    }

    isComplete() {
      const container = this.findResponseContainer();
      if (!container) return false;
      const text = (container.textContent || "").trim();
      return !this.isStreaming() && text.length > 25;
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
  global.RESPONSE_STATES = RESPONSE_STATES;
  global.hashNormalizedText = hashNormalizedText;
  global.ResponseTracker = ResponseTracker;
  global.BaseCompletionDetector = BaseCompletionDetector;
  global.ChatGPTCompletionDetector = ChatGPTCompletionDetector;
  global.ClaudeCompletionDetector = ClaudeCompletionDetector;
  global.GeminiCompletionDetector = GeminiCompletionDetector;
  global.GrokCompletionDetector = GrokCompletionDetector;
  global.PerplexityCompletionDetector = PerplexityCompletionDetector;
  global.GoogleAICompletionDetector = GoogleAICompletionDetector;
  global.ResponseObserver = ResponseObserver;
  global.formatProviderError = formatProviderError;
  global.BaseProviderAdapter = BaseProviderAdapter;
  global.ChatGPTAdapter = ChatGPTAdapter;
  global.ClaudeAdapter = ClaudeAdapter;
  global.GeminiAdapter = GeminiAdapter;
  global.GrokAdapter = GrokAdapter;
  global.PerplexityAdapter = PerplexityAdapter;
  global.GoogleSearchAdapter = GoogleSearchAdapter;
  global.ProviderAdapterRegistry = ProviderAdapterRegistry;
})(typeof window !== "undefined" ? window : globalThis);
