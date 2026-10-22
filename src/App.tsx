import { useCallback, useEffect, useMemo, useState } from "react";
import { ControlPanel } from "./components/ControlPanel";
import { PosterStage } from "./components/PosterStage";
import { createPosterActions, type PosterState } from "./state/poster";
import { loadInitialPoster, savePoster } from "./lib/storage";
import { useRovingRadioGroup } from "./hooks/useRovingRadioGroup";
import { cx } from "./lib/cx";

type AppView = "design" | "poster";

export default function App() {
  // Estado inicial: enlace compartido → borrador guardado → diseño por defecto
  // (el inicializador perezoso evita un primer frame con el diseño en blanco).
  const [poster, setPoster] = useState<PosterState>(loadInitialPoster);
  const [view, setView] = useState<AppView>("design");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    savePoster(poster);
  }, [poster]);

  const actions = useMemo(() => createPosterActions(setPoster), []);
  const onExportingChange = useCallback((busy: boolean) => setExporting(busy), []);

  const { groupProps, itemProps } = useRovingRadioGroup(
    2,
    view === "design" ? 0 : 1,
    (i) => setView(i === 0 ? "design" : "poster"),
    "Cambiar entre el panel de diseño y el póster",
  );

  return (
    <div className="min-h-dvh bg-[#070912] pb-16 text-[#e7e9f2] lg:grid lg:grid-cols-[minmax(380px,440px)_1fr] lg:pb-0">
      <div className={cx(view === "design" ? "block" : "hidden", "lg:block")}>
        <ControlPanel poster={poster} actions={actions} locked={exporting} />
      </div>

      {/* El póster es la región principal de la página */}
      <main className={cx(view === "poster" ? "block" : "hidden", "lg:block")}>
        <PosterStage poster={poster} actions={actions} onExportingChange={onExportingChange} />
      </main>

      {/* Barra inferior móvil: salta entre diseño y póster sin scroll */}
      <nav
        {...groupProps}
        aria-label="Cambiar de vista"
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-white/10 bg-[#0b0d14]/95 backdrop-blur lg:hidden"
      >
        {(["design", "poster"] as const).map((key, i) => (
          <button
            key={key}
            type="button"
            aria-current={view === key ? "true" : undefined}
            {...itemProps(i)}
            onClick={() => setView(key)}
            className={cx(
              "flex-1 py-3 text-center font-sans text-[13px] font-semibold transition focus-visible:outline-2 focus-visible:outline-[#e8c478]",
              view === key ? "text-[#e8c478]" : "text-[#9aa4bd]",
            )}
          >
            {key === "design" ? "Diseño" : "Póster"}
          </button>
        ))}
      </nav>
    </div>
  );
}
