import PropTypes from "prop-types";
import { ProviderIcon } from "../../components/Icons.jsx";

export default function AiModelSwitchModal({
  confirmSwitchData,
  contrastMode,
  onClose,
  onSelectReplaceId,
  onConfirmSwitch,
}) {
  if (!confirmSwitchData) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 dark:bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-[320px] rounded-2xl border shadow-2xl p-4.5 space-y-4 animate-scale-up ${
          contrastMode === "solid"
            ? "bg-white dark:bg-[#191c25] border-slate-200/90 dark:border-white/10"
            : "bg-white/95 dark:bg-[#191c25]/95 backdrop-blur-md border-slate-200/80 dark:border-white/10"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <ProviderIcon id={confirmSwitchData.targetProvider.id} className="w-5 h-5" size={20} />
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
              Switch Active AI Model
            </h4>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
              Max 3 models can run in parallel. Select which model to replace with{" "}
              <strong className="text-blue-600 dark:text-blue-400 font-bold">
                {confirmSwitchData.targetProvider.name}
              </strong>
              :
            </p>
          </div>
        </div>

        {/* Radio Option List */}
        <div className="space-y-1.5 pt-1">
          {confirmSwitchData.activeProviders.map((activeProv) => {
            const isSelected = confirmSwitchData.selectedReplaceId === activeProv.id;

            return (
              <button
                key={activeProv.id}
                type="button"
                onClick={() => onSelectReplaceId(activeProv.id)}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? "bg-blue-600/10 border-blue-500 text-blue-600 dark:text-blue-400 shadow-xs"
                    : "bg-slate-100/80 dark:bg-white/[0.04] border-slate-200/70 dark:border-white/[0.06] text-slate-700 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-white/10"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <ProviderIcon id={activeProv.id} className="w-4 h-4 shrink-0" size={16} />
                  <span>{activeProv.name}</span>
                </div>
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    isSelected
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-slate-400 dark:border-slate-500"
                  }`}
                >
                  {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-white/[0.06]">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() =>
              onConfirmSwitch(
                confirmSwitchData.selectedReplaceId,
                confirmSwitchData.targetProvider,
              )
            }
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xs hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
          >
            Switch Model
          </button>
        </div>
      </div>
    </div>
  );
}

AiModelSwitchModal.propTypes = {
  confirmSwitchData: PropTypes.object,
  contrastMode: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  onSelectReplaceId: PropTypes.func.isRequired,
  onConfirmSwitch: PropTypes.func.isRequired,
};
