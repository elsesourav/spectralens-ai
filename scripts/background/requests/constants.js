/**
 * SpectraLens AI — Background Requests Constants & State Machine
 */
(function (global) {
  "use strict";

  const REQUEST_STATES = {
    IDLE: "IDLE",
    QUEUED: "QUEUED",
    STARTING: "STARTING",
    READY: "READY",
    SENDING: "SENDING",
    SUBMITTED: "SUBMITTED",
    STREAMING: "STREAMING",
    COMPLETED: "COMPLETED",
    FAILED: "FAILED",
    TIMED_OUT: "TIMED_OUT",
    CANCELLED: "CANCELLED",
  };

  const PHASE_TIMEOUTS = {
    TAB_CREATE_TIMEOUT: 15000,
    PAGE_READY_TIMEOUT: 20000,
    INPUT_TIMEOUT: 10000,
    SUBMIT_TIMEOUT: 8000,
    RESPONSE_START_TIMEOUT: 25000,
    RESPONSE_STREAM_TIMEOUT: 90000,
    COMPLETION_TIMEOUT: 120000,
  };

  let activeAiTabs = [];
  const persistentProviderTabs = new Map();
  const activeProviderLocks = new Map();
  const globalRequestTracker = new Map();

  function setRequestState(requestId, providerId, state, phase = null, error = null) {
    if (!requestId) return;
    const current = globalRequestTracker.get(requestId) || {
      requestId,
      providers: {},
      createdAt: Date.now(),
    };
    current.providers[providerId] = {
      state,
      phase,
      error,
      updatedAt: Date.now(),
    };
    globalRequestTracker.set(requestId, current);
    console.log(
      `[SL REQUEST] ${requestId} provider=${providerId} event=${state} phase=${phase || state} timestamp=${Date.now()}`,
    );
  }

  function getRequestState(requestId, providerId) {
    if (!requestId) return null;
    const req = globalRequestTracker.get(requestId);
    return req?.providers?.[providerId] || null;
  }

  function createStructuredError(
    requestId,
    providerId,
    phase,
    errorCode,
    errorMessage,
    retryable = false,
  ) {
    const formatted =
      typeof formatProviderError === "function"
        ? formatProviderError(providerId, errorCode)
        : `> ⚠️ **Please log in to ${providerId || "AI Provider"}**\n>\n> Unable to load response. Make sure you are signed in and have an active session.\n\n*Error: ${errorCode}*`;

    return {
      status: "failure",
      provider: providerId,
      requestId,
      phase,
      errorCode,
      errorMessage,
      retryable,
      answer: formatted,
    };
  }

  global.REQUEST_STATES = REQUEST_STATES;
  global.PHASE_TIMEOUTS = PHASE_TIMEOUTS;
  global.activeAiTabs = activeAiTabs;
  global.persistentProviderTabs = persistentProviderTabs;
  global.activeProviderLocks = activeProviderLocks;
  global.globalRequestTracker = globalRequestTracker;
  global.setRequestState = setRequestState;
  global.getRequestState = getRequestState;
  global.createStructuredError = createStructuredError;
})(typeof window !== "undefined" ? window : globalThis);
