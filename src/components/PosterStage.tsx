import { useCallback, useEffect, useRef, useState } from "react";
import { useCelestialMap } from "../hooks/useCelestialMap";
import {
  computeMapGeometry,
  PREVIEW_WIDTH,
  THEMES,
} from "../lib/celestialConfig";
import { buildPosterFileName, exportPoster } from "../lib/exportPoster";
import { buildPdfFileName, exportPosterToPdf } from "../lib/exportPosterPdf";
import { circleDiameterFor, getPosterLayout } from "../lib/posterLayout";
import { renderPoster } from "../lib/posterRender";
import {
  DEFAULT_POSTER_SIZE_ID,
  describePosterSize,
  getPosterSize,
  POSTER_SIZES,
} from "../lib/posterSizes";
import { withCelestialResolution } from "../lib/celestialMap";
import type { PosterState } from "../state/poster";
import { Button, cx, InlineNote } from "./ui";

const LAYOUT = getPosterLayout(PREVIEW_WIDTH);

type ExportKind = "idle" | "pdf" | "png";

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
    />
  );
}

export function PosterStage({ poster }: { poster: PosterState }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  const [mapVersion, setMapVersion] = useState(0);
  const [fontsReady, setFontsReady] = useState(false);
  const [sizeId, setSizeId] = useState(DEFAULT_POSTER_SIZE_ID);
  const [exporting, setExporting] = useState<ExportKind>("idle");
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
  const size = getPosterSize(sizeId);
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

  /** Cede un frame al navegador para que el spinner se pinte antes del trabajo pesado. */
  const yieldToBrowser = () =>
    new Promise<void>((resolve) => requestAnimationFrame(() => window.setTimeout(resolve, 0)));

  const handleExportPdf = useCallback(async () => {
    if (exporting !== "idle") return;
    setExporting("pdf");
    setExportError(null);

    try {
      await yieldToBrowser();

      const host = hostRef.current;
      const mapCanvas = readMapCanvas();
      if (!host || !mapCanvas) {
        throw new Error("El mapa celeste aún no está listo. Espera unos segundos.");
      }

      // El mapa se vuelve a renderizar a la resolución exacta del formato
      // (círculo del póster a 300 DPI) y se restaura después.
      const exportGeometry = computeMapGeometry(poster.projection, circleDiameterFor(size.widthPx));

      await withCelestialResolution(
        { host, geometry, theme, flags: poster.flags },
        { host, geometry: exportGeometry, theme, flags: poster.flags },
        async () => {
          await exportPosterToPdf({
            size,
            theme,
            title: poster.title,
            subtitle: poster.subtitle,
            coordinates: poster.coordinates,
            mapCanvas,
            mapRadiusRatio: exportGeometry.radiusRatio,
            placeholderLabel,
            fileName: buildPdfFileName(poster.title, size),
          });
        },
      );
    } catch (caught) {
      setExportError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setExporting("idle");
    }
  }, [exporting, geometry, poster, size, theme, placeholderLabel]);

  const handleExportPng = useCallback(async () => {
    if (exporting !== "idle") return;
    setExporting("png");
    setExportError(null);

    try {
      await yieldToBrowser();
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
      setExporting("idle");
    }
  }, [exporting, geometry, poster, theme, placeholderLabel]);

  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center gap-6 px-6 py-10 lg:overflow-y-auto lg:px-12">
      <div className="flex w-full max-w-[620px] items-end justify-between gap-4">
        <div>
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.24em] text-[#9aa4bd]">
            Vista previa
          </p>
          <p className="mt-1 font-display text-2xl text-white">{poster.title || "Sin título"}</p>
        </div>
        <p className="shrink-0 font-sans text-[11px] uppercase tracking-[0.14em] text-[#66708a]">
          {size.label} · 300 DPI
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

      {/* Formatos de impresión */}
      <div className="w-full max-w-[620px] space-y-2.5">
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.24em] text-[#9aa4bd]">
            Formato de impresión
          </p>
          <p className="font-sans text-[11px] tracking-[0.1em] text-[#66708a]">
            {describePosterSize(size)}
          </p>
        </div>

        <div role="radiogroup" aria-label="Formato de impresión" className="grid grid-cols-4 gap-2">
          {POSTER_SIZES.map((option) => {
            const selected = option.id === size.id;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setSizeId(option.id)}
                className={cx(
                  "rounded-lg border px-2 py-2 text-center transition",
                  selected
                    ? "border-[#e8c478] bg-[#e8c478]/12 text-[#f6e7c6]"
                    : "border-white/12 bg-white/[0.03] text-[#9aa4bd] hover:border-white/25 hover:text-white",
                )}
              >
                <span className="block text-sm font-semibold">{option.shortLabel}</span>
                <span className="block text-[10px] tracking-[0.14em] opacity-70">cm</span>
              </button>
            );
          })}
        </div>

        <p className="text-xs leading-relaxed text-[#7f89a3]">
          El PDF se genera a tamaño real ({size.label}) con el cielo recalculado a 300 DPI; las
          medidas del papel coinciden con las del documento.
        </p>
      </div>

      {/* Estado + acciones */}
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
      </div>

      {exportError ? <InlineNote tone="danger">{exportError}</InlineNote> : null}

      <div className="flex w-full max-w-[620px] flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[#66708a]">
          PDF listo para imprenta · PNG opcional 2400 × 3200 px
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="quiet"
            onClick={() => void handleExportPng()}
            disabled={exporting !== "idle" || status !== "ready"}
          >
            {exporting === "png" ? "Generando PNG…" : "PNG"}
          </Button>
          <Button
            type="button"
            onClick={() => void handleExportPdf()}
            disabled={exporting !== "idle" || status !== "ready"}
            className="min-w-[190px]"
          >
            {exporting === "pdf" ? (
              <>
                <Spinner />
                Generando PDF de alta calidad…
              </>
            ) : (
              `Descargar PDF ${size.shortLabel}`
            )}
          </Button>
        </div>
      </div>

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
