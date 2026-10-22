import { useRovingRadioGroup } from "../hooks/useRovingRadioGroup";
import { cx } from "../lib/cx";
import { THEMES, THEME_IDS, type PosterThemeId } from "../lib/celestialConfig";

/**
 * Muestra circular bicolor que representa el contraste real de la plantilla:
 * la mitad exterior es el papel (`poster.bg`) y el disco interior el cielo
 * (`sky.bg`) con una estrella en el color de las estrellas.
 */
function ThemeSwatch({ themeId }: { themeId: PosterThemeId }) {
  const theme = THEMES[themeId];
  const { poster, sky } = theme;

  return (
    <span
      aria-hidden="true"
      className="relative block h-10 w-10 shrink-0 rounded-full ring-1 ring-inset ring-white/20"
      style={{ backgroundColor: poster.bg }}
    >
      <span className="absolute inset-[5px] rounded-full" style={{ backgroundColor: sky.bg }} />
      {/* Tres "estrellas" en el color del preset, dos de ellas sobre el filete del anillo */}
      <span
        className="absolute left-[17px] top-[16px] h-[5px] w-[5px] rounded-full"
        style={{ backgroundColor: sky.star }}
      />
      <span
        className="absolute left-[11px] top-[24px] h-[3px] w-[3px] rounded-full"
        style={{ backgroundColor: sky.star, opacity: 0.75 }}
      />
      <span
        className="absolute left-[25px] top-[13px] h-[3px] w-[3px] rounded-full"
        style={{ backgroundColor: poster.accent }}
      />
    </span>
  );
}

/**
 * Rejilla de plantillas (presets): un clic transforma toda la estética del
 * póster —papel, cielo, estrellas, líneas y tipografía— sin tocar parámetros
 * sueltos. El cambio viaja al motor con `Celestial.apply()` (repintado, sin
 * recargar datos) y a la exportación con el mismo objeto de plantilla.
 */
export function ThemeSelector({
  value,
  onChange,
}: {
  value: PosterThemeId;
  onChange: (value: PosterThemeId) => void;
}) {
  const { groupProps, itemProps } = useRovingRadioGroup(
    THEME_IDS.length,
    THEME_IDS.indexOf(value),
    (i) => onChange(THEME_IDS[i]),
    "Plantilla del póster",
  );
  return (
    <div {...groupProps} className="grid grid-cols-2 gap-2">
      {THEME_IDS.map((key, i) => {
        const theme = THEMES[key];
        const selected = key === value;

        return (
          <button
            key={key}
            type="button"
            aria-checked={selected}
            onClick={() => onChange(key)}
            {...itemProps(i)}
            className={cx(
              "relative flex items-center gap-2.5 rounded-lg border px-2.5 py-2.5 text-left transition focus-visible:outline-2 focus-visible:outline-[#e8c478] focus-visible:outline-offset-2",
              selected
                ? "border-[#e8c478] bg-[#e8c478]/10 ring-1 ring-[#e8c478]/45"
                : "border-white/12 bg-white/[0.03] hover:border-white/25",
            )}
          >
            <ThemeSwatch themeId={key} />

            <span className="min-w-0">
              <span
                className={cx(
                  "block font-sans text-[12.5px] font-semibold leading-tight",
                  selected ? "text-[#f6e7c6]" : "text-white/90",
                )}
              >
                {theme.label}
              </span>
              <span
                className={cx(
                  "mt-0.5 block truncate font-sans text-[10px] uppercase tracking-[0.12em]",
                  selected ? "text-[#e8c478]/85" : "text-[#7f89a3]",
                )}
              >
                {theme.paperLabel}
              </span>
            </span>

            {/* Indicador de selección: check sobre el canto superior derecho */}
            <span
              aria-hidden="true"
              className={cx(
                "absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#e8c478] text-[11px] font-bold leading-none text-[#0b0d14] shadow transition",
                selected ? "scale-100 opacity-100" : "scale-75 opacity-0",
              )}
            >
              ✓
            </span>
          </button>
        );
      })}
    </div>
  );
}
