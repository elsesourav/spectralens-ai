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
      const now = Date.now();

      // Absolute Network Guard: If active network stream is in progress or chunk arrived recently, never complete
      const isDomActiveStreams =
        typeof document !== "undefined" &&
        document.documentElement &&
        parseInt(
          document.documentElement.getAttribute("data-sl-active-streams") || "0",
          10,
        ) > 0;

      const hasActiveNetworkStream =
        isDomActiveStreams ||
        (tracker && tracker.activeNetworkRequests > 0) ||
        (typeof window !== "undefined" &&
          window.__SPECTRALENS_ACTIVE_NET_REQUESTS__ > 0) ||
        (tracker &&
          tracker.lastNetworkActivityAt &&
          now - tracker.lastNetworkActivityAt < 1200);

      if (hasActiveNetworkStream) {
        return {
          score: 0,
          isComplete: false,
          isStabilizing: false,
          isStreaming: true,
          stableDuration: 0,
        };
      }

      let score = 0;
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

      // Signal E (+35): Provider-specific completion signal
      if (this.checkProviderSpecificSignal(tracker, currentText)) {
        score += 35;
      }

      // Signal F (+40): Network stream completed & no active network requests
      const isNetComplete =
        tracker.isNetworkCompleted ||
        (typeof window !== "undefined" &&
          window.__SPECTRALENS_ACTIVE_NET_REQUESTS__ === 0 &&
          window.__SPECTRALENS_LAST_NET_COMPLETED__ > 0);

      if (isNetComplete && !isStreamingNow && tracker.lastTextLength > 15) {
        score += 40;
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
      const isGenerating = this.adapter.isStreaming();
      const hasSpeechOrCopy = Boolean(
        document.querySelector(
          'button[aria-label*="Read aloud" i], button[data-testid="copy-turn-action-button"], button[aria-label*="Copy" i]',
        ),
      );
      return !isGenerating && hasSpeechOrCopy;
    }
  }

  class ClaudeCompletionDetector extends BaseCompletionDetector {
    checkProviderSpecificSignal(tracker, currentText) {
      const isGenerating = this.adapter.isStreaming();
      const hasArtifactOrCopy = Boolean(
        document.querySelector(
          'button[aria-label*="Copy" i], div[data-testid="artifact-renderer"]',
        ),
      );
      return !isGenerating && hasArtifactOrCopy;
    }
  }

  class GeminiCompletionDetector extends BaseCompletionDetector {
    checkProviderSpecificSignal(tracker, currentText) {
      const isGenerating = this.adapter.isStreaming();
      const hasActions = Boolean(
        document.querySelector(
          'button[aria-label*="Copy" i], button[aria-label*="Good response" i], button[aria-label*="Modify" i]',
        ),
      );
      return !isGenerating && hasActions;
    }
  }

  class GrokCompletionDetector extends BaseCompletionDetector {
    checkProviderSpecificSignal(tracker, currentText) {
      const isGenerating = this.adapter.isStreaming();
      const container = this.adapter.findResponseContainer();
      if (!container) return false;
      const text = (container.textContent || "").trim();
      if (text.length === 0) return false;

      const hasActions = Boolean(
        document.querySelector(
          'button[aria-label*="Copy" i], button[aria-label*="Share" i], button[aria-label*="Regenerate" i], button[aria-label*="Thumbs" i]',
        ) ||
        container.parentElement?.querySelector(
          'button[aria-label*="Copy" i], button[aria-label*="Share" i]',
        )
      );
      return !isGenerating && (hasActions || tracker?.isNetworkCompleted);
    }
  }

  class PerplexityCompletionDetector extends BaseCompletionDetector {
    checkProviderSpecificSignal(tracker, currentText) {
      const isPulsing = this.adapter.isStreaming();
      const hasCopy = Boolean(
        document.querySelector(
          'button[aria-label*="Copy" i], button[aria-label*="Share" i]',
        ),
      );
      return hasCopy && !isPulsing;
    }
  }

  class GoogleAICompletionDetector extends BaseCompletionDetector {
    checkProviderSpecificSignal(tracker, currentText) {
      const isDomActiveStreams =
        typeof document !== "undefined" &&
        document.documentElement &&
        parseInt(
          document.documentElement.getAttribute("data-sl-active-streams") || "0",
          10,
        ) > 0;

      // 1. Guard: If network is active, not completed
      if (
        isDomActiveStreams ||
        (tracker && tracker.activeNetworkRequests > 0) ||
        (typeof window !== "undefined" &&
          window.__SPECTRALENS_ACTIVE_NET_REQUESTS__ > 0)
      ) {
        return false;
      }

      const container = this.adapter.findResponseContainer();
      if (!container) return false;

      const isBusy = this.adapter.isStreaming();
      const hasCompleteFlag = Boolean(
        container.querySelector(
          'div[data-complete="true"], div[jsaction*="aimRenderComplete"], div[data-xid="Gd7Hsc"]',
        )
      );
      const hasLocalCopy = Boolean(
        container.querySelector(
          'button[aria-label="Copy text"].bKxaof, button[aria-label*="Copy text" i], button.bKxaof, button[aria-label*="Copy" i]',
        ) ||
        container.parentElement?.querySelector('button[aria-label*="Copy" i], button.bKxaof')
      );

      return !isBusy && (hasLocalCopy || hasCompleteFlag);
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
