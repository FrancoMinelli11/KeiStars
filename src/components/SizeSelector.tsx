import { useRovingRadioGroup } from "../hooks/useRovingRadioGroup";
import { cx } from "../lib/cx";
import { getPosterSize, describePosterSize, POSTER_SIZES } from "../lib/posterSizes";
import { Toggle } from "./ui";

export interface SizeSelectorProps {
  sizeId: string;
  onSizeChange: (sizeId: string) => void;
  /** Sangrado de imprenta de 3 mm para el PDF. */
  bleedMm: number;
  onBleedChange: (on: boolean) => void;
  /** Marcas de corte en las esquinas del PDF (requieren sangrado). */
  cropMarks: boolean;
  onCropMarksChange: (on: boolean) => void;
  locked?: boolean;
}

/** Miniatura de la proporción de papel (w × h) con altura fija. */
function RatioThumb({
  widthCm,
  heightCm,
  active,
}: {
  widthCm: number;
  heightCm: number;
  active: boolean;
}) {
  const height = 26;
  const width = Math.round((height * widthCm) / heightCm);
  return (
    <span
      aria-hidden="true"
      className={cx(
        "mx-auto block rounded-[2px] border",
        active ? "border-[#e8c478]" : "border-white/25",
      )}
      style={{ height, width }}
    />
  );
}

/**
 * Selector de formato de impresión (cm paper) + opciones de imprenta del PDF.
 * Cada botón muestra la proporción real del formato, no solo su texto.
 */
export function SizeSelector({
  sizeId,
  onSizeChange,
  bleedMm,
  onBleedChange,
  cropMarks,
  onCropMarksChange,
  locked,
}: SizeSelectorProps) {
  const size = getPosterSize(sizeId);
  const activeIndex = POSTER_SIZES.findIndex((option) => option.id === sizeId);
  const { groupProps, itemProps } = useRovingRadioGroup(
    POSTER_SIZES.length,
    activeIndex < 0 ? 0 : activeIndex,
    (i) => onSizeChange(POSTER_SIZES[i].id),
    "Formato de impresión",
  );

  return (
    <div className="w-full space-y-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.24em] text-[#9aa4bd]">
          Formato de impresión
        </p>
        <p className="font-sans text-[11px] tracking-[0.1em] text-[#7f89a3]">
          {describePosterSize(size)}
        </p>
      </div>

      <div
        {...groupProps}
        aria-disabled={locked || undefined}
        className={cx("grid grid-cols-4 gap-2", locked && "pointer-events-none opacity-60")}
      >
        {POSTER_SIZES.map((option, i) => {
          const selected = option.id === sizeId;
          return (
            <button
              key={option.id}
              type="button"
              aria-checked={selected}
              disabled={locked}
              onClick={() => onSizeChange(option.id)}
              {...itemProps(i)}
              className={cx(
                "rounded-lg border px-2 pt-2 pb-1.5 text-center transition focus-visible:outline-2 focus-visible:outline-[#e8c478] focus-visible:outline-offset-2",
                selected
                  ? "border-[#e8c478] bg-[#e8c478]/12 text-[#f6e7c6]"
                  : "border-white/12 bg-white/[0.03] text-[#9aa4bd] hover:border-white/25 hover:text-white",
              )}
            >
              <RatioThumb widthCm={option.widthCm} heightCm={option.heightCm} active={selected} />
              <span className="mt-1 block text-xs font-semibold">{option.shortLabel}</span>
              <span className="block text-[10px] tracking-[0.14em] opacity-70">cm</span>
            </button>
          );
        })}
      </div>

      <div className="space-y-2 pt-1">
        <Toggle
          label="Sangrado de imprenta (3 mm)"
          hint="El PDF crece 3 mm por lado con papel extendido; el corte entra sin dañar el diseño."
          checked={bleedMm > 0}
          onChange={onBleedChange}
        />
        <Toggle
          label="Marcas de corte"
          hint="Pequeñas guías en las esquinas para la guillotina (requieren sangrado)."
          checked={bleedMm > 0 && cropMarks}
          onChange={onCropMarksChange}
        />
      </div>

      <p className="text-xs leading-relaxed text-[#7f89a3]">
        El PDF se genera a tamaño real ({size.label}) con el cielo recalculado a 300 DPI; las
        medidas del papel coinciden con las del documento (color RGB; conviértelo a CMYK en imprenta
        si te lo piden).
      </p>
    </div>
  );
}
