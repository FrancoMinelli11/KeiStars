import { PROJECTIONS, PROJECTION_KEYS, resolveTheme } from "../lib/celestialConfig";
import type { PosterActions, PosterState } from "../state/poster";
import { ColorCustomizer } from "./ColorCustomizer";
import { ThemeSelector } from "./ThemeSelector";
import { Section, Segmented, Toggle } from "./ui";

const FLAG_ITEMS = [
  {
    key: "lines",
    label: "Líneas de constelaciones",
    hint: "Uniones tradicionales entre estrellas.",
  },
  {
    key: "names",
    label: "Nombres de constelaciones",
    hint: "Etiquetas tipográficas sobre el cielo.",
  },
  { key: "grid", label: "Retícula ecuatorial", hint: "Ascensión recta y declinación en el mapa." },
  { key: "milkyway", label: "Vía Láctea", hint: "Banda difusa del plano galáctico." },
] as const;

export function SkySection({ poster, actions }: { poster: PosterState; actions: PosterActions }) {
  const theme = resolveTheme(poster.theme, poster.themeOverrides);
  const projection = PROJECTIONS[poster.projection];

  return (
    <Section
      index="03"
      title="El estilo"
      hint="Proyección, plantilla, colores y detalle cartográfico. Los cambios se aplican al instante sin volver a descargar los datos astronómicos."
    >
      <div>
        <p className="mb-1.5 font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9aa4bd]">
          Proyección
        </p>
        <Segmented
          ariaLabel="Proyección del mapa"
          value={poster.projection}
          options={PROJECTION_KEYS.map((key) => ({ value: key, label: PROJECTIONS[key].label }))}
          onChange={actions.setProjection}
        />
        <p className="mt-2 text-xs leading-relaxed text-[#7f89a3]">{projection.hint}</p>
      </div>

      <div>
        <p className="mb-1.5 font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9aa4bd]">
          Plantilla
        </p>
        <ThemeSelector value={poster.theme} onChange={actions.setTheme} />
        <p className="mt-2 text-xs leading-relaxed text-[#7f89a3]">{theme.hint}</p>
      </div>

      <ColorCustomizer poster={poster} actions={actions} />

      <div className="space-y-2.5 pt-1">
        {FLAG_ITEMS.map((item) => (
          <Toggle
            key={item.key}
            label={item.label}
            hint={item.hint}
            checked={poster.flags[item.key]}
            onChange={() => actions.toggleFlag(item.key)}
          />
        ))}
      </div>
    </Section>
  );
}
