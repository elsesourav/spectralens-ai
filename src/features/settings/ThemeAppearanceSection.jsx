import PropTypes from "prop-types";
import {
  IoMoonOutline,
  IoSunnyOutline,
  IoColorPaletteOutline,
} from "react-icons/io5";
import { SystemThemeIcon } from "../../components/Icons.jsx";

export default function ThemeAppearanceSection({
  theme,
  contrastMode,
  cardBg,
  onChangeTheme,
  onChangeContrastMode,
}) {
  const themeOptions = [
    { id: "dark", label: "Dark", icon: IoMoonOutline },
    { id: "light", label: "Light", icon: IoSunnyOutline },
    { id: "system", label: "System", icon: SystemThemeIcon },
  ];

  const contrastOptions = [
    { id: "solid", label: "Solid", desc: "100% Opaque" },
    { id: "medium", label: "Medium", desc: "Soft Glass" },
    { id: "transparent", label: "Transparent", desc: "Clear Glass" },
  ];

  return (
    <section className="space-y-2.5">
      <div className="flex items-center gap-1.5">
        <IoColorPaletteOutline className="w-3.5 h-3.5 text-purple-500" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
          Appearance & Theme
        </h3>
      </div>

      <div className={`p-3.5 rounded-2xl border shadow-xs space-y-3.5 ${cardBg}`}>
        {/* Theme Mode Grid */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">
              Color Theme
            </h4>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 capitalize">
              {theme || "system"}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
          {themeOptions.map((opt) => {
            const Icon = opt.icon;
            const isSelected = theme === opt.id;

            return (
              <button
                key={opt.id}
                onClick={() => onChangeTheme(opt.id)}
                className={`flex flex-col items-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold border transition-all focus:outline-none cursor-pointer ${
                  isSelected
                    ? "bg-blue-600 text-white border-blue-500 shadow-xs"
                    : "bg-slate-100/90 dark:bg-white/[0.05] border-slate-200/80 dark:border-white/[0.07] text-slate-800 dark:text-slate-200 hover:bg-slate-200/90 dark:hover:bg-white/10"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Transparency Mode Grid */}
      <div className="pt-2 border-t border-slate-100 dark:border-white/[0.05] space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-900 dark:text-white">
            Transparency Mode
          </h4>
          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 capitalize">
            {contrastMode || "medium"}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {contrastOptions.map((opt) => {
            const isSelected = (contrastMode || "medium") === opt.id;

            return (
              <button
                key={opt.id}
                onClick={() => onChangeContrastMode(opt.id)}
                className={`flex flex-col items-center gap-0.5 py-2 px-1.5 rounded-xl text-xs border transition-all focus:outline-none cursor-pointer ${
                  isSelected
                    ? "bg-blue-600 text-white border-blue-500 shadow-xs"
                    : "bg-slate-100/90 dark:bg-white/[0.05] border-slate-200/80 dark:border-white/[0.07] text-slate-800 dark:text-slate-200 hover:bg-slate-200/90 dark:hover:bg-white/10"
                }`}
              >
                <span className="font-bold">{opt.label}</span>
                <span
                  className={`text-[10px] font-medium ${
                    isSelected ? "text-blue-100" : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {opt.desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      </div>
    </section>
  );
}

ThemeAppearanceSection.propTypes = {
  theme: PropTypes.string.isRequired,
  contrastMode: PropTypes.string,
  cardBg: PropTypes.string.isRequired,
  onChangeTheme: PropTypes.func.isRequired,
  onChangeContrastMode: PropTypes.func.isRequired,
};
