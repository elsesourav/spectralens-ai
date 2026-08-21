/**
 * SpectraLens AI — Unified Request AI Service & Tab Pipeline
 * Provides RequestAiService class with common lifecycle methods and dedicated per-provider methods.
 */
(function (global) {
  "use strict";

  /* --- Request State Model & Phase Timeouts --- */
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
    TAB_CREATE_TIMEOUT: 10000,
    PAGE_READY_TIMEOUT: 15000,
    INPUT_TIMEOUT: 10000,
    SUBMIT_TIMEOUT: 5000,
    RESPONSE_START_TIMEOUT: 15000,
    RESPONSE_STREAM_TIMEOUT: 60000,
    COMPLETION_TIMEOUT: 90000,
  };

  class RequestAiService {
    constructor() {
      this.REQUEST_STATES = REQUEST_STATES;
      this.PHASE_TIMEOUTS = PHASE_TIMEOUTS;
      this.requestStateModel = new Map();
      this.activeProviderLocks = new Map();
      this.persistentProviderTabs = new Map();
      this.activeAiTabs = [];
      this.workerWindowId = null;
      this.workerWindowPromise = null;
      this.currentRequestId = null;

      this.initWindowListeners();
    }

    initWindowListeners() {
      if (typeof chrome !== "undefined" && chrome.windows?.onRemoved) {
        chrome.windows.onRemoved.addListener((removedWinId) => {
          if (removedWinId === this.workerWindowId) {
            console.log(
              `[SpectraLens:Pipeline] 🪟 Background Worker Window #${removedWinId} was closed.`,
            );
            this.workerWindowId = null;
            this.workerWindowPromise = null;
            this.persistentProviderTabs.clear();
            this.activeAiTabs = [];
            this.activeProviderLocks.clear();
          }
        });
      }

      if (typeof chrome !== "undefined" && chrome.tabs?.onRemoved) {
        chrome.tabs.onRemoved.addListener((removedTabId) => {
          this.activeAiTabs = this.activeAiTabs.filter(
            (id) => id !== removedTabId,
          );
          for (const [
            providerId,
            entry,
          ] of this.persistentProviderTabs.entries()) {
            if (entry.tabId === removedTabId) {
              console.log(
                `[SpectraLens:Pipeline] 🚪 Provider Tab for "${providerId}" (#${removedTabId}) closed.`,
              );
              this.persistentProviderTabs.delete(providerId);
              this.activeProviderLocks.delete(providerId);
            }
          }
        });
      }
    }

    /* --- Common Lifecycle & Utility Methods --- */

    setRequestState(
      requestId,
      providerId,
      status,
      phase = null,
      metadata = {},
    ) {
      if (!requestId || !providerId) return;
      const key = `${requestId}:${providerId.toLowerCase()}`;
      const now = Date.now();
      const existing = this.requestStateModel.get(key);
      const state = existing
        ? {
            ...existing,
            status,
            phase: phase || existing.phase,
            updatedAt: now,
            ...metadata,
          }
        : {
            requestId,
            providerId: providerId.toLowerCase(),
            status,
            phase: phase || null,
            createdAt: now,
            updatedAt: now,
            ...metadata,
          };
      this.requestStateModel.set(key, state);
      const phaseStr = phase ? ` phase=${phase}` : "";
      console.log(
        `[SL REQUEST] ${requestId} provider=${providerId.toLowerCase()} event=${status}${phaseStr} timestamp=${now}`,
      );
      return state;
    }

    getRequestState(requestId, providerId) {
      if (!requestId || !providerId) return null;
      return (
        this.requestStateModel.get(
          `${requestId}:${providerId.toLowerCase()}`,
        ) || null
      );
    }

    createStructuredError(
      requestId,
      providerId,
      phase,
      errorCode,
      message,
      recoverable = false,
    ) {
      const normProv = (providerId || "").toLowerCase();
      const errorObj = {
        status: "failure",
        requestId,
        provider: normProv,
        phase,
        errorCode,
        message: message || "Provider request failed",
        timestamp: Date.now(),
        recoverable,
        answer:
          typeof formatProviderError === "function"
            ? formatProviderError(normProv, message || errorCode)
            : `> ⚠️ **Please log in to ${normProv}**\n>\n> Unable to load response.\n\n*Error: ${message || errorCode}*`,
      };
      console.log(
        `[SL REQUEST] ${requestId} provider=${normProv} event=FAILURE phase=${phase} errorCode=${errorCode} recoverable=${recoverable} timestamp=${Date.now()}`,
      );
      return errorObj;
    }

    async healthCheckProviderTab(providerId, targetUrl) {
      const normKey = (providerId || "").toLowerCase();
      const entry = this.persistentProviderTabs.get(normKey);
      if (!entry || !entry.tabId) return { healthy: false, reason: "NO_ENTRY" };

      try {
        if (typeof chrome === "undefined" || !chrome.tabs?.get) {
          return {
            healthy: true,
            tab: { id: entry.tabId, windowId: entry.windowId },
          };
        }

        const tab = await chrome.tabs.get(entry.tabId);
        if (!tab || !tab.id) {
          this.persistentProviderTabs.delete(normKey);
          return { healthy: false, reason: "TAB_NOT_FOUND" };
        }

        entry.lastHealthCheck = Date.now();
        entry.lastUsed = Date.now();
        return { healthy: true, tab };
      } catch (err) {
        console.warn(
          `[SpectraLens:HealthCheck] Health check failed for ${providerId}:`,
          err?.message,
        );
        this.persistentProviderTabs.delete(normKey);
        return { healthy: false, reason: "TAB_GET_ERROR" };
      }
    }

    async openOrReuseProviderTab(providerId, url) {
      const normKey = (providerId || "").toLowerCase();

      // 1. Check if an active healthy persistent window & tab exists for this provider
      const health = await this.healthCheckProviderTab(normKey, url);
      if (health.healthy && health.tab) {
        const entry = this.persistentProviderTabs.get(normKey);
        if (entry) {
          entry.status = "READY";
          entry.lastUsed = Date.now();
        }
        return { tab: health.tab, isReused: true };
      }

      // 2. Create a separate dedicated popup worker window for this provider
      return new Promise((resolve) => {
        if (typeof chrome === "undefined" || !chrome.windows?.create) {
          chrome.tabs.create({ url, active: false }, (tab) => {
            if (tab && tab.id) {
              this.persistentProviderTabs.set(normKey, {
                providerId: normKey,
                tabId: tab.id,
                windowId: tab.windowId,
                url,
                status: "READY",
                lastUsed: Date.now(),
                currentRequestId: null,
                adapterReady: false,
                lastHealthCheck: Date.now(),
                failureCount: 0,
              });
            }
            resolve({ tab: tab || null, isReused: false });
          });
          return;
        }

        const maxHeight =
          typeof screen !== "undefined" && screen.availHeight
            ? screen.availHeight
            : 950;

        chrome.windows.create(
          {
            url,
            type: "popup",
            focused: false,
            width: 500,
            height: maxHeight,
            top: 0,
            left: 0,
          },
          (win) => {
            if (chrome.runtime.lastError || !win) {
              console.warn(
                "[SpectraLens:Pipeline] Window create failed, falling back to background tab:",
                chrome.runtime.lastError?.message,
              );
              chrome.tabs.create({ url, active: false }, (tab) => {
                if (tab && tab.id) {
                  this.persistentProviderTabs.set(normKey, {
                    providerId: normKey,
                    tabId: tab.id,
                    windowId: tab.windowId,
                    url,
                    status: "READY",
                    lastUsed: Date.now(),
                    currentRequestId: null,
                    adapterReady: false,
                    lastHealthCheck: Date.now(),
                    failureCount: 0,
                  });
                }
                resolve({ tab: tab || null, isReused: false });
              });
              return;
            }

            console.log(
              `%c[SpectraLens:Pipeline] 🪟 Created Dedicated Worker Window #${win.id} (width: 500px, height: ${maxHeight}px) for "${normKey}"`,
              "color: #3b82f6; font-weight: bold;",
            );

            const tab = win.tabs?.[0] || null;
            if (tab && tab.id) {
              this.persistentProviderTabs.set(normKey, {
                providerId: normKey,
                tabId: tab.id,
                windowId: win.id,
                url,
                status: "READY",
                lastUsed: Date.now(),
                currentRequestId: null,
                adapterReady: false,
                lastHealthCheck: Date.now(),
                failureCount: 0,
              });
            }
            resolve({ tab, isReused: false });
          },
        );
      });
    }

    closeProviderTab(providerId) {
      const normKey = (providerId || "").toLowerCase();
      const entry = this.persistentProviderTabs.get(normKey);
      if (entry) {
        if (
          entry.tabId &&
          typeof chrome !== "undefined" &&
          chrome.tabs?.remove
        ) {
          try {
            chrome.tabs.remove(entry.tabId, () => {});
          } catch {}
        }
        if (
          entry.windowId &&
          typeof chrome !== "undefined" &&
          chrome.windows?.remove
        ) {
          try {
            chrome.windows.remove(entry.windowId, () => {});
          } catch {}
        }
        this.persistentProviderTabs.delete(normKey);
        this.activeProviderLocks.delete(normKey);
      }
    }

    resetAllProviderSessions() {
      for (const [providerId] of this.persistentProviderTabs.entries()) {
        this.closeProviderTab(providerId);
      }
      if (
        Array.isArray(this.activeAiTabs) &&
        typeof chrome !== "undefined" &&
        chrome.tabs?.remove
      ) {
        for (const tabId of this.activeAiTabs) {
          try {
            chrome.tabs.remove(tabId, () => {});
          } catch {}
        }
      }
      this.persistentProviderTabs.clear();
      this.activeProviderLocks.clear();
      this.activeAiTabs = [];
      console.log(
        "[SpectraLens:Pipeline] 🧹 Reset all persistent provider sessions.",
      );
    }

    cancelAiRequest(requestId, providerId = null) {
      if (!requestId) return;
      if (providerId) {
        this.setRequestState(
          requestId,
          providerId,
          REQUEST_STATES.CANCELLED,
          "CANCELLED",
        );
        if (this.activeProviderLocks.get(providerId) === requestId) {
          this.activeProviderLocks.delete(providerId);
        }
        const entry = this.persistentProviderTabs.get(providerId.toLowerCase());
        if (entry && entry.tabId && typeof chrome !== "undefined") {
          chrome.tabs.sendMessage(
            entry.tabId,
            { type: "CANCEL_AI_REQUEST", requestId },
            () => {},
          );
        }
      } else {
        for (const [key, state] of this.requestStateModel.entries()) {
          if (state.requestId === requestId) {
            state.status = REQUEST_STATES.CANCELLED;
            state.phase = "CANCELLED";
            state.updatedAt = Date.now();
            console.log(
              `[SL REQUEST] ${requestId} provider=${state.providerId} event=CANCELLED timestamp=${Date.now()}`,
            );
          }
        }
        for (const [prov, lockedReqId] of this.activeProviderLocks.entries()) {
          if (lockedReqId === requestId) {
            this.activeProviderLocks.delete(prov);
          }
        }
      }
    }

    cancelAllAiRequests() {
      for (const [key, state] of this.requestStateModel.entries()) {
        if (
          state.status !== REQUEST_STATES.COMPLETED &&
          state.status !== REQUEST_STATES.FAILED &&
          state.status !== REQUEST_STATES.CANCELLED
        ) {
          state.status = REQUEST_STATES.CANCELLED;
          state.phase = "CANCELLED";
          state.updatedAt = Date.now();
        }
      }
      this.activeProviderLocks.clear();
      for (const entry of this.persistentProviderTabs.values()) {
        if (entry.tabId && typeof chrome !== "undefined") {
          chrome.tabs.sendMessage(
            entry.tabId,
            { type: "CANCEL_ALL_REQUESTS" },
            () => {},
          );
        }
      }
      console.log(
        "[SpectraLens:Pipeline] 🛑 Cancelled all active AI requests.",
      );
    }

    /* --- Unified Tab Pipeline Execution --- */

    async fetchAiAnswer(
      url,
      extractFn,
      extractArgs,
      requestId,
      retryCount = 0,
    ) {
      const providerId = (
        Array.isArray(extractArgs) ? extractArgs[0] : "unknown"
      ).toLowerCase();
      this.currentRequestId = requestId;

      const timing = {
        queuedAt: Date.now(),
        tabStartAt: 0,
        tabReadyAt: 0,
        inputReadyAt: 0,
        submitAt: 0,
        firstResponseAt: 0,
        completedAt: 0,
      };

      console.log(
        `%c[SpectraLens:Pipeline] 🚀 [STEP 1/5] Initiating request for "${providerId}" (URL: ${url}, RequestID: ${requestId}, retry: ${retryCount})`,
        "color: #3b82f6; font-weight: bold;",
      );
      this.setRequestState(
        requestId,
        providerId,
        REQUEST_STATES.QUEUED,
        "QUEUED",
      );

      // Lock provider for this request ID
      this.activeProviderLocks.set(providerId, requestId);

      return new Promise(async (resolve) => {
        let isResolved = false;
        let timeoutId = null;
        let isExecuting = false;
        let currentPhase = "TAB_CREATE";
        let hasSubmittedForRequest = false;
        let awaitingNavigation = false;

        timing.tabStartAt = Date.now();
        this.setRequestState(
          requestId,
          providerId,
          REQUEST_STATES.STARTING,
          "TAB_CREATE",
        );

        let tabInfo = null;
        try {
          tabInfo = await this.openOrReuseProviderTab(providerId, url);
        } catch (tabErr) {
          console.error(
            `[SpectraLens:Pipeline] Tab open error for ${providerId}:`,
            tabErr,
          );
        }

        const tab = tabInfo?.tab;
        const isReused = Boolean(tabInfo?.isReused);

        if (!tab || !tab.id) {
          if (
            requestId &&
            this.activeProviderLocks.get(providerId) === requestId
          ) {
            this.activeProviderLocks.delete(providerId);
          }
          this.setRequestState(
            requestId,
            providerId,
            REQUEST_STATES.FAILED,
            "TAB_CREATE",
          );
          const structuredErr = this.createStructuredError(
            requestId,
            providerId,
            "TAB_CREATE",
            "TAB_NOT_FOUND",
            "Tab creation failed",
            false,
          );
          resolve(structuredErr.answer);
          return;
        }

        timing.tabReadyAt = Date.now();
        const tabId = tab.id;
        if (!this.activeAiTabs.includes(tabId)) {
          this.activeAiTabs.push(tabId);
        }
        this.persistentProviderTabs.set(providerId, {
          providerId,
          tabId,
          windowId: tab.windowId,
          url,
          status: "BUSY",
          lastUsed: Date.now(),
          currentRequestId: requestId,
          adapterReady: false,
          lastHealthCheck: Date.now(),
          failureCount: 0,
        });

        if (isReused) {
          if (typeof chrome !== "undefined" && chrome.scripting?.executeScript) {
            chrome.scripting
              .executeScript({
                target: { tabId },
                func: () => {
                  if (typeof window !== "undefined") {
                    window.postMessage({ type: "CANCEL_AI_REQUEST" }, "*");
                  }
                },
              })
              .catch(() => {});
          }
        }

        console.log(
          `%c[SpectraLens:Pipeline] 📑 [STEP 3/5] Background Tab #${tabId} ready (Window #${tab.windowId}, reused: ${isReused}). Listening for stream completion...`,
          "color: #10b981; font-weight: bold;",
        );
        if (typeof chromeTabMediaAccess === "function") {
          chromeTabMediaAccess(tabId, true);
        }
        if (typeof injectMainWorldNetworkInterceptor === "function") {
          injectMainWorldNetworkInterceptor(tabId);
        }

        this.setRequestState(
          requestId,
          providerId,
          REQUEST_STATES.READY,
          "TAB_READY",
        );

        const detachTurnListeners = () => {
          if (timeoutId) clearTimeout(timeoutId);
          if (typeof chrome !== "undefined" && chrome.tabs?.onUpdated) {
            chrome.tabs.onUpdated.removeListener(listener);
          }
          if (typeof chrome !== "undefined" && chrome.tabs?.onRemoved) {
            chrome.tabs.onRemoved.removeListener(onRemoved);
          }
        };

        const safeResolve = (val) => {
          if (!isResolved) {
            isResolved = true;
            detachTurnListeners();
            timing.completedAt = Date.now();
            if (
              requestId &&
              this.activeProviderLocks.get(providerId) === requestId
            ) {
              this.activeProviderLocks.delete(providerId);
            }
            const entry = this.persistentProviderTabs.get(providerId);
            if (entry) entry.status = "READY";

            const textVal =
              typeof val === "string" ? val : val?.answer || val?.content || "";
            const isSuccess =
              textVal.trim().length > 0 &&
              !textVal.includes("Please log in to");

            this.setRequestState(
              requestId,
              providerId,
              isSuccess ? REQUEST_STATES.COMPLETED : REQUEST_STATES.FAILED,
              "COMPLETION",
              { answerLength: textVal.length },
            );

            // Log [SL TIMING] telemetry
            const tabReadyMs = timing.tabReadyAt - timing.tabStartAt;
            const inputMs = timing.inputReadyAt
              ? timing.inputReadyAt - timing.tabReadyAt
              : 0;
            const submitMs = timing.submitAt
              ? timing.submitAt - (timing.inputReadyAt || timing.tabReadyAt)
              : 0;
            const firstResponseMs = timing.firstResponseAt
              ? timing.firstResponseAt - (timing.submitAt || timing.tabReadyAt)
              : 0;
            const completionMs =
              timing.completedAt -
              (timing.firstResponseAt || timing.submitAt || timing.tabReadyAt);
            const totalMs = timing.completedAt - timing.queuedAt;

            console.log(
              `[SL TIMING] ${requestId} provider=${providerId} tabReadyMs=${tabReadyMs} inputMs=${inputMs} submitMs=${submitMs} firstResponseMs=${firstResponseMs} completionMs=${completionMs} totalMs=${totalMs}`,
            );
            console.log(
              `%c[SpectraLens:Pipeline] ✅ [STEP 5/5] fetchAiAnswer resolved for Tab #${tabId} (Length: ${textVal.length} chars, totalMs: ${totalMs}ms).`,
              "color: #10b981; font-weight: bold;",
            );
            console.log(
              `[SL REQUEST] ${requestId} provider=${providerId} event=CLEANUP timestamp=${Date.now()}`,
            );
            resolve(textVal);
          }
        };

        // Overall Completion Timeout
        const overallTimeoutMs = isReused
          ? 80000
          : PHASE_TIMEOUTS.COMPLETION_TIMEOUT;
        timeoutId = setTimeout(() => {
          console.warn(
            `%c[SpectraLens:Pipeline] ⏱️ [TIMEOUT] ${overallTimeoutMs / 1000}s timeout reached for Tab #${tabId} in phase "${currentPhase}"`,
            "color: #ef4444; font-weight: bold;",
          );
          if (
            requestId &&
            this.activeProviderLocks.get(providerId) === requestId
          ) {
            this.activeProviderLocks.delete(providerId);
          }
          this.setRequestState(
            requestId,
            providerId,
            REQUEST_STATES.TIMED_OUT,
            currentPhase,
          );
          const structuredErr = this.createStructuredError(
            requestId,
            providerId,
            currentPhase,
            "TIMEOUT",
            `Request timed out during ${currentPhase}`,
            false,
          );
          safeResolve(structuredErr.answer);
        }, overallTimeoutMs);

        const runInjection = () => {
          if (isResolved || isExecuting) return;
          isExecuting = true;
          currentPhase = "SENDING";
          timing.inputReadyAt = Date.now();
          this.setRequestState(
            requestId,
            providerId,
            REQUEST_STATES.SENDING,
            "SENDING",
          );

          console.log(
            `%c[SpectraLens:Pipeline] 💉 [STEP 4/5] Injecting "${providerId}" adapter script into Tab #${tabId} (isReused: ${isReused}, requestId: ${requestId})...`,
            "color: #f59e0b; font-weight: bold;",
          );
          const extractArgsClean = Array.isArray(extractArgs)
            ? extractArgs.slice(0, 3)
            : [providerId, "", null];
          // After a __NAVIGATING__ turn, mark as reused so the adapter
          // skips ensureAiMode and the 600ms settle delay on /search.
          const effectiveIsReused = isReused || hasSubmittedForRequest;
          const argsWithContext = [
            extractArgsClean[0] || providerId,
            extractArgsClean[1] || "",
            extractArgsClean[2] || null,
            Boolean(effectiveIsReused),
            requestId,
          ];

          executeScriptReturn(
            tabId,
            extractFn,
            async (injectResult) => {
              if (isResolved) return;
              console.log(
                `%c[SpectraLens:Pipeline] 📥 [STEP 4/5 COMPLETE] Received execution response from Tab #${tabId}:`,
                "color: #10b981;",
                injectResult,
              );
              const resultVal = injectResult?.[0]?.result;
              if (resultVal === "__NAVIGATING__") {
                isExecuting = false;
                hasSubmittedForRequest = true;
                awaitingNavigation = true;
                timing.submitAt = Date.now();
                currentPhase = "RESPONSE_START";
                timing.firstResponseAt = Date.now();
                this.setRequestState(
                  requestId,
                  providerId,
                  REQUEST_STATES.SUBMITTED,
                  "SUBMITTED",
                );
                return;
              }

              if (!injectResult || injectResult.length === 0) {
                console.log(
                  `%c[SpectraLens:Pipeline] ⏳ Tab #${tabId} script awaiting page ready or navigation...`,
                  "color: #f59e0b;",
                );
                isExecuting = false;
                awaitingNavigation = true;
                // Safety retry for SPA tabs where no full page navigation event fires
                setTimeout(() => {
                  if (!isResolved && !hasSubmittedForRequest && awaitingNavigation) {
                    console.log(
                      `[SL REQUEST] ${requestId} provider=${providerId} event=SPA_RETRY timestamp=${Date.now()}`,
                    );
                    awaitingNavigation = false;
                    runInjection();
                  }
                }, 2000);
                return;
              }

              if (
                typeof resultVal === "string" &&
                resultVal.includes("INPUT_VERIFICATION_FAILED") &&
                retryCount === 0
              ) {
                console.log(
                  `[SL REQUEST] ${requestId} provider=${providerId} event=RETRY phase=VERIFY_INPUT timestamp=${Date.now()}`,
                );
                isExecuting = false;
                setTimeout(() => {
                  if (!isResolved) runInjection();
                }, 600);
                return;
              }

              if (
                typeof resultVal === "string" &&
                resultVal.trim().length > 0
              ) {
                hasSubmittedForRequest = true;
                timing.submitAt = timing.submitAt || Date.now();
                timing.firstResponseAt = timing.firstResponseAt || Date.now();
                currentPhase = "COMPLETION";
                safeResolve(resultVal);
              } else if (
                resultVal &&
                typeof resultVal === "object" &&
                (resultVal.answer || resultVal.content)
              ) {
                hasSubmittedForRequest = true;
                timing.submitAt = timing.submitAt || Date.now();
                timing.firstResponseAt = timing.firstResponseAt || Date.now();
                currentPhase = "COMPLETION";
                safeResolve(resultVal.answer || resultVal.content);
              } else {
                hasSubmittedForRequest = true;
                timing.submitAt = Date.now();
                currentPhase = "RESPONSE_START";
                timing.firstResponseAt = Date.now();
                this.setRequestState(
                  requestId,
                  providerId,
                  REQUEST_STATES.SUBMITTED,
                  "SUBMITTED",
                );
                isExecuting = false;
              }
            },
            argsWithContext,
          );
        };

        let hasInitialInjected = false;

        const listener = (updatedTabId, info) => {
          if (isResolved) return;
          if (updatedTabId === tabId && info.status === "complete") {
            if (typeof injectMainWorldNetworkInterceptor === "function") {
              injectMainWorldNetworkInterceptor(tabId);
            }
            if (awaitingNavigation) {
              console.log(
                `[SL REQUEST] ${requestId} provider=${providerId} event=PAGE_NAVIGATION_COMPLETED timestamp=${Date.now()}`,
              );
              awaitingNavigation = false;
              isExecuting = false;
              runInjection();
            } else if (!hasSubmittedForRequest && !hasInitialInjected) {
              hasInitialInjected = true;
              console.log(
                `[SL REQUEST] ${requestId} provider=${providerId} event=PAGE_INITIAL_READY timestamp=${Date.now()}`,
              );
              setTimeout(runInjection, 500);
            }
          }
        };

        const onRemoved = (removedTabId) => {
          if (removedTabId === tabId) {
            detachTurnListeners();
            this.persistentProviderTabs.delete(providerId);
            if (
              requestId &&
              this.activeProviderLocks.get(providerId) === requestId
            ) {
              this.activeProviderLocks.delete(providerId);
            }
            this.setRequestState(
              requestId,
              providerId,
              REQUEST_STATES.FAILED,
              currentPhase,
            );
            const err = this.createStructuredError(
              requestId,
              providerId,
              currentPhase,
              "TAB_CLOSED",
              "Tab was closed before response completed",
              false,
            );
            safeResolve(err.answer);
          }
        };

        if (typeof chrome !== "undefined" && chrome.tabs?.onUpdated) {
          chrome.tabs.onUpdated.addListener(listener);
        }
        if (typeof chrome !== "undefined" && chrome.tabs?.onRemoved) {
          chrome.tabs.onRemoved.addListener(onRemoved);
        }

        if (isReused) {
          setTimeout(runInjection, 150);
        } else {
          try {
            chrome.tabs.get(tabId, (currentTab) => {
              if (currentTab && currentTab.status === "complete") {
                hasInitialInjected = true;
                setTimeout(runInjection, 600);
              } else {
                setTimeout(() => {
                  if (!hasInitialInjected && !isResolved && !hasSubmittedForRequest) {
                    hasInitialInjected = true;
                    runInjection();
                  }
                }, 1800);
              }
            });
          } catch {
            setTimeout(runInjection, 1500);
          }
        }
      });
    }

    /* --- Dedicated Per-Provider Methods --- */

    async getGoogleAiAnswer(q, requestId, image = null) {
      const url = "https://www.google.com/?hl=en";
      console.log(
        `[SpectraLens:Background] 🔍 getGoogleAiAnswer for: "${q.slice(0, 30)}..."${image ? " (with image)" : ""} (requestId: ${requestId})`,
      );
      return this.fetchAiAnswer(
        url,
        runTabAdapter,
        ["google", q, image],
        requestId,
      );
    }

    async getChatGptAnswer(q, requestId, image = null) {
      const url = "https://chatgpt.com/";
      console.log(
        `[SpectraLens:Background] 🔍 getChatGptAnswer for: "${q.slice(0, 30)}..."${image ? " (with image)" : ""} (requestId: ${requestId})`,
      );
      return this.fetchAiAnswer(
        url,
        runTabAdapter,
        ["chatgpt", q, image],
        requestId,
      );
    }

    async getClaudeAnswer(q, requestId, image = null) {
      const url = "https://claude.ai/new";
      console.log(
        `[SpectraLens:Background] 🔍 getClaudeAnswer for: "${q.slice(0, 30)}..."${image ? " (with image)" : ""} (requestId: ${requestId})`,
      );
      return this.fetchAiAnswer(
        url,
        runTabAdapter,
        ["claude", q, image],
        requestId,
      );
    }

    async getGeminiAnswer(q, requestId, image = null) {
      const url = "https://gemini.google.com/app?hl=en";
      console.log(
        `[SpectraLens:Background] 🔍 getGeminiAnswer for: "${q.slice(0, 30)}..."${image ? " (with image)" : ""} (requestId: ${requestId})`,
      );
      return this.fetchAiAnswer(
        url,
        runTabAdapter,
        ["gemini", q, image],
        requestId,
      );
    }

    async getGrokAnswer(q, requestId, image = null) {
      const url = "https://grok.com/";
      console.log(
        `[SpectraLens:Background] 🔍 getGrokAnswer for: "${q.slice(0, 30)}..."${image ? " (with image)" : ""} (requestId: ${requestId})`,
      );
      return this.fetchAiAnswer(
        url,
        runTabAdapter,
        ["grok", q, image],
        requestId,
      );
    }

    async getPerplexityAnswer(q, requestId, image = null) {
      const url = "https://www.perplexity.ai/";
      console.log(
        `[SpectraLens:Background] 🔍 getPerplexityAnswer for: "${q.slice(0, 30)}..."${image ? " (with image)" : ""} (requestId: ${requestId})`,
      );
      return this.fetchAiAnswer(
        url,
        runTabAdapter,
        ["perplexity", q, image],
        requestId,
      );
    }

    async getAnswer(provider, question, requestId, image = null) {
      switch ((provider || "").toLowerCase()) {
        case "google":
          return this.getGoogleAiAnswer(question, requestId, image);
        case "chatgpt":
          return this.getChatGptAnswer(question, requestId, image);
        case "claude":
          return this.getClaudeAnswer(question, requestId, image);
        case "gemini":
          return this.getGeminiAnswer(question, requestId, image);
        case "grok":
          return this.getGrokAnswer(question, requestId, image);
        case "perplexity":
          return this.getPerplexityAnswer(question, requestId, image);
        default:
          return this.getGoogleAiAnswer(question, requestId, image);
      }
    }
  }

  /* --- In-Tab Runner for Providers --- */
  function runTabAdapter(providerId, prompt, image, isReused, requestId) {
    const streamTimeoutMs = 90000;
    return new Promise(async (resolve) => {
      try {
        const root = typeof window !== "undefined" ? window : globalThis;
        const registry =
          root.ProviderAdapterRegistry ||
          (typeof ProviderAdapterRegistry !== "undefined"
            ? ProviderAdapterRegistry
            : null);
        const adapter = registry
          ? registry.getAdapter(providerId) ||
            registry.getAdapterForCurrentPage()
          : root.SpectralensAdapters
            ? root.SpectralensAdapters.get(providerId)
            : null;

        if (!adapter) {
          console.error(
            `%c[SpectraLens:Adapter] ❌ Provider adapter not found for "${providerId}"`,
            "color: #ef4444; font-weight: bold;",
          );
          resolve(
            typeof formatProviderError === "function"
              ? formatProviderError(providerId, "Adapter not found")
              : "Adapter not found",
          );
          return;
        }

        // Capture previous raw text for multi-turn comparison in observer.
        // Must be raw textContent (not styled HTML) to match observer's comparison format.
        let previousContent = "";
        if (isReused && typeof adapter.findResponseContainer === "function") {
          const prevContainer = adapter.findResponseContainer();
          if (prevContainer) {
            previousContent = (prevContainer.textContent || "").trim();
          }
        }

        window.__SL_SUBMITTED_REQUESTS__ =
          window.__SL_SUBMITTED_REQUESTS__ || new Set();

        const urlParams = new URLSearchParams(window.location.search);
        const urlQuery = (
          urlParams.get("q") ||
          urlParams.get("query") ||
          urlParams.get("prompt") ||
          ""
        )
          .trim()
          .toLowerCase();
        const promptQuery = (prompt || "").trim().toLowerCase();
        const isUrlMatch =
          urlQuery &&
          (urlQuery === promptQuery ||
            promptQuery.startsWith(urlQuery) ||
            urlQuery.startsWith(promptQuery));

        const isSearchPage =
          window.location.pathname.startsWith("/search") ||
          window.location.hostname.includes("lens.google.com");

        // 0b. Direct URL load in fresh tab (without image)
        if (
          !isReused &&
          !image &&
          isUrlMatch &&
          (adapter.isStreaming() || Boolean(adapter.findResponseContainer()))
        ) {
          if (requestId) {
            window.__SL_SUBMITTED_REQUESTS__.add(requestId);
          }
          console.log(
            `%c[SpectraLens:Adapter] 🎯 Provider loaded direct query ("${prompt.slice(0, 25)}..."). Observing AI stream directly...`,
            "color: #10b981; font-weight: bold;",
          );
          const answer = await adapter.observeResponse(
            streamTimeoutMs,
            "",
            requestId,
          );
          resolve(
            answer ||
              (typeof formatProviderError === "function"
                ? formatProviderError(providerId, "No response generated")
                : "No response generated"),
          );
          return;
        }

        // Execute verified lifecycle
        console.log(
          `%c[SpectraLens:Adapter] 🚀 [ADAPTER 2/4] Executing verified lifecycle for "${providerId}" (requestId: ${requestId})...`,
          "color: #3b82f6; font-weight: bold;",
        );

        if (requestId) {
          window.__SL_SUBMITTED_REQUESTS__.add(requestId);
        }

        const lifecycleResult = await adapter.executeLifecycle(
          prompt,
          image,
          requestId,
          isReused,
        );

        if (!lifecycleResult.success) {
          console.error(
            `%c[SpectraLens:Adapter] ❌ Lifecycle failed for "${providerId}" at phase "${lifecycleResult.phase}": ${lifecycleResult.error}`,
            "color: #ef4444; font-weight: bold;",
          );
          resolve(
            typeof formatProviderError === "function"
              ? formatProviderError(
                  providerId,
                  lifecycleResult.error || "Submission failed",
                )
              : lifecycleResult.error || "Submission failed",
          );
          return;
        }

        if (!isSearchPage && providerId === "google") {
          console.log(
            `%c[SpectraLens:Adapter] 🚀 Google homepage submitted. Awaiting search navigation to complete...`,
            "color: #3b82f6; font-weight: bold;",
          );
          resolve("__NAVIGATING__");
          return;
        }

        // Re-capture previousContent AFTER lifecycle submit completes.
        // The old response may have grown/completed during executeLifecycle
        // (which takes ~3-4s for image attach + prompt insert + submit).
        // Without this, the observer compares against a PARTIAL snapshot and
        // mistakes the now-completed old response for a new answer.
        if (isReused && typeof adapter.findResponseContainer === "function") {
          const postSubmitContainer = adapter.findResponseContainer();
          if (postSubmitContainer) {
            previousContent = (postSubmitContainer.textContent || "").trim();
            console.log(
              `%c[SpectraLens:Adapter] 📸 Post-submit previousContent snapshot: ${previousContent.length} chars`,
              "color: #8b5cf6;",
            );
          }
        }

        // Reset network COMPLETION flag so the observer doesn't
        // pick up stale completion signals from the initial page load.
        // DO NOT reset __SPECTRALENS_ACTIVE_NET_REQUESTS__ — the network
        // interceptor tracks active streams accurately and overwriting
        // it breaks the observer's network-aware finalization gate.
        if (typeof window !== "undefined") {
          window.__SPECTRALENS_NETWORK_COMPLETED__ = false;
        }

        console.log(
          `[SL REQUEST] ${requestId} provider=${providerId} event=RESPONSE_WAITING timestamp=${Date.now()}`,
        );
        console.log(
          `%c[SpectraLens:Adapter] ⏳ [ADAPTER 3/4] Observing stream response for "${providerId}" (timeout: ${streamTimeoutMs / 1000}s)...`,
          "color: #f59e0b; font-weight: bold;",
        );
        const answer = await adapter.observeResponse(
          streamTimeoutMs,
          previousContent,
          requestId,
        );
        console.log(
          `%c[SpectraLens:Adapter] ✅ [ADAPTER 4/4] Response extracted for "${providerId}", length: ${answer?.length || 0} chars`,
          "color: #10b981; font-weight: bold;",
        );
        resolve(
          answer ||
            (typeof formatProviderError === "function"
              ? formatProviderError(providerId, "No response generated")
              : "No response generated"),
        );
      } catch (e) {
        console.error(`%c[SpectraLens:Adapter] ❌ Error running adapter:`, e);
        resolve(
          typeof formatProviderError === "function"
            ? formatProviderError(providerId, e?.message || "Adapter error")
            : e?.message || "Adapter error",
        );
      }
    });
  }

  // Create singleton instance
  const requestAiService = new RequestAiService();

  // Export class & singleton
  global.RequestAiService = RequestAiService;
  global.requestAiService = requestAiService;

  // Export functions & constants for backwards compatibility
  global.REQUEST_STATES = REQUEST_STATES;
  global.PHASE_TIMEOUTS = PHASE_TIMEOUTS;
  global.persistentProviderTabs = requestAiService.persistentProviderTabs;
  global.activeProviderLocks = requestAiService.activeProviderLocks;
  global.requestStateModel = requestAiService.requestStateModel;
  global.setRequestState = (...args) =>
    requestAiService.setRequestState(...args);
  global.getRequestState = (...args) =>
    requestAiService.getRequestState(...args);
  global.createStructuredError = (...args) =>
    requestAiService.createStructuredError(...args);
  global.healthCheckProviderTab = (...args) =>
    requestAiService.healthCheckProviderTab(...args);
  global.openOrReuseProviderTab = (...args) =>
    requestAiService.openOrReuseProviderTab(...args);
  global.closeProviderTab = (...args) =>
    requestAiService.closeProviderTab(...args);
  global.resetAllProviderSessions = () =>
    requestAiService.resetAllProviderSessions();
  global.cancelAiRequest = (...args) =>
    requestAiService.cancelAiRequest(...args);
  global.cancelAllAiRequests = () => requestAiService.cancelAllAiRequests();
  global.fetchAiAnswer = (...args) => requestAiService.fetchAiAnswer(...args);
  global.runTabAdapter = runTabAdapter;
  global.getGoogleAiAnswer = (...args) =>
    requestAiService.getGoogleAiAnswer(...args);
  global.getChatGptAnswer = (...args) =>
    requestAiService.getChatGptAnswer(...args);
  global.getClaudeAnswer = (...args) =>
    requestAiService.getClaudeAnswer(...args);
  global.getGeminiAnswer = (...args) =>
    requestAiService.getGeminiAnswer(...args);
  global.getGrokAnswer = (...args) => requestAiService.getGrokAnswer(...args);
  global.getPerplexityAnswer = (...args) =>
    requestAiService.getPerplexityAnswer(...args);
})(typeof window !== "undefined" ? window : globalThis);
