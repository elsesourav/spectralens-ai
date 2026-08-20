/**
 * SpectraLens AI — Claude Adapter (claude.ai)
 * Composes ClaudeSend and ClaudeTrack modules.
 */
(function (global) {
  "use strict";

  const BaseAdapter = global.BaseProviderAdapter || BaseProviderAdapter;
  const SendModule = global.ClaudeSend || {};
  const TrackModule = global.ClaudeTrack || {};

  class ClaudeAdapter extends BaseAdapter {
    constructor() {
      super("claude", "Claude", /claude\.ai/);
    }

    findInput() {
      return SendModule.findInput ? SendModule.findInput.call(this) : null;
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

    isStreaming() {
      return TrackModule.isStreaming
        ? TrackModule.isStreaming.call(this)
        : false;
    }

    createCompletionDetector() {
      const DetectorClass =
        global.ClaudeCompletionDetector || ClaudeCompletionDetector;
      return new DetectorClass(this);
    }

    isComplete() {
      return TrackModule.isComplete
        ? TrackModule.isComplete.call(this)
        : !this.isStreaming() && Boolean(this.findResponseContainer());
    }
  }

  global.ClaudeAdapter = ClaudeAdapter;
})(typeof window !== "undefined" ? window : globalThis);
