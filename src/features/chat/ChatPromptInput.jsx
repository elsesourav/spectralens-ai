import PropTypes from "prop-types";
import { IoClose, IoSquare } from "react-icons/io5";
import { ElementSelectorIcon, SendPlaneIcon } from "../../components/Icons.jsx";
import ChatContextMentions from "./ChatContextMentions.jsx";

export default function ChatPromptInput({
  input,
  setInput,
  isLoading,
  attachedImage,
  setAttachedImage,
  attachedPage,
  setAttachedPage,
  attachedContextType,
  setAttachedContextType,
  showMentionMenu,
  filteredMentionOptions,
  mentionSelectedIndex,
  mentionMenuRef,
  textareaRef,
  isMultiLineInput,
  contrastMode,
  onKeyDown,
  onChangeInput,
  onSelectMention,
  onOpenSelector,
  onStopFetching,
  onSendMessage,
}) {
  return (
    <div
      className={`p-2.5 border-t shrink-0 relative ${
        contrastMode === "solid"
          ? "bg-slate-100 dark:bg-[#14161e] border-slate-200/90 dark:border-white/[0.08]"
          : "bg-transparent border-slate-200/50 dark:border-white/[0.06]"
      }`}
    >
      {/* Context mention autocomplete list */}
      <ChatContextMentions
        showMentionMenu={showMentionMenu}
        filteredMentionOptions={filteredMentionOptions}
        mentionSelectedIndex={mentionSelectedIndex}
        mentionMenuRef={mentionMenuRef}
        onSelectMention={onSelectMention}
      />

      {/* Screen / Area attachment chip (only shown when not a page context) */}
      {attachedImage && !attachedPage && (
        <div className="flex items-center gap-2 px-3 py-1.5 mb-2 bg-white dark:bg-[#191c25] border border-blue-500/30 dark:border-blue-500/25 rounded-xl shadow-xs animate-in fade-in duration-200">
          <div className="relative w-8 h-6 rounded overflow-hidden border border-slate-300 dark:border-white/10 shrink-0 bg-slate-200 dark:bg-black/30">
            <img src={attachedImage} alt="Attachment" className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate">
              {attachedContextType === "area" ? "Selected Area Attached" : "Screen Attached"}
            </span>
            <span className="text-[9px] text-slate-400 dark:text-slate-500">
              {attachedContextType === "area"
                ? "Visual crop will be sent to AI"
                : "Visual image will be sent to AI"}
            </span>
          </div>
          <button
            onClick={() => {
              setAttachedImage(null);
              setAttachedContextType(null);
            }}
            className="w-5 h-5 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            title="Remove attachment"
          >
            <IoClose className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Single unified Page context chip with thumbnail and metadata in one */}
      {attachedPage && (
        <div className="flex items-center gap-2.5 px-3 py-1.5 mb-2 bg-white dark:bg-[#191c25] border border-blue-500/30 dark:border-blue-500/25 rounded-xl shadow-xs animate-in fade-in duration-200">
          {attachedPage.image ? (
            <div className="relative w-10 h-7 rounded overflow-hidden border border-slate-300 dark:border-white/10 shrink-0 bg-slate-200 dark:bg-black/30">
              <img src={attachedPage.image} alt="Page screenshot" className="w-full h-full object-cover" />
            </div>
          ) : attachedPage.favicon ? (
            <img src={attachedPage.favicon} alt="" className="w-5 h-5 rounded-xs shrink-0 object-contain" />
          ) : (
            <div className="w-8 h-7 rounded-lg bg-blue-50 dark:bg-blue-500/15 border border-blue-500/20 flex items-center justify-center shrink-0 text-sm">
              📄
            </div>
          )}
          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate">
                {attachedPage.title}
              </span>
              <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold shrink-0">
                {attachedPage.wordCount} words
              </span>
            </div>
            <span className="text-[9px] text-slate-400 dark:text-slate-500 truncate">
              {attachedPage.hostname || "Page link & screenshot attached"}
            </span>
          </div>
          <button
            onClick={() => {
              setAttachedPage(null);
              setAttachedContextType(null);
            }}
            className="w-5 h-5 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            title="Remove page context"
          >
            <IoClose className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Input container */}
      <div
        className={`relative flex ${
          isMultiLineInput ? "items-end py-2" : "items-center py-1.5"
        } w-full pl-3 pr-2 min-h-[44px] rounded-2xl border focus-within:border-blue-500 dark:focus-within:border-blue-500/80 focus-within:ring-1 focus-within:ring-blue-500/50 shadow-xs transition-all ${
          contrastMode === "solid"
            ? "bg-white dark:bg-[#191c25] border-slate-200/90 dark:border-white/[0.09]"
            : contrastMode === "medium"
              ? "bg-white/95 dark:bg-[#191c25]/95 border-slate-200/60 dark:border-white/[0.08]"
              : "bg-white/85 dark:bg-white/[0.08] border-slate-200/30 dark:border-white/[0.05]"
        }`}
      >
        <textarea
          ref={textareaRef}
          rows={1}
          value={input}
          onChange={onChangeInput}
          onKeyDown={onKeyDown}
          placeholder="Ask anything... (type @ for screen)"
          className="flex-1 bg-transparent text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 border-0 outline-none pr-1 resize-none custom-scrollbar leading-[20px] py-0 my-auto"
          style={{ minHeight: "20px", maxHeight: "120px", height: "20px" }}
        />

        {input && (
          <button
            onClick={() => setInput("")}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors focus:outline-none cursor-pointer mr-1 shrink-0"
            title="Clear text"
          >
            <IoClose className="w-3.5 h-3.5" />
          </button>
        )}

        <div className="w-[1px] h-5 bg-slate-200 dark:bg-white/10 mx-1.5 shrink-0" />

        <div
          className={`flex ${
            isMultiLineInput
              ? "flex-col items-center gap-1.5 justify-end"
              : "flex-row items-center gap-1"
          } shrink-0 transition-all duration-200`}
        >
          <button
            onClick={onOpenSelector}
            title="Inspect & Select Page Element"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-all focus:outline-none cursor-pointer"
          >
            <ElementSelectorIcon className="w-4 h-4" size={16} />
          </button>

          {isLoading ? (
            <button
              onClick={onStopFetching}
              title="Stop Fetching"
              className="w-7 h-7 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white flex items-center justify-center shadow-xs transition-all focus:outline-none cursor-pointer"
            >
              <IoSquare className="w-3 h-3 text-white fill-current animate-pulse" />
            </button>
          ) : (
            <button
              onClick={() => onSendMessage()}
              disabled={input.trim() === "" && !attachedImage}
              title="Send Prompt"
              className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all focus:outline-none ${
                input.trim() === "" && !attachedImage
                  ? "bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 active:scale-95 text-white shadow-xs cursor-pointer"
              }`}
            >
              <SendPlaneIcon className="w-3.5 h-3.5" size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

ChatPromptInput.propTypes = {
  input: PropTypes.string.isRequired,
  setInput: PropTypes.func.isRequired,
  isLoading: PropTypes.bool.isRequired,
  attachedImage: PropTypes.string,
  setAttachedImage: PropTypes.func.isRequired,
  attachedPage: PropTypes.object,
  setAttachedPage: PropTypes.func.isRequired,
  setAttachedContextType: PropTypes.func.isRequired,
  showMentionMenu: PropTypes.bool.isRequired,
  filteredMentionOptions: PropTypes.array.isRequired,
  mentionSelectedIndex: PropTypes.number.isRequired,
  mentionMenuRef: PropTypes.object.isRequired,
  textareaRef: PropTypes.object.isRequired,
  isMultiLineInput: PropTypes.bool.isRequired,
  contrastMode: PropTypes.string,
  onKeyDown: PropTypes.func.isRequired,
  onChangeInput: PropTypes.func.isRequired,
  onSelectMention: PropTypes.func.isRequired,
  onOpenSelector: PropTypes.func,
  onStopFetching: PropTypes.func.isRequired,
  onSendMessage: PropTypes.func.isRequired,
};
