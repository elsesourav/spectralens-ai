/**
 * SpectraLens AI — Provider Adapters Entry Point
 * Lightweight aggregator connecting modular provider adapters.
 */
(function (global) {
  "use strict";

  // When executed in Node.js test environment, load modular adapter files
  if (typeof require !== "undefined" && typeof module !== "undefined") {
    try {
      require("./adapters/tracker.js");
      require("./adapters/detectors.js");
      require("./adapters/observer.js");
      require("./adapters/baseAdapter.js");
      require("./adapters/providers/google/send.js");
      require("./adapters/providers/google/track.js");
      require("./adapters/providers/chatgpt/send.js");
      require("./adapters/providers/chatgpt/track.js");
      require("./adapters/providers/claude/send.js");
      require("./adapters/providers/claude/track.js");
      require("./adapters/providers/gemini/send.js");
      require("./adapters/providers/gemini/track.js");
      require("./adapters/providers/grok/send.js");
      require("./adapters/providers/grok/track.js");
      require("./adapters/providers/perplexity/send.js");
      require("./adapters/providers/perplexity/track.js");
      require("./adapters/google.js");
      require("./adapters/chatgpt.js");
      require("./adapters/claude.js");
      require("./adapters/gemini.js");
      require("./adapters/grok.js");
      require("./adapters/perplexity.js");
      require("./adapters/registry.js");
    } catch {}
  }

  // Export unified adapter namespace
  const exported = {
    RESPONSE_STATES: global.RESPONSE_STATES,
    hashNormalizedText: global.hashNormalizedText,
    ResponseTracker: global.ResponseTracker,
    BaseCompletionDetector: global.BaseCompletionDetector,
    ChatGPTCompletionDetector: global.ChatGPTCompletionDetector,
    ClaudeCompletionDetector: global.ClaudeCompletionDetector,
    GeminiCompletionDetector: global.GeminiCompletionDetector,
    GrokCompletionDetector: global.GrokCompletionDetector,
    PerplexityCompletionDetector: global.PerplexityCompletionDetector,
    GoogleAICompletionDetector: global.GoogleAICompletionDetector,
    ResponseObserver: global.ResponseObserver,
    BaseProviderAdapter: global.BaseProviderAdapter,
    ChatGPTAdapter: global.ChatGPTAdapter,
    ClaudeAdapter: global.ClaudeAdapter,
    GeminiAdapter: global.GeminiAdapter,
    GrokAdapter: global.GrokAdapter,
    PerplexityAdapter: global.PerplexityAdapter,
    GoogleSearchAdapter: global.GoogleSearchAdapter,
    ProviderAdapterRegistry: global.ProviderAdapterRegistry,
    formatProviderError: global.formatProviderError,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = exported;
  }
})(typeof window !== "undefined" ? window : globalThis);
