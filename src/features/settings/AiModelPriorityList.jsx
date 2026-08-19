import PropTypes from "prop-types";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ProviderIcon,
} from "../../components/Icons.jsx";
import { IoSparklesOutline } from "react-icons/io5";

export default function AiModelPriorityList({
  aiList,
  enabledCount,
  maxActive = 3,
  cardBg,
  onToggleModel,
  onMoveUp,
  onMoveDown,
}) {
  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <IoSparklesOutline className="w-3.5 h-3.5 text-blue-500" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            AI Models ({enabledCount}/{maxActive} Active)
          </h3>
        </div>
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            enabledCount >= maxActive
              ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
              : "bg-slate-200/60 dark:bg-white/10 text-slate-600 dark:text-slate-400"
          }`}
        >
          {enabledCount >= maxActive
            ? "Full (3/3)"
            : `${maxActive - enabledCount} slot available`}
        </span>
      </div>

      <div className="space-y-1.5">
        {aiList.map((ai, index) => {
          const isEnabled = ai.enabled;

          return (
            <div
              key={ai.id}
              className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${cardBg} shadow-xs ${
                isEnabled ? "" : "opacity-60 hover:opacity-80"
              }`}
            >
              <div className="flex items-center gap-2.5">
                {/* Priority Shift Buttons */}
                <div className="flex flex-col items-center -space-y-0.5">
                  <button
                    type="button"
                    onClick={() => onMoveUp(index)}
                    disabled={
                      !isEnabled || index === 0 || !aiList[index - 1]?.enabled
                    }
                    className="p-0.5 rounded text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-200/60 dark:hover:bg-white/[0.06] disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-slate-400 transition-colors focus:outline-none cursor-pointer disabled:cursor-not-allowed"
                    title={
                      isEnabled ? "Increase Priority" : "Enable model first"
                    }
                  >
                    <ChevronUpIcon className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onMoveDown(index)}
                    disabled={
                      !isEnabled ||
                      index === aiList.length - 1 ||
                      !aiList[index + 1]?.enabled
                    }
                    className="p-0.5 rounded text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-200/60 dark:hover:bg-white/[0.06] disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-slate-400 transition-colors focus:outline-none cursor-pointer disabled:cursor-not-allowed"
                    title={
                      isEnabled ? "Decrease Priority" : "Enable model first"
                    }
                  >
                    <ChevronDownIcon className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Model Identity */}
                <ProviderIcon
                  id={ai.id}
                  className="w-5 h-5 shrink-0"
                  size={20}
                />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                    {ai.name}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    {isEnabled ? `Priority #${index + 1}` : "Disabled"}
                  </span>
                </div>
              </div>

              {/* Physical Spring Toggle Switch */}
              <button
                type="button"
                onClick={() => onToggleModel(ai.id)}
                className={`relative w-11 h-6 rounded-full transition-colors duration-300 focus:outline-none cursor-pointer p-0.5 shadow-inner ${
                  isEnabled
                    ? "bg-blue-600 dark:bg-blue-500"
                    : "bg-slate-300 dark:bg-slate-700"
                }`}
                title={isEnabled ? `Disable ${ai.name}` : `Enable ${ai.name}`}
              >
                <span
                  className={`block w-5 h-5 rounded-full bg-white transition-transform duration-300 shadow-md ${
                    isEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

AiModelPriorityList.propTypes = {
  aiList: PropTypes.array.isRequired,
  enabledCount: PropTypes.number.isRequired,
  maxActive: PropTypes.number,
  cardBg: PropTypes.string.isRequired,
  onToggleModel: PropTypes.func.isRequired,
  onMoveUp: PropTypes.func.isRequired,
  onMoveDown: PropTypes.func.isRequired,
};
