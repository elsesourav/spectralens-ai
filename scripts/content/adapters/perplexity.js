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
  }

  global.PerplexityAdapter = PerplexityAdapter;
})(typeof window !== "undefined" ? window : globalThis);
