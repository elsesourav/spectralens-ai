/**
 * SpectraLens AI — Provider Adapters Index
 * Central barrel module connecting all modular adapter components.
 */
(function (global) {
  "use strict";

  // Re-export all adapter classes and registry
  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
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
  }
})(typeof window !== "undefined" ? window : globalThis);
