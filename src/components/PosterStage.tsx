import { useCallback, useEffect, useRef, useState } from "react";
import { useCelestialMap } from "../hooks/useCelestialMap";
import { PREVIEW_WIDTH, THEMES } from "../lib/celestialConfig";
import { buildPosterFileName, exportPoster } from "../lib/exportPoster";
import { getPosterLayout } from "../lib/posterLayout";
import { renderPoster } from "../lib/posterRender";
import type { PosterState } from "../state/poster";
import { Button, cx, InlineNote } from "./ui";

const LAYOUT = getPosterLayout(PREVIEW_WIDTH);

export function PosterStage({ poster }: { poster: PosterState }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  const [mapVersion, setMapVersion] = useState(0);
  const [fontsReady, setFontsReady] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // d3-celestial repinta en varios lotes: se coalescen en un solo frame.
  const onRedraw = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      setMapVersion((value) => value + 1);
    });
  }, []);

  useEffect(
    () => () => {
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  useEffect(() => {
    let alive = true;
    const done = () => {
      if (alive) setFontsReady(true);
    };
    if (document.fonts) {
      void document.fonts.ready.then(done, done);
    } else {
      done();
    }
    return () => {
      alive = false;
    };
  }, []);

  const { status, error, geometry, retry } = useCelestialMap({
    hostRef,
    projection: poster.projection,
    themeId: poster.theme,
    flags: poster.flags,
    dateStr: poster.dateStr,
    timeStr: poster.timeStr,
    utcOffsetMinutes: poster.utcOffsetMinutes,
    latitude: poster.latitude,
    longitude: poster.longitude,
    onRedraw,
  });

  const theme = THEMES[poster.theme];
  const placeholderLabel =
    status === "error" ? "El cielo no pudo renderizarse" : "Preparando el cielo…";

  const readMapCanvas = (): HTMLCanvasElement | null =>
    hostRef.current?.querySelector("canvas") ?? null;

  // La vista previa usa exactamente la misma función de pintado que la exportación.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const frame = window.requestAnimationFrame(() => {
      renderPoster(ctx, {
        width: PREVIEW_WIDTH,
        theme,
        title: poster.title,
        subtitle: poster.subtitle,
        coordinates: poster.coordinates,
        mapCanvas: readMapCanvas(),
        mapRadiusRatio: geometry.radiusRatio,
        placeholderLabel,
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [poster, theme, geometry.radiusRatio, mapVersion, fontsReady, status, placeholderLabel]);

  const handleExport = useCallback(async () => {
    if (exporting) return;
    setExporting(true);
    setExportError(null);
    try {
      const mapCanvas = readMapCanvas();
      if (!mapCanvas) throw new Error("El mapa celeste aún no está listo. Espera unos segundos.");
      await exportPoster({
        theme,
        title: poster.title,
        subtitle: poster.subtitle,
        coordinates: poster.coordinates,
        mapCanvas,
        mapRadiusRatio: geometry.radiusRatio,
        placeholderLabel,
        fileName: buildPosterFileName(poster.title, poster.dateStr),
      });
    } catch (caught) {
      setExportError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setExporting(false);
    }
  }, [exporting, theme, poster, geometry.radiusRatio, placeholderLabel]);

  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center gap-6 px-6 py-10 lg:h-screen lg:overflow-y-auto lg:px-12">
      <div className="flex w-full max-w-[620px] items-end justify-between gap-4">
        <div>
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.24em] text-[#9aa4bd]">
            Vista previa
          </p>
          <p className="mt-1 font-display text-2xl text-white">{poster.title || "Sin título"}</p>
        </div>
        <p className="shrink-0 font-sans text-[11px] uppercase tracking-[0.14em] text-[#66708a]">
          2400 × 3200 px
        </p>
      </div>

      <canvas
        ref={canvasRef}
        width={LAYOUT.width}
        height={LAYOUT.height}
        aria-label="Vista previa del póster con el mapa del firmamento"
        className={cx(
          "block h-auto w-full max-w-[620px] rounded-[3px] ring-1 ring-white/10",
          "shadow-[0_40px_90px_-50px_rgba(0,0,0,0.95)]",
        )}
      />

      <div className="flex w-full max-w-[620px] flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={cx(
              "h-2 w-2 shrink-0 rounded-full",
              status === "ready" ? "bg-[#7dd8a5]" : status === "error" ? "bg-[#ff9b8a]" : "bg-[#e8c478]",
              status === "boot" && "animate-pulse",
            )}
          />
          <p className="truncate text-[13px] text-[#9aa4bd]">
            {status === "ready"
              ? "Cielo sincronizado con el momento y el lugar."
              : status === "error"
                ? (error ?? "Error al inicializar el mapa.")
                : "Cargando el motor del firmamento…"}
          </p>
          {status === "error" ? (
            <Button type="button" variant="quiet" onClick={retry} className="shrink-0 px-3 py-1.5">
              Reintentar
            </Button>
          ) : null}
        </div>

        <Button
          type="button"
          onClick={() => void handleExport()}
          disabled={exporting || status !== "ready"}
        >
          {exporting ? "Generando PNG…" : "Descargar PNG"}
        </Button>
      </div>

      {exportError ? <InlineNote tone="danger">{exportError}</InlineNote> : null}

      {/* Slot oculto: única instancia de d3-celestial; su canvas se compone en la vista previa. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-[9999px] top-0 h-0 w-0 overflow-hidden"
      >
        <div ref={hostRef} id="keistars-sky" />
      </div>
    </section>
  );
}
