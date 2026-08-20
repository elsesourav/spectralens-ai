/**
 * SpectraLens AI — Claude Track Script
 * Handles response container locating, progressive markdown extraction, and completion detection for Claude.
 */
(function (global) {
  "use strict";

  const ClaudeTrack = {
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
    },

    isStreaming() {
      return Boolean(
        document.querySelector(
          'div[data-is-streaming="true"], button[aria-label*="Stop" i], button[data-testid="stop-button"], svg.animate-spin, div.animate-pulse, .ant-spin',
        ),
      );
    },

    isComplete() {
      return !this.isStreaming() && Boolean(this.findResponseContainer());
    },

    getJunkSelectors() {
      return [
        ".font-claude-message-actions",
        'button[data-testid="retry-button"]',
        'button[aria-label="Copy Content"]',
        'button[aria-label*="Copy" i]',
        'button[aria-label*="Thumbs" i]',
        'button[aria-label*="Feedback" i]',
        '[data-testid*="action-bar"]',
      ];
    },
  };

  global.ClaudeTrack = ClaudeTrack;
})(typeof window !== "undefined" ? window : globalThis);
