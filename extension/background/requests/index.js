/**
 * SpectraLens AI — Background Requests Index
 * Barrel module connecting all background request orchestration modules.
 */
(function (global) {
  "use strict";

  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      REQUEST_STATES: global.REQUEST_STATES,
      PHASE_TIMEOUTS: global.PHASE_TIMEOUTS,
      setRequestState: global.setRequestState,
      getRequestState: global.getRequestState,
      createStructuredError: global.createStructuredError,
      injectMainWorldNetworkInterceptor: global.injectMainWorldNetworkInterceptor,
      healthCheckProviderTab: global.healthCheckProviderTab,
      openOrReuseProviderTab: global.openOrReuseProviderTab,
      cancelAiRequest: global.cancelAiRequest,
      cancelAllAiRequests: global.cancelAllAiRequests,
      closeProviderTab: global.closeProviderTab,
      resetAllProviderSessions: global.resetAllProviderSessions,
      fetchAiAnswer: global.fetchAiAnswer,
      runTabAdapter: global.runTabAdapter,
      getGoogleAiAnswer: global.getGoogleAiAnswer,
      getGrokAnswer: global.getGrokAnswer,
      getPerplexityAnswer: global.getPerplexityAnswer,
      getGeminiAnswer: global.getGeminiAnswer,
      getChatGptAnswer: global.getChatGptAnswer,
      getClaudeAnswer: global.getClaudeAnswer,
    };
  }
})(typeof window !== "undefined" ? window : globalThis);
