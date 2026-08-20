/**
 * SpectraLens AI — Gemini Track Script
 * Handles response container locating, processing state tracking, and completion detection for Gemini.
 */
(function (global) {
  "use strict";

  const GeminiTrack = {
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
    },

    isStreaming(adapter) {
      if (
        typeof window !== "undefined" &&
        window.__SPECTRALENS_ACTIVE_NET_REQUESTS__ > 0
      ) {
        return true;
      }
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
    },

    isComplete() {
      if (
        typeof window !== "undefined" &&
        window.__SPECTRALENS_ACTIVE_NET_REQUESTS__ > 0
      ) {
        return false;
      }
      const hasCompletedFooter = Boolean(
        document.querySelector(
          "div.response-footer.complete, button[aria-label*='Copy' i]",
        ),
      );
      return (
        (hasCompletedFooter || !this.isStreaming()) &&
        Boolean(this.findResponseContainer())
      );
    },

    getJunkSelectors() {
      return [
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
    },
  };

  global.GeminiTrack = GeminiTrack;
})(typeof window !== "undefined" ? window : globalThis);
