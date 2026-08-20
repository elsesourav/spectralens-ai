/**
 * SpectraLens AI — Response Tracker & State Machine
 */
(function (global) {
  "use strict";

  const RESPONSE_STATES = {
    WAITING: "WAITING",
    STARTED: "STARTED",
    STREAMING: "STREAMING",
    STABILIZING: "STABILIZING",
    COMPLETED: "COMPLETED",
    FAILED: "FAILED",
    TIMED_OUT: "TIMED_OUT",
    CANCELLED: "CANCELLED",
  };

  /**
   * Fast 32-bit FNV-1a Hash for normalized text comparison
   */
  function hashNormalizedText(str) {
    if (!str) return 0;
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  /**
   * ResponseTracker: Manages state machine, progress tracking, and text hashing.
   */
  class ResponseTracker {
    constructor(requestId, providerId) {
      this.requestId = requestId || "req_" + Date.now();
      this.providerId = providerId;
      this.state = RESPONSE_STATES.WAITING;
      this.responseNode = null;
      this.lastText = "";
      this.lastTextLength = 0;
      this.lastTextHash = 0;
      this.lastMutationTime = Date.now();
      this.startedAt = Date.now();
      this.lastProgressAt = Date.now();
      this.completedAt = null;
      this.sequence = 0;
      this.hasSeenStreaming = false;
      this.stabilizationStartTime = null;
      this.activeNetworkRequests = 0;
      this.lastNetworkActivityAt = 0;
      this.lastNetworkCompletedAt = 0;
      this.isNetworkCompleted = false;
    }

    setState(newState) {
      if (this.state === newState) return;
      this.state = newState;
    }

    recordProgress(currentText, node = null) {
      const normText = (currentText || "").trim();
      const newHash = hashNormalizedText(normText);
      const now = Date.now();

      if (node) this.responseNode = node;

      if (newHash !== this.lastTextHash && normText.length > 0) {
        if (this.state === RESPONSE_STATES.WAITING) {
          this.setState(RESPONSE_STATES.STARTED);
        } else {
          this.setState(RESPONSE_STATES.STREAMING);
        }
        this.lastText = normText;
        this.lastTextLength = normText.length;
        this.lastTextHash = newHash;
        this.lastProgressAt = now;
        this.lastMutationTime = now;
        this.sequence++;
        this.stabilizationStartTime = null;
        return true; // Meaningful progress occurred
      }

      this.lastMutationTime = now;
      return false; // No meaningful progress
    }
  }

  global.RESPONSE_STATES = RESPONSE_STATES;
  global.hashNormalizedText = hashNormalizedText;
  global.ResponseTracker = ResponseTracker;
})(typeof window !== "undefined" ? window : globalThis);
