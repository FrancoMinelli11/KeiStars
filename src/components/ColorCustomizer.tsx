import { useMemo } from "react";
import type { PosterActions, PosterState } from "../state/poster";
import {
  hasColorOverrides,
  resolveTheme,
  type PosterColorPatch,
  type SkyColorPatch,
} from "../lib/celestialConfig";
import { useRafCallback } from "../hooks/useRafCallback";
import { Button, InlineNote } from "./ui";
import { cx } from "../lib/cx";

/* ------------------------------------------------------------------ */
/* Campos editables                                                    */
/* ------------------------------------------------------------------ */

const POSTER_FIELDS: Array<{ key: keyof PosterColorPatch & string; label: string }> = [
  { key: "bg", label: "Papel" },
  { key: "text", label: "Titular" },
  { key: "muted", label: "Texto secundario" },
  { key: "accent", label: "Acento y filete" },
  { key: "frame", label: "Marco exterior" },
  { key: "ring", label: "Aro del cielo" },
];

const SKY_FIELDS: Array<{ key: keyof SkyColorPatch & string; label: string }> = [
  { key: "bg", label: "Fondo del cielo" },
  { key: "star", label: "Estrellas" },
  { key: "constellationLine", label: "Líneas de constelaciones" },
  { key: "constellationName", label: "Nombres de constelaciones" },
  { key: "graticule", label: "Retícula" },
  { key: "milkyWay", label: "Vía Láctea" },
];

/* ------------------------------------------------------------------ */
/* Contraste (WCAG) para advertir combinaciones ilegibles              */
/* ------------------------------------------------------------------ */

function luminance(hex: string): number {
  const value = Number.parseInt(hex.slice(1), 16);
  const channels = [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(a: string, b: string): number {
  if (!/^#[0-9a-f]{6}$/i.test(a) || !/^#[0-9a-f]{6}$/i.test(b)) return 21;
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/* ------------------------------------------------------------------ */
/* Selector de un color                                                */
/* ------------------------------------------------------------------ */

function ColorField({
  label,
  value,
  presetValue,
  onChange,
  onReset,
}: {
  label: string;
  value: string;
  presetValue: string;
  onChange: (value: string) => void;
  onReset: () => void;
}) {
  const customized = value.toLowerCase() !== presetValue.toLowerCase();
  const { schedule, flush } = useRafCallback(onChange);

  return (
    <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2">
      <label className="sr-only" htmlFor={`color-${label}`}>
        {label}
      </label>
      <input
        id={`color-${label}`}
        type="color"
        value={value}
        onChange={(event) => schedule(event.target.value)}
        onBlur={flush}
        aria-label={label}
        className="h-7 w-7 shrink-0 cursor-pointer rounded border border-white/20 bg-transparent p-0.5"
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-medium text-white/90">{label}</span>
        <span className="block font-mono text-[10px] text-[#7f89a3]">{value.toUpperCase()}</span>
      </span>
      {customized ? (
        <button
          type="button"
          onClick={onReset}
          aria-label={`Restablecer ${label} al valor de la plantilla`}
          title={`Restablecer ${label} al valor de la plantilla`}
          className="shrink-0 rounded px-1.5 py-1 text-sm text-[#9aa4bd] transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-[#e8c478]"
        >
          ↺
        </button>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Panel completo                                                      */
/* ------------------------------------------------------------------ */

/**
 * Personalización de colores del póster: los retoques se fusionan sobre el
 * preset activo (`resolveTheme`) y viajan al motor con `Celestial.apply()`
 * (repintado sin recargar datos) y a la exportación con el mismo objeto.
 */
export function ColorCustomizer({
  poster,
  actions,
}: {
  poster: PosterState;
  actions: PosterActions;
}) {
  const theme = useMemo(
    () => resolveTheme(poster.theme, poster.themeOverrides),
    [poster.theme, poster.themeOverrides],
  );
  const base = useMemo(() => resolveTheme(poster.theme, null), [poster.theme]);
  const customized = hasColorOverrides(poster.themeOverrides);

  const ugly = {
    title: contrastRatio(theme.poster.text, theme.poster.bg) < 3,
    stars: contrastRatio(theme.sky.star, theme.sky.bg) < 3,
    names: contrastRatio(theme.sky.constellationName, theme.sky.bg) < 2,
  };
  const anyUgly = ugly.title || ugly.stars || ugly.names;

  const setPoster = (key: string, value: string) => actions.setThemeColor("poster", key, value);
  const setSky = (key: string, value: string) => actions.setThemeColor("sky", key, value);
  const resetPoster = (key: string) =>
    actions.setThemeColor("poster", key, base.poster[key as keyof typeof base.poster] as string);
  const resetSky = (key: string) =>
    actions.setThemeColor("sky", key, base.sky[key as keyof typeof base.sky] as string);

  return (
    <div
      className={cx(
        "rounded-xl border px-3.5 py-3.5 transition",
        customized ? "border-[#e8c478]/45 bg-[#e8c478]/6" : "border-white/12 bg-white/[0.02]",
      )}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-medium text-white">
          Colores personalizados
          {customized ? (
            <span className="rounded-full bg-[#e8c478]/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#f6e7c6]">
              Personalizado
            </span>
          ) : null}
        </p>
        <Button
          type="button"
          variant="quiet"
          className="px-3 py-1.5 text-xs"
          onClick={actions.resetThemeColors}
          disabled={!customized}
        >
          Restablecer colores
        </Button>
      </div>

      <p className="mb-3 text-xs leading-relaxed text-[#7f89a3]">
        Parte de la plantilla «{base.label}» y ajusta cada color a tu gusto. Al cambiar de plantilla
        los ajustes se reinician.
      </p>

      <p className="mb-1.5 font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9aa4bd]">
        Papel y textos
      </p>
      <div className="grid grid-cols-2 gap-2">
        {POSTER_FIELDS.map((field) => (
          <ColorField
            key={field.key}
            label={field.label}
            value={theme.poster[field.key as keyof typeof theme.poster] as string}
            presetValue={base.poster[field.key as keyof typeof base.poster] as string}
            onChange={(value) => setPoster(field.key, value)}
            onReset={() => resetPoster(field.key)}
          />
        ))}
      </div>

      <p className="mb-1.5 mt-4 font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9aa4bd]">
        Cielo
      </p>
      <div className="grid grid-cols-2 gap-2">
        {SKY_FIELDS.map((field) => (
          <ColorField
            key={field.key}
            label={field.label}
            value={theme.sky[field.key as keyof typeof theme.sky] as string}
            presetValue={base.sky[field.key as keyof typeof base.sky] as string}
            onChange={(value) => setSky(field.key, value)}
            onReset={() => resetSky(field.key)}
          />
        ))}
      </div>

      {anyUgly ? (
        <InlineNote tone="danger">
          Hay combinaciones con poco contraste
          {ugly.title ? " (titular sobre el papel)" : ""}
          {ugly.stars ? " (estrellas sobre el cielo)" : ""}
          {ugly.names ? " (nombres de constelaciones)" : ""} El póster se genera igual, pero puede
          resultar poco legible.
        </InlineNote>
      ) : null}
    </div>
  );
}
