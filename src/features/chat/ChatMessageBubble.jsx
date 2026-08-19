import { memo, useCallback } from "react";
import PropTypes from "prop-types";
import { IoCheckmark, IoCopyOutline } from "react-icons/io5";

const ChatMessageBubble = memo(function ChatMessageBubble({
  lastQuestion,
  lastQuestionImage,
  lastQuestionPage,
  messageTime,
  isUserCopied,
  turnId,
  onCopyUserQuestion,
}) {
  if (!lastQuestion) return null;

  const handleCopy = useCallback(() => {
    onCopyUserQuestion(lastQuestion, turnId);
  }, [onCopyUserQuestion, lastQuestion, turnId]);

  return (
    <div className="flex flex-col items-end gap-1 animate-fade-in group">
      <div className="user-message-bubble relative max-w-[85%] px-3.5 py-2.5 rounded-2xl rounded-tr-xs bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs select-text">
        {/* Attached page metadata preview with embedded thumbnail (for @page) */}
        {lastQuestionPage ? (
          <div className="flex items-center gap-2.5 mb-2 px-3 py-1.5 rounded-xl bg-white/20 border border-white/20 text-white select-none">
            {lastQuestionPage.image ? (
              <div className="relative w-10 h-7 rounded overflow-hidden border border-white/20 shrink-0 bg-black/20">
                <img
                  src={lastQuestionPage.image}
                  alt="Page screenshot"
                  className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => {
                    try {
                      const w = window.open();
                      w?.document.write(
                        `<html style="background:#0b0d13;display:flex;align-items:center;justify-content:center;height:100%;"><body style="margin:0;"><img src="${lastQuestionPage.image}" style="max-width:95vw;max-height:95vh;border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,0.5);" /></body></html>`,
                      );
                    } catch {}
                  }}
                  title="Click to view full screenshot"
                />
              </div>
            ) : lastQuestionPage.favicon ? (
              <img
                src={lastQuestionPage.favicon}
                alt=""
                className="w-4 h-4 rounded-xs shrink-0 object-contain bg-white/20 p-0.5"
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
            ) : (
              <span className="text-sm shrink-0">📄</span>
            )}
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-[11px] font-semibold truncate leading-tight">
                {lastQuestionPage.title || "Web Page"}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[9px] text-blue-100/90 font-medium truncate">
                  {lastQuestionPage.hostname || "Page Link"}
                </span>
                <span className="text-[9px] text-blue-200/50">•</span>
                <span className="text-[9px] text-blue-200/80">
                  {lastQuestionPage.wordCount || 0} words
                </span>
              </div>
            </div>
          </div>
        ) : lastQuestionImage ? (
          /* Attached standalone image preview (for @screen or @area) */
          <div className="mb-2 rounded-xl overflow-hidden border border-white/20 shadow-xs max-h-36 bg-black/20">
            <img
              src={lastQuestionImage}
              alt="Attached preview"
              className="w-full h-auto max-h-36 object-contain cursor-pointer hover:opacity-95 transition-opacity"
              onClick={() => {
                try {
                  const w = window.open();
                  w?.document.write(
                    `<html style="background:#0b0d13;display:flex;align-items:center;justify-content:center;height:100%;"><body style="margin:0;"><img src="${lastQuestionImage}" style="max-width:95vw;max-height:95vh;border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,0.5);" /></body></html>`,
                  );
                } catch {}
              }}
              title="Click to view full screenshot"
            />
          </div>
        ) : null}

        <p
          className="text-xs leading-relaxed font-normal whitespace-pre-wrap break-words max-h-[7.2em] overflow-y-auto custom-scrollbar pr-1 select-text cursor-text"
          title={lastQuestion}
        >
          {lastQuestion}
        </p>

        <div className="flex items-center justify-between gap-4 mt-2 pt-1.5 border-t border-white/15 text-[10px] text-blue-100 font-medium select-none">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/15 hover:bg-white/25 active:scale-95 transition-all text-white cursor-pointer focus:outline-none"
            title="Copy sent message"
          >
            {isUserCopied ? (
              <>
                <IoCheckmark className="w-3 h-3 text-emerald-300" />
                <span className="text-emerald-200 text-[10px] font-semibold">
                  Copied
                </span>
              </>
            ) : (
              <>
                <IoCopyOutline className="w-3 h-3 text-blue-100" />
                <span>Copy</span>
              </>
            )}
          </button>
          <span>{messageTime}</span>
        </div>
      </div>
    </div>
  );
});

export default ChatMessageBubble;

ChatMessageBubble.propTypes = {
  lastQuestion: PropTypes.string,
  lastQuestionImage: PropTypes.string,
  lastQuestionPage: PropTypes.object,
  messageTime: PropTypes.string.isRequired,
  isUserCopied: PropTypes.bool.isRequired,
  turnId: PropTypes.string,
  onCopyUserQuestion: PropTypes.func.isRequired,
};
