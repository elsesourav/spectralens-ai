/**
 * SpectraLens AI — ChatGPT Track Script
 * Handles response container locating, streaming detection, and completion detection for ChatGPT.
 */
(function (global) {
  "use strict";

  const ChatGPTTrack = {
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
    },

    isStreaming() {
      return Boolean(
        document.querySelector(
          'button[data-testid="stop-button"], button[aria-label*="Stop streaming" i], button[aria-label*="Stop generating" i], button[aria-label*="Stop" i], .result-streaming, [data-is-streaming="true"], div[class*="streaming"]',
        ),
      );
    },

    isComplete(adapter) {
      return !this.isStreaming() && Boolean(this.findResponseContainer());
    },

    getJunkSelectors() {
      return [
        'button[data-testid*="turn-action"]',
        'div[data-testid="fruitjuice-send-button"]',
        ".text-xs.text-token-text-tertiary",
        "div.text-center.text-xs",
        'button[aria-label*="Copy" i]',
        'button[aria-label*="Read aloud" i]',
        'button[aria-label*="Good response" i]',
        'button[aria-label*="Bad response" i]',
      ];
    },
  };

  global.ChatGPTTrack = ChatGPTTrack;
})(typeof window !== "undefined" ? window : globalThis);
