/**
 * SpectraLens AI — Background Request Pipeline & Universal Adapter Runner
 */
(function (global) {
  "use strict";

  const RequestStates = global.REQUEST_STATES || {
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

  const PhaseTimeouts = global.PHASE_TIMEOUTS || {
    TAB_CREATE_TIMEOUT: 15000,
    PAGE_READY_TIMEOUT: 20000,
    INPUT_TIMEOUT: 10000,
    SUBMIT_TIMEOUT: 8000,
    RESPONSE_START_TIMEOUT: 25000,
    RESPONSE_STREAM_TIMEOUT: 90000,
    COMPLETION_TIMEOUT: 120000,
  };

  function fetchAiAnswer(
    url,
    extractFn,
    extractArgs = [],
    requestId = null,
    retryCount = 0,
  ) {
    return new Promise(async (resolve) => {
      const providerId = (extractArgs?.[0] || "ai").toLowerCase();
      console.log(
        `%c[SpectraLens:Pipeline] 🚀 [STEP 1/5] Initiating request for "${providerId}" (URL: ${url}, RequestID: ${requestId}, retry: ${retryCount})`,
        "color: #3b82f6; font-weight: bold;",
      );

      const activeLocks = global.activeProviderLocks || activeProviderLocks;
      const persistentTabs = global.persistentProviderTabs || persistentProviderTabs;
      const setReqState = global.setRequestState || setRequestState;
      const getReqState = global.getRequestState || getRequestState;
      const makeStructErr = global.createStructuredError || createStructuredError;
      const openReuseTab = global.openOrReuseProviderTab || openOrReuseProviderTab;
      const injectNetInterceptor = global.injectMainWorldNetworkInterceptor || injectMainWorldNetworkInterceptor;

      if (requestId) {
        // Idempotency & Per-Provider Lock Check
        const activeLock = activeLocks.get(providerId);
        if (activeLock === requestId) {
          const state = getReqState(requestId, providerId);
          if (
            state &&
            (state.status === RequestStates.SENDING ||
              state.status === RequestStates.SUBMITTED ||
              state.status === RequestStates.STREAMING)
          ) {
            console.log(
              `[SL REQUEST] ${requestId} provider=${providerId} event=DUPLICATE_IGNORED timestamp=${Date.now()}`,
            );
            return;
          }
        }

        activeLocks.set(providerId, requestId);
        setReqState(requestId, providerId, RequestStates.QUEUED, "QUEUED");
      }

      let isResolved = false;
      let timeoutId = null;
      let isExecuting = false;
      let hasSubmittedForRequest = false;
      let awaitingNavigation = false;
      let currentPhase = "TAB_CREATE";

      const timing = {
        startTime: Date.now(),
        tabReadyAt: null,
        inputReadyAt: null,
        submitAt: null,
        firstResponseAt: null,
        completedAt: null,
      };

      setReqState(
        requestId,
        providerId,
        RequestStates.STARTING,
        "TAB_CREATE",
      );

      let tab = null;
      let isReused = false;

      try {
        const tabPromise = openReuseTab(providerId, url);
        const tabTimeoutPromise = new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("TAB_CREATE_TIMEOUT")),
            PhaseTimeouts.TAB_CREATE_TIMEOUT,
          ),
        );
        const tabResult = await Promise.race([tabPromise, tabTimeoutPromise]);
        tab = tabResult.tab;
        isReused = tabResult.isReused;
      } catch (err) {
        console.error(
          `%c[SpectraLens:Pipeline] ❌ [TAB_CREATE FAILED] for "${providerId}": ${err?.message}`,
          "color: #ef4444; font-weight: bold;",
        );
        if (requestId && activeLocks.get(providerId) === requestId) {
          activeLocks.delete(providerId);
        }
        setReqState(
          requestId,
          providerId,
          RequestStates.FAILED,
          "TAB_CREATE",
        );
        const structuredErr = makeStructErr(
          requestId,
          providerId,
          "TAB_CREATE",
          "TAB_CREATE_TIMEOUT",
          "Tab creation timed out",
          retryCount === 0,
        );
        if (retryCount === 0) {
          console.log(
            `[SL REQUEST] ${requestId} provider=${providerId} event=RETRY phase=TAB_CREATE timestamp=${Date.now()}`,
          );
          persistentTabs.delete(providerId);
          const retryResult = await fetchAiAnswer(
            url,
            extractFn,
            extractArgs,
            requestId,
            1,
          );
          resolve(retryResult);
          return;
        }
        resolve(structuredErr.answer);
        return;
      }

      if (!tab || !tab.id) {
        if (requestId && activeLocks.get(providerId) === requestId) {
          activeLocks.delete(providerId);
        }
        setReqState(
          requestId,
          providerId,
          RequestStates.FAILED,
          "TAB_CREATE",
        );
        const structuredErr = makeStructErr(
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
      if (global.activeAiTabs && !global.activeAiTabs.includes(tabId)) {
        global.activeAiTabs.push(tabId);
      }
      persistentTabs.set(providerId, {
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

      console.log(
        `%c[SpectraLens:Pipeline] 📑 [STEP 3/5] Background Tab #${tabId} ready (Window #${tab.windowId}, reused: ${isReused}). Listening for stream completion...`,
        "color: #10b981; font-weight: bold;",
      );
      if (typeof chromeTabMediaAccess === "function") {
        chromeTabMediaAccess(tabId, true);
      }
      injectNetInterceptor(tabId);

      setReqState(requestId, providerId, RequestStates.READY, "TAB_READY");

      function detachTurnListeners() {
        if (timeoutId) clearTimeout(timeoutId);
        chrome.tabs.onUpdated.removeListener(listener);
        chrome.tabs.onRemoved.removeListener(onRemoved);
      }

      function safeResolve(val) {
        if (!isResolved) {
          isResolved = true;
          detachTurnListeners();
          timing.completedAt = Date.now();
          if (requestId && activeLocks.get(providerId) === requestId) {
            activeLocks.delete(providerId);
          }
          const entry = persistentTabs.get(providerId);
          if (entry) entry.status = "READY";

          const textVal =
            typeof val === "string" ? val : val?.answer || val?.content || "";
          const isFailure = typeof val === "object" && val?.status === "failure";

          if (isFailure) {
            setReqState(
              requestId,
              providerId,
              RequestStates.FAILED,
              currentPhase,
            );
          } else {
            setReqState(
              requestId,
              providerId,
              RequestStates.COMPLETED,
              "COMPLETION",
            );
          }

          // Timing Telemetry Calculations
          const tabReadyMs = timing.tabReadyAt
            ? timing.tabReadyAt - timing.startTime
            : 0;
          const inputMs =
            timing.inputReadyAt && timing.tabReadyAt
              ? timing.inputReadyAt - timing.tabReadyAt
              : 0;
          const submitMs =
            timing.submitAt && timing.inputReadyAt
              ? timing.submitAt - timing.inputReadyAt
              : 0;
          const firstResponseMs =
            timing.firstResponseAt && timing.submitAt
              ? timing.firstResponseAt - timing.submitAt
              : 0;
          const completionMs =
            timing.completedAt && timing.firstResponseAt
              ? timing.completedAt - timing.firstResponseAt
              : 0;
          const totalMs = timing.completedAt - timing.startTime;

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
      }

      // Overall Completion Timeout
      const overallTimeoutMs = isReused
        ? 80000
        : PhaseTimeouts.COMPLETION_TIMEOUT;
      timeoutId = setTimeout(() => {
        console.warn(
          `%c[SpectraLens:Pipeline] ⏱️ [TIMEOUT] ${overallTimeoutMs / 1000}s timeout reached for Tab #${tabId} in phase "${currentPhase}"`,
          "color: #ef4444; font-weight: bold;",
        );
        if (requestId && activeLocks.get(providerId) === requestId) {
          activeLocks.delete(providerId);
        }
        setReqState(
          requestId,
          providerId,
          RequestStates.TIMED_OUT,
          currentPhase,
        );
        const structuredErr = makeStructErr(
          requestId,
          providerId,
          currentPhase,
          "TIMEOUT",
          `Request timed out during ${currentPhase}`,
          false,
        );
        safeResolve(structuredErr.answer);
      }, overallTimeoutMs);

      function runInjection() {
        if (isResolved || isExecuting) return;
        isExecuting = true;
        currentPhase = "SENDING";
        timing.inputReadyAt = Date.now();
        setReqState(requestId, providerId, RequestStates.SENDING, "SENDING");

        console.log(
          `%c[SpectraLens:Pipeline] 💉 [STEP 4/5] Injecting "${providerId}" adapter script into Tab #${tabId} (isReused: ${isReused}, requestId: ${requestId})...`,
          "color: #f59e0b; font-weight: bold;",
        );
        const extractArgsClean = Array.isArray(extractArgs)
          ? extractArgs.slice(0, 3)
          : [providerId, "", null];
        const argsWithContext = [
          extractArgsClean[0] || providerId,
          extractArgsClean[1] || "",
          extractArgsClean[2] || null,
          Boolean(isReused),
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
              setReqState(
                requestId,
                providerId,
                RequestStates.SUBMITTED,
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
              hasSubmittedForRequest = true;
              awaitingNavigation = true;
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

            if (typeof resultVal === "string" && resultVal.trim().length > 0) {
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
              setReqState(
                requestId,
                providerId,
                RequestStates.SUBMITTED,
                "SUBMITTED",
              );
              isExecuting = false;
            }
          },
          argsWithContext,
        );
      }

      function listener(updatedTabId, info) {
        if (isResolved) return;
        if (updatedTabId === tabId && info.status === "complete") {
          injectNetInterceptor(tabId);
          if (awaitingNavigation) {
            awaitingNavigation = false;
            console.log(
              `[SL REQUEST] ${requestId} provider=${providerId} event=NAVIGATION_COMPLETED_OBSERVING timestamp=${Date.now()}`,
            );
            if (!isExecuting) {
              runInjection();
            }
            return;
          }
          if (hasSubmittedForRequest) {
            console.log(
              `[SL REQUEST] ${requestId} provider=${providerId} event=NAVIGATION_IGNORED timestamp=${Date.now()}`,
            );
            return;
          }
          if (!isExecuting) {
            runInjection();
          }
        }
      }

      function onRemoved(removedTabId) {
        if (removedTabId === tabId) {
          detachTurnListeners();
          persistentTabs.delete(providerId);
          if (requestId && activeLocks.get(providerId) === requestId) {
            activeLocks.delete(providerId);
          }
          setReqState(
            requestId,
            providerId,
            RequestStates.FAILED,
            "TAB_CLOSED",
          );
          if (global.activeAiTabs) {
            global.activeAiTabs = global.activeAiTabs.filter((id) => id !== tabId);
          }
          const structuredErr = makeStructErr(
            requestId,
            providerId,
            currentPhase,
            "TAB_CLOSED",
            "Window closed during processing",
            false,
          );
          safeResolve(structuredErr.answer);
        }
      }

      chrome.tabs.onUpdated.addListener(listener);
      chrome.tabs.onRemoved.addListener(onRemoved);

      if (isReused || tab.status === "complete") {
        runInjection();
      }
    });
  }

  /** Universal in-tab adapter runner */
  function runTabAdapter(
    providerId,
    prompt,
    image,
    isReused = false,
    requestId = null,
  ) {
    return new Promise(async (resolve) => {
      function getShortError(pid, reason) {
        if (typeof formatProviderError === "function") {
          return formatProviderError(pid, reason);
        }
        return `> ⚠️ **Please log in to ${pid || "AI Provider"}**\n>\n> Unable to load response. Make sure you are signed in and have an active session.\n\n*Error: ${reason || "Failed"}*`;
      }

      try {
        window.__SL_SUBMITTED_REQUESTS__ =
          window.__SL_SUBMITTED_REQUESTS__ || new Set();

        const streamTimeoutMs = isReused ? 20000 : 45000;
        console.log(
          `%c[SpectraLens:Adapter] 🚀 [ADAPTER 1/4] Running adapter for "${providerId}" with timeout ${streamTimeoutMs / 1000}s (isReused: ${isReused}, requestId: ${requestId}): "${prompt.slice(0, 35)}..."`,
          "color: #3b82f6; font-weight: bold;",
        );
        const adapter =
          typeof ProviderAdapterRegistry !== "undefined"
            ? ProviderAdapterRegistry.getAdapter(providerId) ||
              ProviderAdapterRegistry.getAdapterForCurrentPage()
            : null;

        if (!adapter) {
          console.error(
            `%c[SpectraLens:Adapter] ❌ Provider adapter not found for "${providerId}"`,
            "color: #ef4444; font-weight: bold;",
          );
          resolve(getShortError(providerId, "Adapter not found"));
          return;
        }

        const existingContainer = adapter.findResponseContainer();
        const previousContent = existingContainer
          ? (existingContainer.textContent || "").trim()
          : "";

        // 0. Duplicate guard
        if (requestId && window.__SL_SUBMITTED_REQUESTS__.has(requestId)) {
          console.log(
            `[SL REQUEST] ${requestId} provider=${providerId} event=DUPLICATE_IGNORED timestamp=${Date.now()}`,
          );
          const answer = await adapter.observeResponse(
            streamTimeoutMs,
            previousContent,
            requestId,
          );
          resolve(answer || getShortError(providerId, "No response generated"));
          return;
        }

        // 0b. Direct URL load in fresh tab
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

        if (
          !isReused &&
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
          resolve(answer || getShortError(providerId, "No response generated"));
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
            getShortError(
              providerId,
              lifecycleResult.error || "Submission failed",
            ),
          );
          return;
        }

        const isSearchPage = window.location.pathname.startsWith("/search");
        if (!isSearchPage && providerId === "google") {
          console.log(
            `%c[SpectraLens:Adapter] 🚀 Google homepage submitted. Awaiting search navigation to complete...`,
            "color: #3b82f6; font-weight: bold;",
          );
          resolve("__NAVIGATING__");
          return;
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
        resolve(answer || getShortError(providerId, "No response generated"));
      } catch (e) {
        console.error(
          `%c[SpectraLens:Adapter] ❌ Error running adapter:`,
          "color: #ef4444;",
          e,
        );
        resolve(getShortError(providerId, e?.message || "Execution error"));
      }
    });
  }

  global.fetchAiAnswer = fetchAiAnswer;
  global.runTabAdapter = runTabAdapter;
})(typeof window !== "undefined" ? window : globalThis);
