/**
 * SpectraLens AI — Perplexity Adapter (perplexity.ai)
 * Composes PerplexitySend and PerplexityTrack modules.
 */
(function (global) {
  "use strict";

  const BaseAdapter = global.BaseProviderAdapter || BaseProviderAdapter;
  const SendModule = global.PerplexitySend || {};
  const TrackModule = global.PerplexityTrack || {};

  class PerplexityAdapter extends BaseAdapter {
    constructor() {
      super("perplexity", "Perplexity", /perplexity\.ai/);
    }

    checkAuthRequired() {
      if (typeof window === "undefined") return false;
      const url = window.location.href || "";
      if (url.includes("/login") || url.includes("/signup")) {
        return true;
      }
      const signinBtn = document.querySelector(
        'button[aria-label="Sign In"], button[aria-label="Sign in"], a[href*="/login"], [data-testid="signin-button"]',
      );
      if (signinBtn && !this.findInput()) return true;
      return false;
    }

    getLoginUrl() {
      return "https://www.perplexity.ai/";
    }

    findInput() {
      return SendModule.findInput ? SendModule.findInput.call(this) : null;
    }

    focusInput() {
      if (SendModule.focusInput) {
        SendModule.focusInput.call(this);
      } else {
        super.focusInput();
      }
    }

    async attachImage(imageDataUrl) {
      return SendModule.attachImage
        ? await SendModule.attachImage.call(this, imageDataUrl)
        : super.attachImage(imageDataUrl);
    }

    async insertPrompt(text) {
      return SendModule.insertPrompt
        ? await SendModule.insertPrompt.call(this, text)
        : false;
    }

    findSendButton() {
      return SendModule.findSendButton
        ? SendModule.findSendButton.call(this)
        : null;
    }

    async executePrimarySubmit() {
      return SendModule.executePrimarySubmit
        ? await SendModule.executePrimarySubmit.call(this)
        : super.executePrimarySubmit();
    }

    async verifySubmission(timeoutMs = 3000) {
      return SendModule.verifySubmission
        ? await SendModule.verifySubmission.call(this, timeoutMs)
        : super.verifySubmission(timeoutMs);
    }

    findResponseContainer() {
      return TrackModule.findResponseContainer
        ? TrackModule.findResponseContainer.call(this)
        : null;
    }

    getJunkSelectors() {
      const specific = TrackModule.getJunkSelectors
        ? TrackModule.getJunkSelectors.call(this)
        : [];
      return [...super.getJunkSelectors(), ...specific];
    }

    createCompletionDetector() {
      const DetectorClass =
        global.PerplexityCompletionDetector || PerplexityCompletionDetector;
      return new DetectorClass(this);
    }

    isStreaming() {
      return TrackModule.isStreaming
        ? TrackModule.isStreaming.call(this)
        : false;
    }

    isComplete() {
      return TrackModule.isComplete
        ? TrackModule.isComplete.call(this)
        : !this.isStreaming() && Boolean(this.findResponseContainer());
    }

    /**
     * Format semicolons inside code blocks for Perplexity:
     * Break statements with ';' onto the next line (;\n) while preserving
     * for (...) loop headers, HTML entities (&amp;, etc.), and existing formatting.
     */
    formatCodeSemicolons(codeStr) {
      if (!codeStr || typeof codeStr !== "string") return codeStr;

      const lines = codeStr.split("\n");
      const formattedLines = [];

      for (const line of lines) {
        let insideForLoop = false;
        let forParenDepth = 0;
        let resultLine = "";
        let i = 0;

        while (i < line.length) {
          // Check for 'for (' or 'for('
          if (line.slice(i).match(/^for\s*\(/)) {
            insideForLoop = true;
            forParenDepth = 1;
            const match = line.slice(i).match(/^for\s*\(/)[0];
            resultLine += match;
            i += match.length;
            continue;
          }

          if (insideForLoop) {
            if (line[i] === "(") {
              forParenDepth++;
            } else if (line[i] === ")") {
              forParenDepth--;
              if (forParenDepth <= 0) {
                insideForLoop = false;
              }
            }
            resultLine += line[i];
            i++;
            continue;
          }

          // Check if ';' is followed by statements/content on the same line
          if (line[i] === ";") {
            const before = resultLine;
            // Check if this is an HTML entity like &amp; &lt; &gt; &quot; &#123;
            const isEntity = /&[a-zA-Z0-9#]+$/.test(before);

            if (!isEntity && i < line.length - 1) {
              const remainder = line.slice(i + 1).trim();
              if (remainder.length > 0) {
                resultLine += ";\n";
                i++;
                // Skip whitespace immediately after semicolon
                while (i < line.length && (line[i] === " " || line[i] === "\t")) {
                  i++;
                }
                continue;
              }
            }
          }

          resultLine += line[i];
          i++;
        }

        formattedLines.push(resultLine);
      }

      return formattedLines.join("\n");
    }

    extractStyledHtml(container) {
      if (!container) return "";
      let html = super.extractStyledHtml(container);

      // Only for Perplexity: Format code blocks so statements with ';' break to next line
      try {
        html = html.replace(
          /<pre\b([^>]*)>([\s\S]*?)<\/pre>/gi,
          (match, attrs, codeInner) => {
            const formatted = this.formatCodeSemicolons(codeInner);
            return `<pre${attrs}>${formatted}</pre>`;
          },
        );
      } catch (err) {
        tabLog("PerplexityAdapter", `formatCodeSemicolons note: ${err?.message}`);
      }

      return html;
    }
  }

  global.PerplexityAdapter = PerplexityAdapter;
})(typeof window !== "undefined" ? window : globalThis);
