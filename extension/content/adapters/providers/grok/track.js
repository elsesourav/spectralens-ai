/**
 * SpectraLens AI — Grok Track Script
 * Handles response container locating, thinking state detection, and completion detection for Grok.
 */
(function (global) {
  "use strict";

  function isUserMessageElement(el) {
    if (!el) return false;
    if (
      el.closest('[data-testid="user-message"]') ||
      el.closest('[data-testid*="user"]') ||
      el.classList?.contains("user-message") ||
      el.closest(".user-message")
    ) {
      return true;
    }
    // Grok layout: user messages are right-aligned (items-end, justify-end, self-end, ml-auto)
    if (
      el.closest('[class*="items-end"]') ||
      el.closest('[class*="justify-end"]') ||
      el.closest('[class*="self-end"]') ||
      el.closest('[class*="ml-auto"]') ||
      el.closest('[class*="bg-surface-elevated"]')
    ) {
      return true;
    }
    // User message blocks often have an Edit button
    if (
      el.closest("div")?.querySelector('button[aria-label*="Edit" i], button[aria-label*="Pencil" i]')
    ) {
      return true;
    }
    return false;
  }

  const GrokTrack = {
    isUserMessageElement,

    findResponseContainer() {
      // 1. Direct assistant-specific selectors
      const assistantSelectors = [
        '[data-testid="assistant-message"]',
        '[data-testid*="bot-message"]',
        '[data-testid*="message-assistant"]',
        'main div[class*="assistant"] div.response-content-markdown',
        'main div[class*="assistant"] div.chat-md',
        'main div[class*="assistant"] div.markdown',
        'main #last-reply-container',
        'div[class*="items-start"] div.response-content-markdown',
        'div[class*="items-start"] div.chat-md',
        'div[class*="items-start"] div.markdown',
        'div[class*="justify-start"] div.response-content-markdown',
        'div[class*="justify-start"] div.chat-md',
        'div[class*="justify-start"] div.markdown',
      ];

      for (const sel of assistantSelectors) {
        const nodes = document.querySelectorAll(sel);
        if (nodes.length > 0) {
          for (let i = nodes.length - 1; i >= 0; i--) {
            const n = nodes[i];
            if (isUserMessageElement(n)) continue;
            const target =
              n.querySelector(
                "div.response-content-markdown, div.chat-md, div.markdown, [dir='auto']",
              ) || n;
            return target;
          }
        }
      }

      // 2. Locate via action buttons (Copy, Share, Thumbs) which are unique to Grok's assistant responses
      const actionButtons = document.querySelectorAll(
        'button[aria-label*="Copy" i], button[aria-label*="Share" i], button[aria-label*="Regenerate" i], button[aria-label*="Thumbs" i]',
      );
      if (actionButtons.length > 0) {
        for (let i = actionButtons.length - 1; i >= 0; i--) {
          const btn = actionButtons[i];
          const parentCard =
            btn.closest(
              'div[class*="message"], div[class*="bubble"], div.relative, div[class*="items-start"], div[class*="justify-start"]',
            ) || btn.parentElement?.parentElement;
          if (parentCard) {
            const markdown = parentCard.querySelector(
              "div.response-content-markdown, div.chat-md, div.markdown, [dir='auto']",
            );
            if (markdown && !isUserMessageElement(markdown)) {
              return markdown;
            }
          }
        }
      }

      // 3. Fallback: all markdown containers, strictly excluding user elements
      const allMarkdown = document.querySelectorAll(
        "main div.response-content-markdown, main div.chat-md, main div.markdown, div.response-content-markdown, div.chat-md",
      );
      if (allMarkdown.length > 0) {
        for (let i = allMarkdown.length - 1; i >= 0; i--) {
          const md = allMarkdown[i];
          if (isUserMessageElement(md)) continue;
          return md;
        }
      }

      return null;
    },

    isStreaming() {
      const isDomActive =
        typeof document !== "undefined" &&
        document.documentElement &&
        parseInt(
          document.documentElement.getAttribute("data-sl-active-streams") || "0",
          10,
        ) > 0;
      if (
        isDomActive ||
        (typeof window !== "undefined" &&
          window.__SPECTRALENS_ACTIVE_NET_REQUESTS__ > 0)
      ) {
        return true;
      }
      return Boolean(
        document.querySelector(
          'button[aria-label*="Stop" i], main #last-reply-container .thinking-container, div.thinking-indicator, svg.animate-spin',
        ),
      );
    },

    isComplete() {
      const isDomActive =
        typeof document !== "undefined" &&
        document.documentElement &&
        parseInt(
          document.documentElement.getAttribute("data-sl-active-streams") || "0",
          10,
        ) > 0;
      if (
        isDomActive ||
        (typeof window !== "undefined" &&
          window.__SPECTRALENS_ACTIVE_NET_REQUESTS__ > 0)
      ) {
        return false;
      }
      const hasStop = Boolean(
        document.querySelector(
          'button[aria-label*="Stop" i], svg.animate-spin',
        ),
      );
      const container =
        (this && typeof this.findResponseContainer === "function")
          ? this.findResponseContainer()
          : GrokTrack.findResponseContainer();
      const text = (container?.textContent || "").trim();
      return !hasStop && Boolean(container) && text.length > 0;
    },

    getJunkSelectors() {
      return [
        'button[aria-label*="Copy" i]',
        'button[aria-label*="Share" i]',
        'button[aria-label*="Like" i]',
        'button[aria-label*="Dislike" i]',
        'button[aria-label*="Regenerate" i]',
        'button[aria-label*="Thumbs" i]',
      ];
    },
  };

  global.GrokTrack = GrokTrack;
})(typeof window !== "undefined" ? window : globalThis);
