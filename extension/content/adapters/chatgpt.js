/**
 * SpectraLens AI — ChatGPT Adapter (chatgpt.com)
 * Composes ChatGPTSend and ChatGPTTrack modules.
 */
(function (global) {
  "use strict";

  const BaseAdapter = global.BaseProviderAdapter || BaseProviderAdapter;
  const SendModule = global.ChatGPTSend || {};
  const TrackModule = global.ChatGPTTrack || {};

  class ChatGPTAdapter extends BaseAdapter {
    constructor() {
      super("chatgpt", "ChatGPT", /chatgpt\.com|chat\.openai\.com/);
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
        global.ChatGPTCompletionDetector || ChatGPTCompletionDetector;
      return new DetectorClass(this);
    }

    isComplete() {
      return TrackModule.isComplete
        ? TrackModule.isComplete.call(this)
        : !this.isStreaming() && Boolean(this.findResponseContainer());
    }
  }

  global.ChatGPTAdapter = ChatGPTAdapter;
})(typeof window !== "undefined" ? window : globalThis);
