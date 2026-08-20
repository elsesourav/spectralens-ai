/**
 * SpectraLens AI — Grok Track Script
 * Handles response container locating, thinking state detection, and completion detection for Grok.
 */
(function (global) {
  "use strict";

  const GrokTrack = {
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
    },

    isStreaming() {
      return Boolean(
        document.querySelector(
          "main #last-reply-container .thinking-container, div.thinking-indicator",
        ),
      );
    },

    isComplete() {
      return !this.isStreaming() && Boolean(this.findResponseContainer());
    },

    getJunkSelectors() {
      return [
        'button[aria-label*="Copy" i]',
        'button[aria-label*="Share" i]',
        'button[aria-label*="Like" i]',
        'button[aria-label*="Dislike" i]',
      ];
    },
  };

  global.GrokTrack = GrokTrack;
})(typeof window !== "undefined" ? window : globalThis);
