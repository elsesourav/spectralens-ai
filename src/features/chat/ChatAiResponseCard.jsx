import PropTypes from "prop-types";
import { IoCheckmark, IoCopyOutline } from "react-icons/io5";
import { ProviderIcon } from "../../components/Icons.jsx";
import UTILS from "../../utils/utilsModule.js";

export default function ChatAiResponseCard({
  activeAiResponseContent,
  isLoading,
  activeAiProviderMetadata,
  copiedProviderId,
  selectedProvider,
  messageTime,
  contrastMode,
  onCopyAiResponse,
}) {
  if (!activeAiResponseContent && (!isLoading || activeAiResponseContent)) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2 animate-fade-in">
      <div
        className={`p-4 rounded-2xl border shadow-xs space-y-3 ${
          contrastMode === "solid"
            ? "bg-white dark:bg-[#181920] border-slate-200/90 dark:border-white/[0.08]"
            : contrastMode === "medium"
              ? "bg-white/70 dark:bg-[#181920]/70 backdrop-blur-md border-slate-200/60 dark:border-white/[0.07]"
              : "bg-white/30 dark:bg-white/[0.05] backdrop-blur-sm border-slate-200/30 dark:border-white/[0.05]"
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
        {activeAiResponseContent ? (
          <div
            className="spectralens-response-wrapper text-slate-900 dark:text-slate-100 overflow-x-auto leading-relaxed font-normal select-text cursor-text"
            dangerouslySetInnerHTML={{
              __html: UTILS.sanitizeHtml(
                typeof UTILS.markdownToHtml === "function"
                  ? UTILS.markdownToHtml(activeAiResponseContent)
                  : activeAiResponseContent,
              ),
            }}
          />
        ) : (
          <div className="flex items-center gap-2 py-3">
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
          </div>
        )}

        {/* Footer Actions */}
        {activeAiResponseContent && (
          <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-white/[0.04] text-[10px] text-slate-500 dark:text-slate-400 font-medium">
            <button
              type="button"
              onClick={onCopyAiResponse}
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-md hover:bg-slate-100 dark:hover:bg-white/[0.08] hover:text-blue-600 dark:hover:text-blue-400 transition-all cursor-pointer focus:outline-none"
              title="Copy answer"
            >
              {copiedProviderId === selectedProvider ? (
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
}

ChatAiResponseCard.propTypes = {
  activeAiResponseContent: PropTypes.string,
  isLoading: PropTypes.bool.isRequired,
  activeAiProviderMetadata: PropTypes.object.isRequired,
  copiedProviderId: PropTypes.string,
  selectedProvider: PropTypes.string,
  messageTime: PropTypes.string.isRequired,
  contrastMode: PropTypes.string,
  onCopyAiResponse: PropTypes.func.isRequired,
};
