/**
 * SpectraLens AI — Provider Completion Detectors
 */
(function (global) {
  "use strict";

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
      const hasCompleteFlag = Boolean(
        document.querySelector(
          'div[data-complete="true"], div[jsaction*="aimRenderComplete"], div[data-xid="Gd7Hsc"]',
        ),
      );
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
      return (!isBusy && (hasCopy || hasFollowUp || hasSources)) || hasCompleteFlag;
    }
  }

  global.BaseCompletionDetector = BaseCompletionDetector;
  global.ChatGPTCompletionDetector = ChatGPTCompletionDetector;
  global.ClaudeCompletionDetector = ClaudeCompletionDetector;
  global.GeminiCompletionDetector = GeminiCompletionDetector;
  global.GrokCompletionDetector = GrokCompletionDetector;
  global.PerplexityCompletionDetector = PerplexityCompletionDetector;
  global.GoogleAICompletionDetector = GoogleAICompletionDetector;
})(typeof window !== "undefined" ? window : globalThis);
