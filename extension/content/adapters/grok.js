/**
 * SpectraLens AI — Grok Adapter (grok.com)
 * Composes GrokSend and GrokTrack modules.
 */
(function (global) {
  "use strict";

  const BaseAdapter = global.BaseProviderAdapter || BaseProviderAdapter;
  const SendModule = global.GrokSend || {};
  const TrackModule = global.GrokTrack || {};

  class GrokAdapter extends BaseAdapter {
    constructor() {
      super("grok", "Grok", /grok\.com/);
    }

    checkAuthRequired() {
      if (typeof window === "undefined") return false;
      const url = window.location.href || "";
      const pathname = window.location.pathname || "";
      if (
        pathname.startsWith("/login") ||
        url.includes("/auth") ||
        url.includes("/login")
      ) {
        return true;
      }
      const loginBtn = document.querySelector(
        'a[href*="/login"], a[href*="/auth"], button[aria-label*="Sign in"], button[aria-label*="Log in"]',
      );
      if (loginBtn && !this.findInput()) return true;
      return false;
    }

    getLoginUrl() {
      return "https://grok.com/";
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

    isUserMessageElement(el) {
      return TrackModule.isUserMessageElement
        ? TrackModule.isUserMessageElement(el)
        : false;
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
        global.GrokCompletionDetector || GrokCompletionDetector;
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

  global.GrokAdapter = GrokAdapter;
})(typeof window !== "undefined" ? window : globalThis);
