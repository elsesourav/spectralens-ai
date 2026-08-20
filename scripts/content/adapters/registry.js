/**
 * SpectraLens AI — Provider Adapter Registry & Error Formatter
 */
(function (global) {
  "use strict";

  const adapters = [
    new (global.ChatGPTAdapter || ChatGPTAdapter)(),
    new (global.ClaudeAdapter || ClaudeAdapter)(),
    new (global.GeminiAdapter || GeminiAdapter)(),
    new (global.GrokAdapter || GrokAdapter)(),
    new (global.PerplexityAdapter || PerplexityAdapter)(),
    new (global.GoogleSearchAdapter || GoogleSearchAdapter)(),
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

  global.ProviderAdapterRegistry = ProviderAdapterRegistry;
  global.formatProviderError = formatProviderError;
})(typeof window !== "undefined" ? window : globalThis);
