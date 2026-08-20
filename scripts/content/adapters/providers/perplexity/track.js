/**
 * SpectraLens AI — Perplexity Track Script
 * Handles response container locating, sources stripping, and completion detection for Perplexity.
 */
(function (global) {
  "use strict";

  const PerplexityTrack = {
    findResponseContainer() {
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

      const allProse = document.querySelectorAll("div.prose, #markdown-content-0");
      if (allProse.length > 0) {
        return allProse[allProse.length - 1];
      }

      return document.querySelector("div.prose, div[dir='auto']");
    },

    isStreaming() {
      return Boolean(
        document.querySelector('button[aria-label*="Stop" i]') ||
        document.querySelector('button[data-testid="stop-button"]') ||
        document.querySelector("svg.animate-spin") ||
        document.querySelector('div[data-testid="loading-indicator"]') ||
        document.querySelector("div.animate-pulse"),
      );
    },

    isComplete() {
      return !this.isStreaming() && Boolean(this.findResponseContainer());
    },

    getJunkSelectors() {
      return [
        'div[data-testid="sources-list"]',
        "div.citation",
        ".related-questions",
        'div[class*="Sources"]',
        'button[aria-label*="Copy" i]',
        'button[aria-label*="Share" i]',
      ];
    },
  };

  global.PerplexityTrack = PerplexityTrack;
})(typeof window !== "undefined" ? window : globalThis);
