/**
 * SpectraLens AI — Main World Network Interceptor
 * Injects fetch and XMLHttpRequest hooks into provider tabs to track real-time streaming chunks & completion.
 */
(function (global) {
  "use strict";

  function injectMainWorldNetworkInterceptor(tabId) {
    if (!tabId || typeof chrome === "undefined" || !chrome.scripting) return;

    chrome.scripting.executeScript({
      target: { tabId },
      world: "MAIN",
      func: () => {
        if (window.__SL_NET_INTERCEPTOR_INJECTED__) return;
        window.__SL_NET_INTERCEPTOR_INJECTED__ = true;

        const AI_ENDPOINTS = [
          "/async/",
          "/search",
          "batchexecute",
          "BardFrontendService",
          "StreamGenerate",
          "/backend-api/conversation",
          "/chat_conversations",
          "/completion",
          "/app-chat/",
          "/rest/queries",
          "/api/chat",
        ];

        function isAiUrl(url) {
          if (!url) return false;
          const u = String(url);
          return AI_ENDPOINTS.some((ep) => u.includes(ep));
        }

        let activeStreams = 0;

        // 1. Intercept window.fetch ReadableStreams
        const origFetch = window.fetch;
        if (origFetch) {
          window.fetch = async function (...args) {
            const url = args[0] ? (typeof args[0] === "string" ? args[0] : args[0].url) : "";
            if (isAiUrl(url)) {
              activeStreams++;
              console.log(
                `%c[SpectraLens:Network] 📡 [STREAM STARTED] (FETCH_START) Active requests: ${activeStreams} | URL: ${url.slice(0, 100)}`,
                "color: #3b82f6; font-weight: bold;",
              );
              window.dispatchEvent(
                new CustomEvent("spectralens:network_activity", {
                  detail: { url, status: "started", activeStreams, timestamp: Date.now() },
                }),
              );

              try {
                const response = await origFetch.apply(this, args);
                if (response && response.body && typeof response.body.tee === "function") {
                  const [stream1, stream2] = response.body.tee();
                  const reader = stream2.getReader();
                  const decoder = new TextDecoder();
                  let totalChars = 0;

                  (async () => {
                    try {
                      while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        const chunkText = decoder.decode(value, { stream: true });
                        totalChars += chunkText.length;
                        console.log(
                          `%c[SpectraLens:Network] 📦 [STREAM CHUNK] Read ${chunkText.length} chars chunk from: ${url.slice(0, 70)}`,
                          "color: #8b5cf6;",
                        );
                        window.dispatchEvent(
                          new CustomEvent("spectralens:network_chunk", {
                            detail: { url, chunkLength: chunkText.length, totalChars, timestamp: Date.now() },
                          }),
                        );
                      }
                    } catch (e) {
                    } finally {
                      activeStreams = Math.max(0, activeStreams - 1);
                      console.log(
                        `%c[SpectraLens:Network] ✅ [STREAM COMPLETED] Stream ended (${totalChars} chars, active remaining: ${activeStreams}) -> ${url.slice(0, 100)}`,
                        "color: #10b981; font-weight: bold;",
                      );
                      window.dispatchEvent(
                        new CustomEvent("spectralens:network_completed", {
                          detail: { url, totalChars, activeStreams, timestamp: Date.now() },
                        }),
                      );
                    }
                  })();

                  return new Response(stream1, {
                    status: response.status,
                    statusText: response.statusText,
                    headers: response.headers,
                  });
                }
                return response;
              } catch (err) {
                activeStreams = Math.max(0, activeStreams - 1);
                throw err;
              }
            }
            return origFetch.apply(this, args);
          };
        }

        // 2. Intercept XMLHttpRequest
        const origOpen = XMLHttpRequest.prototype.open;
        const origSend = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.open = function (method, url, ...rest) {
          this.__sl_url = url;
          this.__sl_isAi = isAiUrl(url);
          return origOpen.apply(this, [method, url, ...rest]);
        };

        XMLHttpRequest.prototype.send = function (...args) {
          if (this.__sl_isAi) {
            activeStreams++;
            console.log(
              `%c[SpectraLens:Network] 📡 [STREAM STARTED] (XHR_START) Active requests: ${activeStreams} | URL: ${String(this.__sl_url).slice(0, 100)}`,
              "color: #3b82f6; font-weight: bold;",
            );
            window.dispatchEvent(
              new CustomEvent("spectralens:network_activity", {
                detail: { url: this.__sl_url, status: "started", activeStreams, timestamp: Date.now() },
              }),
            );

            let lastLength = 0;
            this.addEventListener("progress", () => {
              const currentLength = this.responseText ? this.responseText.length : 0;
              const chunkLen = currentLength - lastLength;
              lastLength = currentLength;
              console.log(
                `%c[SpectraLens:Network] 📦 [STREAM CHUNK] Read ${chunkLen} chars chunk from: ${String(this.__sl_url).slice(0, 70)}`,
                "color: #8b5cf6;",
              );
              window.dispatchEvent(
                new CustomEvent("spectralens:network_chunk", {
                  detail: { url: this.__sl_url, chunkLength: chunkLen, totalChars: currentLength, timestamp: Date.now() },
                }),
              );
            });

            const onComplete = () => {
              activeStreams = Math.max(0, activeStreams - 1);
              console.log(
                `%c[SpectraLens:Network] ✅ [STREAM COMPLETED] Stream ended (${this.responseText?.length || 0} chars, active remaining: ${activeStreams}) -> ${String(this.__sl_url).slice(0, 100)}`,
                "color: #10b981; font-weight: bold;",
              );
              window.dispatchEvent(
                new CustomEvent("spectralens:network_completed", {
                  detail: { url: this.__sl_url, totalChars: this.responseText?.length || 0, activeStreams, timestamp: Date.now() },
                }),
              );
            };

            this.addEventListener("load", onComplete);
            this.addEventListener("error", onComplete);
            this.addEventListener("abort", onComplete);
          }
          return origSend.apply(this, args);
        };
      },
    }).catch(() => {});
  }

  global.injectMainWorldNetworkInterceptor = injectMainWorldNetworkInterceptor;
})(typeof window !== "undefined" ? window : globalThis);
