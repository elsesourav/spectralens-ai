/**
 * SpectraLens AI — Provider Background Entry Points
 */
(function (global) {
  "use strict";

  const fetchAi = global.fetchAiAnswer || fetchAiAnswer;
  const runAdapter = global.runTabAdapter || runTabAdapter;

  async function getGoogleAiAnswer(q, requestId, image = null) {
    const url = "https://www.google.com/?hl=en";
    console.log(
      `[SpectraLens:Background] 🔍 getGoogleAiAnswer for: "${q.slice(0, 30)}..."${image ? " (with image)" : ""} (requestId: ${requestId})`,
    );

    return fetchAi(
      url,
      runAdapter,
      ["google", q, image],
      requestId,
    );
  }

  async function getGrokAnswer(q, requestId, image = null) {
    const url = `https://grok.com/?q=${encodeURIComponent(q)}`;

    return fetchAi(
      url,
      runAdapter,
      ["grok", q, image],
      requestId,
    );
  }

  async function getPerplexityAnswer(q, requestId, image = null) {
    const url = `https://www.perplexity.ai/search?q=${encodeURIComponent(q)}`;

    return fetchAi(
      url,
      runAdapter,
      ["perplexity", q, image],
      requestId,
    );
  }

  async function getGeminiAnswer(q, requestId, image = null) {
    const url = "https://gemini.google.com/app?hl=en";

    return fetchAi(
      url,
      runAdapter,
      ["gemini", q, image],
      requestId,
    );
  }

  async function getChatGptAnswer(q, requestId, image = null) {
    const url = `https://chatgpt.com/?q=${encodeURIComponent(q)}`;

    return fetchAi(
      url,
      runAdapter,
      ["chatgpt", q, image],
      requestId,
    );
  }

  async function getClaudeAnswer(q, requestId, image = null) {
    const url = "https://claude.ai/new";

    return fetchAi(
      url,
      runAdapter,
      ["claude", q, image],
      requestId,
    );
  }

  global.getGoogleAiAnswer = getGoogleAiAnswer;
  global.getGrokAnswer = getGrokAnswer;
  global.getPerplexityAnswer = getPerplexityAnswer;
  global.getGeminiAnswer = getGeminiAnswer;
  global.getChatGptAnswer = getChatGptAnswer;
  global.getClaudeAnswer = getClaudeAnswer;
})(typeof window !== "undefined" ? window : globalThis);
