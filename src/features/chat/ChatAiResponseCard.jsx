import { memo, useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import {
  IoCheckmark,
  IoCopyOutline,
  IoLockClosedOutline,
  IoOpenOutline,
  IoRefreshOutline,
} from "react-icons/io5";
import { ProviderIcon } from "../../components/Icons.jsx";
import UTILS from "../../utils/utilsModule.js";

const DEFAULT_LOGIN_URLS = {
  chatgpt: "https://chatgpt.com/auth/login",
  claude: "https://claude.ai/login",
  gemini: "https://gemini.google.com/",
  grok: "https://grok.com/",
  perplexity: "https://www.perplexity.ai/",
  google: "https://www.google.com/",
};

const ChatAiResponseCard = memo(function ChatAiResponseCard({
  activeAiResponseContent,
  isLoading,
  activeAiProviderMetadata,
  copiedProviderId,
  selectedProvider,
  messageTime,
  contrastMode,
  turnId,
  onCopyAiResponse,
  onRetryProvider,
}) {
  if (!activeAiResponseContent && !isLoading) {
    return null;
  }

  // Detect whether this response indicates an authentication/login requirement
  const authInfo = useMemo(() => {
    if (!activeAiResponseContent) return { isAuthRequired: false, loginUrl: "" };

    const markerMatch = activeAiResponseContent.match(
      /<!--SPECTRALENS_AUTH_REQUIRED:([^:]+):([^>]+)-->/,
    );
    const hasAuthText =
      activeAiResponseContent.includes("Please log in to") ||
      activeAiResponseContent.includes("Sign-in required for") ||
      activeAiResponseContent.includes("Make sure you are signed in");

    if (markerMatch || hasAuthText) {
      let url = "";
      if (markerMatch && markerMatch[2]) {
        try {
          url = decodeURIComponent(markerMatch[2]);
        } catch {}
      }
      if (!url) {
        const normKey = (activeAiProviderMetadata?.id || selectedProvider || "").toLowerCase();
        url = DEFAULT_LOGIN_URLS[normKey] || "https://google.com";
      }
      return { isAuthRequired: true, loginUrl: url };
    }

    return { isAuthRequired: false, loginUrl: "" };
  }, [activeAiResponseContent, activeAiProviderMetadata?.id, selectedProvider]);

  // Handle direct login tab opening
  const handleOpenLoginPage = useCallback(() => {
    const targetUrl =
      authInfo.loginUrl ||
      DEFAULT_LOGIN_URLS[
        (activeAiProviderMetadata?.id || selectedProvider || "").toLowerCase()
      ] ||
      "https://google.com";

    try {
      if (typeof UTILS !== "undefined" && typeof UTILS.pagePostMessage === "function") {
        UTILS.pagePostMessage("IF_B_OPEN_LOGIN_PAGE", {
          url: targetUrl,
          provider: activeAiProviderMetadata?.id || selectedProvider,
        });
      } else if (typeof window !== "undefined") {
        window.open(targetUrl, "_blank", "noopener,noreferrer");
      }
    } catch {
      window.open(targetUrl, "_blank", "noopener,noreferrer");
    }
  }, [authInfo.loginUrl, activeAiProviderMetadata?.id, selectedProvider]);

  // Handle retry query for this provider
  const handleRetry = useCallback(() => {
    if (typeof onRetryProvider === "function") {
      onRetryProvider(activeAiProviderMetadata?.id || selectedProvider, turnId);
    }
  }, [onRetryProvider, activeAiProviderMetadata?.id, selectedProvider, turnId]);

  // Clean raw markdown if auth required is embedded
  const cleanResponseContent = useMemo(() => {
    if (!activeAiResponseContent) return "";
    return activeAiResponseContent.replace(
      /<!--SPECTRALENS_AUTH_REQUIRED:[^>]+-->\n?/g,
      "",
    );
  }, [activeAiResponseContent]);

  // Directly sanitize and render the rich extracted HTML as-is
  const sanitizedHtml = useMemo(() => {
    if (!cleanResponseContent) return null;
    return { __html: UTILS.sanitizeHtml(cleanResponseContent) };
  }, [cleanResponseContent]);

  // Stable copy handler that reads current content and provider from props
  const handleCopy = useCallback(() => {
    onCopyAiResponse(activeAiResponseContent, selectedProvider);
  }, [onCopyAiResponse, activeAiResponseContent, selectedProvider]);

  // Handle 1-click code block copy inside the response card
  const handleContentClick = useCallback((e) => {
    const copyBtn = e.target.closest(".spectralens-code-copy-btn");
    if (!copyBtn) return;

    e.preventDefault();
    e.stopPropagation();

    const codeCard = copyBtn.closest(".spectralens-code-card");
    const codeEl = codeCard?.querySelector("pre code") || codeCard?.querySelector("pre");
    if (!codeEl) return;

    const rawCode = (codeEl.textContent || "").replace(/^\n+|\n+$/g, "");
    if (!rawCode) return;

    const showCopiedFeedback = () => {
      const originalHtml = copyBtn.innerHTML;
      copyBtn.innerHTML = `<span class="text-emerald-500 font-semibold">✓ Copied!</span>`;
      setTimeout(() => {
        copyBtn.innerHTML = originalHtml;
      }, 2000);
    };

    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      navigator.clipboard.writeText(rawCode).then(showCopiedFeedback).catch(() => {
        try {
          const textarea = document.createElement("textarea");
          textarea.value = rawCode;
          textarea.style.position = "fixed";
          textarea.style.left = "-9999px";
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand("copy");
          document.body.removeChild(textarea);
          showCopiedFeedback();
        } catch {}
      });
    } else {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = rawCode;
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        showCopiedFeedback();
      } catch {}
    }
  }, []);

  return (
    <div className="flex flex-col gap-2 animate-fade-in">
      <div
        className={`p-4 rounded-2xl border shadow-xs space-y-3 ${
          contrastMode === "solid"
            ? "bg-white dark:bg-[#181920] border-slate-200/90 dark:border-white/[0.08]"
            : contrastMode === "medium"
              ? "bg-white/95 dark:bg-[#181920]/95 border-slate-200/60 dark:border-white/[0.07]"
              : "bg-white/80 dark:bg-white/[0.08] border-slate-200/30 dark:border-white/[0.05]"
        }`}
      >
        {/* Provider Title Header */}
        <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-white/[0.04]">
          <div className="flex items-center gap-2">
            <ProviderIcon
              id={activeAiProviderMetadata.id}
              className="w-4 h-4 shrink-0"
              size={18}
            />
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              {activeAiProviderMetadata.name}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isLoading && !activeAiResponseContent && (
              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold animate-pulse">
                Generating answer...
              </span>
            )}
          </div>
        </div>

        {/* Answer Content */}
        {authInfo.isAuthRequired ? (
          <div className="p-4 rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/[0.08] via-orange-500/[0.04] to-purple-500/[0.06] dark:border-amber-400/25 space-y-3.5 animate-fade-in shadow-xs">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                <IoLockClosedOutline className="w-5 h-5" />
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Sign-in Required
                  </h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300">
                    Not Logged In
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Please log in to your{" "}
                  <strong>{activeAiProviderMetadata.name}</strong> account in
                  your browser to start chatting with this model.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleOpenLoginPage}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xs hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
              >
                <IoOpenOutline className="w-4 h-4" />
                <span>Log In to {activeAiProviderMetadata.name}</span>
              </button>
              <button
                type="button"
                onClick={handleRetry}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 active:scale-95 transition-all cursor-pointer"
                title="Retry asking question"
              >
                <IoRefreshOutline className="w-4 h-4" />
                <span>Retry</span>
              </button>
            </div>
          </div>
        ) : activeAiResponseContent ? (
          <div
            className="spectralens-response-wrapper text-slate-900 dark:text-slate-100 overflow-x-hidden break-words leading-relaxed font-normal select-text cursor-text max-w-full"
            dangerouslySetInnerHTML={sanitizedHtml}
            onClick={handleContentClick}
          />
        ) : (
          <div className="space-y-2.5 py-2">
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-2 h-2 rounded-full bg-blue-500 animate-bounce"
                style={{ animationDelay: "0ms" }}
              />
              <div
                className="w-2 h-2 rounded-full bg-blue-500 animate-bounce"
                style={{ animationDelay: "150ms" }}
              />
              <div
                className="w-2 h-2 rounded-full bg-blue-500 animate-bounce"
                style={{ animationDelay: "300ms" }}
              />
              <span className="text-[11px] text-blue-600 dark:text-blue-400 font-bold ml-1 animate-pulse">
                Thinking & generating answer...
              </span>
            </div>
            <div className="h-3 bg-gradient-to-r from-blue-500/15 via-indigo-500/20 to-blue-500/15 dark:from-white/10 dark:via-white/15 dark:to-white/10 rounded-md w-11/12 animate-pulse" />
            <div className="h-3 bg-gradient-to-r from-blue-500/15 via-indigo-500/20 to-blue-500/15 dark:from-white/10 dark:via-white/15 dark:to-white/10 rounded-md w-3/4 animate-pulse" />
            <div className="h-3 bg-gradient-to-r from-blue-500/15 via-indigo-500/20 to-blue-500/15 dark:from-white/10 dark:via-white/15 dark:to-white/10 rounded-md w-4/5 animate-pulse" />
          </div>
        )}

        {/* Footer Actions */}
        {activeAiResponseContent && !authInfo.isAuthRequired && (
          <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-white/[0.04] text-[10px] text-slate-500 dark:text-slate-400 font-medium">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-md hover:bg-slate-100 dark:hover:bg-white/[0.08] hover:text-blue-600 dark:hover:text-blue-400 transition-all cursor-pointer focus:outline-none"
              title="Copy answer"
            >
              {copiedProviderId === activeAiProviderMetadata.id ? (
                <>
                  <IoCheckmark className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                    Copied
                  </span>
                </>
              ) : (
                <>
                  <IoCopyOutline className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
            <span>{messageTime}</span>
          </div>
        )}
      </div>
    </div>
  );
});

export default ChatAiResponseCard;

ChatAiResponseCard.propTypes = {
  activeAiResponseContent: PropTypes.string,
  isLoading: PropTypes.bool.isRequired,
  activeAiProviderMetadata: PropTypes.object.isRequired,
  copiedProviderId: PropTypes.string,
  selectedProvider: PropTypes.string,
  messageTime: PropTypes.string.isRequired,
  contrastMode: PropTypes.string,
  turnId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onCopyAiResponse: PropTypes.func.isRequired,
  onRetryProvider: PropTypes.func,
};
