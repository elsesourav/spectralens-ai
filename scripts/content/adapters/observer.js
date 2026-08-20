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

        const domActiveCount =
          typeof document !== "undefined" && document.documentElement
            ? parseInt(
                document.documentElement.getAttribute("data-sl-active-streams") || "0",
                10,
              )
            : 0;
        if (domActiveCount > 0) {
          tracker.activeNetworkRequests = domActiveCount;
          tracker.lastNetworkActivityAt = Date.now();
        }

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
        const networkChunkListener = (event) => {
          tracker.lastNetworkActivityAt = Date.now();
          const active =
            event.detail?.activeStreams !== undefined
              ? event.detail.activeStreams
              : event.detail?.activeCount;
          if (active !== undefined) {
            tracker.activeNetworkRequests = active;
            if (typeof window !== "undefined") {
              window.__SPECTRALENS_ACTIVE_NET_REQUESTS__ = active;
            }
          }
          evaluate(false);
        };

        const networkActivityListener = (event) => {
          tracker.lastNetworkActivityAt = Date.now();
          const active =
            event.detail?.activeStreams !== undefined
              ? event.detail.activeStreams
              : event.detail?.activeCount;
          if (active !== undefined) {
            tracker.activeNetworkRequests = active;
            if (typeof window !== "undefined") {
              window.__SPECTRALENS_ACTIVE_NET_REQUESTS__ = active;
            }
          }
          evaluate(false);
        };

        const networkCompletedListener = (event) => {
          tracker.lastNetworkCompletedAt = Date.now();
          tracker.isNetworkCompleted = true;
          const active =
            event.detail?.activeStreams !== undefined
              ? event.detail.activeStreams
              : event.detail?.activeCount !== undefined
                ? event.detail.activeCount
                : 0;
          tracker.activeNetworkRequests = active;
          if (typeof window !== "undefined") {
            window.__SPECTRALENS_ACTIVE_NET_REQUESTS__ = active;
            window.__SPECTRALENS_LAST_NET_COMPLETED__ = Date.now();
            window.__SPECTRALENS_NETWORK_COMPLETED__ = true;
          }
          tabLog(
            this.adapter.id,
            `[SL REQUEST] ${tracker.requestId} provider=${this.adapter.id} event=NETWORK_COMPLETED timestamp=${Date.now()}`,
          );
          // Wait for DOM to finish rendering final stream chunks before evaluating
          setTimeout(() => {
            if (!isFinalized) evaluate(true);
          }, 350);
          setTimeout(() => {
            if (!isFinalized) evaluate(true);
          }, 750);
        };

        if (typeof window !== "undefined") {
          window.addEventListener("message", cancelListener);
          window.addEventListener(
            "spectralens:network_chunk",
            networkChunkListener,
          );
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
              "spectralens:network_chunk",
              networkChunkListener,
            );
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
            status: status === ResponseStates.COMPLETED ? "success" : "failure",
            isComplete: status === ResponseStates.COMPLETED,
            content: finalMarkdown,
            answer: finalMarkdown,
            provider: this.adapter.id,
            requestId: tracker.requestId,
            sequence: tracker.sequence,
            completedAt: tracker.completedAt,
          });
        };

        // Safety watchdog timer
        const overallTimeoutId = setTimeout(() => {
          if (!isFinalized) {
            tabLog(
              this.adapter.id,
              `[SL REQUEST] ${tracker.requestId} provider=${this.adapter.id} event=RESPONSE_TIMED_OUT timestamp=${Date.now()}`,
            );
            finalize(
              tracker.lastTextLength > 0
                ? ResponseStates.TIMED_OUT
                : ResponseStates.FAILED,
            );
          }
        }, maxTimeout);

        const evaluate = async (isNetworkDone = false) => {
          if (isFinalized) return;
          const now = Date.now();
          if (
            !isNetworkDone &&
            now - lastEvaluationTime < this.THROTTLE_INTERVAL_MS
          )
            return;
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
              tracker.hasSeenStreaming ||
              currentRawText !== previousContent;
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

          // Strict Network Check: If stream is still receiving chunks, DO NOT finalize!
          const isDomActiveStreams =
            typeof document !== "undefined" &&
            document.documentElement &&
            parseInt(
              document.documentElement.getAttribute("data-sl-active-streams") || "0",
              10,
            ) > 0;

          const hasActiveNetworkStream =
            isDomActiveStreams ||
            (tracker && tracker.activeNetworkRequests > 0) ||
            (typeof window !== "undefined" &&
              window.__SPECTRALENS_ACTIVE_NET_REQUESTS__ > 0) ||
            (tracker &&
              tracker.lastNetworkActivityAt &&
              now - tracker.lastNetworkActivityAt < 1200);

          if (hasActiveNetworkStream) {
            tracker.setState(ResponseStates.STREAMING);
            return;
          }

          // For Google provider: never finalize on the homepage (since it must navigate to /search for AI Mode)
          if (
            this.adapter.id === "google" &&
            typeof window !== "undefined" &&
            !window.location.pathname.startsWith("/search")
          ) {
            return;
          }

          // If network has completed and DOM is no longer streaming, finalize!
          const isNetCompleted = tracker.isNetworkCompleted || isNetworkDone;
          if (isNetCompleted && !isStreamingNow) {
            tabLog(
              this.adapter.id,
              `%c[SpectraLens:Observer] 🏆 Network stream completed for "${this.adapter.id}". Finalizing answer...`,
              "color: #10b981; font-weight: bold;",
            );
            clearTimeout(overallTimeoutId);
            finalize(ResponseStates.COMPLETED);
            return;
          }

          // Fallback evaluation
          const evaluation = this.detector.evaluate(tracker, currentRawText);
          if (
            (evaluation.isComplete ||
              (typeof this.adapter.isComplete === "function" &&
                this.adapter.isComplete())) &&
            !hasActiveNetworkStream
          ) {
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
