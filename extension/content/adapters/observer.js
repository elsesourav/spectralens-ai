/**
 * SpectraLens AI — Response Observer
 * Manages MutationObserver, live token streaming, and stabilization lifecycle.
 */
(function (global) {
  "use strict";

  class ResponseObserver {
    constructor(adapter, detector) {
      this.adapter = adapter;
      this.detector =
        detector ||
        new (global.BaseCompletionDetector || BaseCompletionDetector)(adapter);
      this.THROTTLE_INTERVAL_MS = 200;
      this.START_TIMEOUT_MS = 15000;
      this.MAX_TIMEOUT_MS = 90000;
    }

    observe(timeoutMs = 90000, previousContent = "", requestId = null) {
      return new Promise(async (resolve) => {
        const TrackerClass = global.ResponseTracker || ResponseTracker;
        const ResponseStates = global.RESPONSE_STATES || RESPONSE_STATES;
        const tracker = new TrackerClass(requestId, this.adapter.id);
        const maxTimeout = timeoutMs || this.MAX_TIMEOUT_MS;
        const initialTurnCount = this.getTurnCount();
        let isFinalized = false;
        let mutationObserver = null;
        let intervalTimer = null;
        let lastEvaluationTime = 0;

        // Cancellation listener
        const cancelListener = (event) => {
          const isMatch =
            event.data?.type === "CANCEL_AI_REQUEST" &&
            (!event.data.requestId ||
              event.data.requestId === tracker.requestId);
          if (isMatch) {
            tabLog(
              this.adapter.id,
              `[SL REQUEST] ${tracker.requestId} provider=${this.adapter.id} event=CANCELLED timestamp=${Date.now()}`,
            );
            clearTimeout(overallTimeoutId);
            finalize(ResponseStates.CANCELLED, "");
          }
        };

        // Network activity & completion listener
        const networkActivityListener = (event) => {
          tracker.lastNetworkActivityAt = Date.now();
          if (event.detail?.activeCount !== undefined) {
            tracker.activeNetworkRequests = event.detail.activeCount;
          }
          evaluate();
        };

        const networkCompletedListener = (event) => {
          tracker.lastNetworkCompletedAt = Date.now();
          tracker.isNetworkCompleted = true;
          if (event.detail?.activeCount !== undefined) {
            tracker.activeNetworkRequests = event.detail.activeCount;
          }
          tabLog(
            this.adapter.id,
            `[SL REQUEST] ${tracker.requestId} provider=${this.adapter.id} event=NETWORK_COMPLETED timestamp=${Date.now()}`,
          );
          evaluate();
        };

        if (typeof window !== "undefined") {
          window.addEventListener("message", cancelListener);
          window.addEventListener(
            "spectralens:network_activity",
            networkActivityListener,
          );
          window.addEventListener(
            "spectralens:network_completed",
            networkCompletedListener,
          );
        }

        const finalize = async (status, responseOverride = null) => {
          if (isFinalized) return;
          isFinalized = true;

          if (typeof window !== "undefined") {
            window.removeEventListener("message", cancelListener);
            window.removeEventListener(
              "spectralens:network_activity",
              networkActivityListener,
            );
            window.removeEventListener(
              "spectralens:network_completed",
              networkCompletedListener,
            );
          }

          if (mutationObserver) {
            mutationObserver.disconnect();
            mutationObserver = null;
          }
          if (intervalTimer) {
            clearInterval(intervalTimer);
            intervalTimer = null;
          }

          tracker.completedAt = Date.now();
          tracker.setState(status);

          let finalMarkdown = "";
          if (responseOverride !== null) {
            finalMarkdown = responseOverride;
          } else {
            finalMarkdown = (await this.adapter.getCurrentResponse()) || "";
          }

          tabLog(
            this.adapter.id,
            `[SL REQUEST] ${tracker.requestId} provider=${this.adapter.id} event=TAB_FINAL_RESPONSE sequence=${tracker.sequence} length=${finalMarkdown.length} timestamp=${Date.now()}`,
          );
          tabLog(
            this.adapter.id,
            `%c[SpectraLens:Observer] ✅ [FINALIZED] Captured ${finalMarkdown.length} chars (status: ${status}) for "${this.adapter.id}"`,
            "color: #10b981; font-weight: bold;",
          );

          resolve({
            status:
              status === ResponseStates.COMPLETED ? "success" : "failure",
            isComplete: status === ResponseStates.COMPLETED,
            content: finalMarkdown,
            answer: finalMarkdown,
            provider: this.adapter.id,
            requestId: tracker.requestId,
            sequence: tracker.sequence,
            completedAt: tracker.completedAt,
          });
        };

        // Safety timeout
        const overallTimeoutId = setTimeout(() => {
          tabLog(
            this.adapter.id,
            `[SL REQUEST] ${tracker.requestId} provider=${this.adapter.id} event=RESPONSE_TIMED_OUT timestamp=${Date.now()}`,
          );
          finalize(ResponseStates.TIMED_OUT);
        }, maxTimeout);

        const evaluate = async () => {
          if (isFinalized) return;
          const now = Date.now();
          if (now - lastEvaluationTime < this.THROTTLE_INTERVAL_MS) return;
          lastEvaluationTime = now;

          const isStreamingNow = this.adapter.isStreaming();
          if (isStreamingNow) {
            tracker.hasSeenStreaming = true;
          }

          const currentTurnCount = this.getTurnCount();
          const container = this.adapter.findResponseContainer();

          if (!container) {
            // Check start timeout if no container appeared
            if (
              now - tracker.startedAt > this.START_TIMEOUT_MS &&
              !tracker.hasSeenStreaming
            ) {
              clearTimeout(overallTimeoutId);
              finalize(ResponseStates.TIMED_OUT);
            }
            return;
          }

          const currentRawText = (container.textContent || "").trim();

          // Multi-turn check: wait for new content
          if (previousContent) {
            const isNewTurn =
              currentTurnCount > initialTurnCount ||
              tracker.hasSeenStreaming;
            if (!isNewTurn || currentRawText === previousContent) {
              return;
            }
          }

          // Record meaningful progress
          const progressMade = tracker.recordProgress(
            currentRawText,
            container,
          );
          if (progressMade) {
            tabLog(
              this.adapter.id,
              `[SL REQUEST] ${tracker.requestId} provider=${this.adapter.id} event=TAB_STREAM_RESPONSE sequence=${tracker.sequence} chars=${tracker.lastTextLength} timestamp=${now}`,
            );
            tabLog(
              this.adapter.id,
              `%c[SpectraLens:Observer] 📝 Live text progress for "${this.adapter.id}": "${currentRawText.slice(-35).replace(/\n/g, " ")}" (chars: ${tracker.lastTextLength}, seq: ${tracker.sequence})`,
              "color: #3b82f6;",
            );
          }

          // Evaluate completion confidence score
          const evaluation = this.detector.evaluate(tracker, currentRawText);

          if (evaluation.isComplete) {
            tabLog(
              this.adapter.id,
              `%c[SpectraLens:Observer] 🏆 Completion confidence verified (${evaluation.score}/100) for "${this.adapter.id}". Finalizing answer...`,
              "color: #10b981; font-weight: bold;",
            );
            clearTimeout(overallTimeoutId);
            finalize(ResponseStates.COMPLETED);
          } else if (evaluation.isStabilizing) {
            tracker.setState(ResponseStates.STABILIZING);
          }
        };

        // 1. Setup MutationObserver on document.body or container
        try {
          const target = document.body;
          if (target) {
            mutationObserver = new MutationObserver(() => {
              evaluate();
            });
            mutationObserver.observe(target, {
              childList: true,
              subtree: true,
              characterData: true,
            });
          }
        } catch (err) {
          tabLog(
            this.adapter.id,
            `MutationObserver setup notice: ${err?.message}`,
          );
        }

        // 2. Periodic polling tick (every 250ms) to ensure time-based stabilization triggers
        intervalTimer = setInterval(() => {
          evaluate();
        }, 250);
      });
    }

    getTurnCount() {
      const container = this.adapter.findResponseContainer();
      if (!container) return 0;
      const turns = document.querySelectorAll(
        '[data-message-author-role="assistant"], [data-testid="assistant-message"], model-response, div.font-claude-message, div[data-scope-id="turn"], div.response-content-markdown',
      );
      return turns.length;
    }
  }

  global.ResponseObserver = ResponseObserver;
})(typeof window !== "undefined" ? window : globalThis);
