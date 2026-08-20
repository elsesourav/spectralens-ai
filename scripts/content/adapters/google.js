/**
 * SpectraLens AI — Google Search / AI Overview Adapter (google.com)
 * Composes GoogleSearchSend and GoogleSearchTrack modules.
 */
(function (global) {
  "use strict";

  const BaseAdapter = global.BaseProviderAdapter || BaseProviderAdapter;
  const SendModule = global.GoogleSearchSend || {};
  const TrackModule = global.GoogleSearchTrack || {};

  class GoogleSearchAdapter extends BaseAdapter {
    constructor() {
      super("google", "Google AI Overview", /google\.com/);
    }

    async ensureAiMode() {
      return SendModule.ensureAiMode
        ? await SendModule.ensureAiMode.call(this)
        : false;
    }

    async attachImage(imageDataUrl) {
      return SendModule.attachImage
        ? await SendModule.attachImage.call(this, imageDataUrl, this.findInput())
        : super.attachImage(imageDataUrl);
    }

    findInput() {
      return SendModule.findInput ? SendModule.findInput.call(this) : null;
    }

    async insertPrompt(text) {
      this._lastPrompt = text;
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

    async executeFallbackSubmit() {
      return SendModule.executeFallbackSubmit
        ? await SendModule.executeFallbackSubmit.call(this, this._lastPrompt)
        : super.executeFallbackSubmit();
    }

    async verifySubmission(timeoutMs = 4000) {
      return SendModule.verifySubmission
        ? await SendModule.verifySubmission.call(this, timeoutMs, this._lastPrompt)
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

    isStreaming() {
      return TrackModule.isStreaming
        ? TrackModule.isStreaming.call(this)
        : false;
    }

    createCompletionDetector() {
      const DetectorClass =
        global.GoogleAICompletionDetector || GoogleAICompletionDetector;
      return new DetectorClass(this);
    }

    async observeResponse(
      timeoutMs = 90000,
      previousContent = "",
      requestId = null,
    ) {
      await this.ensureAiMode();
      // Auto expand collapsed AI Overview if "Show more" button is present
      try {
        const expandBtn = document.querySelector(
          'div[data-subtree="aimc"] button[aria-expanded="false"], div.Dn7Fzd button[aria-expanded="false"], button.bN468b',
        );
        if (expandBtn) {
          expandBtn.click();
        }
      } catch {}
      return super.observeResponse(timeoutMs, previousContent, requestId);
    }

    isComplete() {
      return TrackModule.isComplete
        ? TrackModule.isComplete.call(this)
        : !this.isStreaming() && Boolean(this.findResponseContainer());
    }
  }

  global.GoogleSearchAdapter = GoogleSearchAdapter;
})(typeof window !== "undefined" ? window : globalThis);
