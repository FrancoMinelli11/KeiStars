import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCelestialMap } from "../hooks/useCelestialMap";
import { useThemeFonts } from "../hooks/useThemeFonts";
import { computeMapGeometry, PREVIEW_WIDTH, resolveTheme } from "../lib/celestialConfig";
import { buildPosterFileName, exportPoster } from "../lib/exportPoster";
import { buildPdfFileName, exportPosterToPdf } from "../lib/exportPosterPdf";
import { circleDiameterFor, getPosterLayout } from "../lib/posterLayout";
import { renderPoster } from "../lib/posterRender";
import { getPosterSize } from "../lib/posterSizes";
import { withCelestialResolution } from "../lib/celestialMap";
import type { PosterActions, PosterState } from "../state/poster";
import { Button, InlineNote } from "./ui";
import { cx } from "../lib/cx";
import { SizeSelector } from "./SizeSelector";
import { PreviewModal } from "./PreviewModal";

type ExportKind = "idle" | "pdf" | "png";

/**
 * La vista previa usa SIEMPRE la proporción 3:4 de diseño (1200×1600),
 * independientemente del formato de impresión elegido. Es una decisión de
 * alcance: el PDF/PNG sí respetan la proporción real del papel.
 */
const PREVIEW_LAYOUT = getPosterLayout(PREVIEW_WIDTH);

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
    />
  );
}

export function PosterStage({
  poster,
  actions,
  onExportingChange,
}: {
  poster: PosterState;
  actions: PosterActions;
  /** Avisa a la app para bloquear la edición mientras se exporta. */
  onExportingChange?: (busy: boolean) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  const [mapVersion, setMapVersion] = useState(0);
  const [exporting, setExporting] = useState<ExportKind>("idle");
  const [exportPhase, setExportPhase] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [bleedMm, setBleedMm] = useState(0);
  const [cropMarks, setCropMarks] = useState(true);

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
    onExportingChange?.(exporting !== "idle");
  }, [exporting, onExportingChange]);

  // Tema resuelto (preset + colores personalizados) y carga tipográfica:
  // ambos deben existir ANTES del hook del motor porque alimentan su efecto.
  const theme = useMemo(
    () => resolveTheme(poster.theme, poster.themeOverrides),
    [poster.theme, poster.themeOverrides],
  );
  // Las fuentes del tema deben estar antes del primer pintado estable.
  const fontsVersion = useThemeFonts(theme);

  const { status, error, geometry, retry } = useCelestialMap({
    hostRef,
    projection: poster.projection,
    theme,
    flags: poster.flags,
    dateStr: poster.dateStr,
    timeStr: poster.timeStr,
    utcOffsetMinutes: poster.utcOffsetMinutes,
    latitude: poster.latitude,
    longitude: poster.longitude,
    fontsVersion,
    onRedraw,
  });

  const size = getPosterSize(poster.sizeId);
  const placeholderLabel =
    status === "error" ? "El cielo no pudo renderizarse" : "Preparando el cielo…";

  const readMapCanvas = (): HTMLCanvasElement | null =>
    hostRef.current?.querySelector("canvas") ?? null;

  // El alto del preview SIEMPRE respeta la proporción del formato activo.
  // Alto fijo de diseño: 1600 px (3:4). El formato activo no altera el preview.
  const previewHeight = PREVIEW_LAYOUT.height;

  // La vista previa usa exactamente la misma función de pintado que la exportación.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = PREVIEW_WIDTH;
    canvas.height = previewHeight;

    const frame = window.requestAnimationFrame(() => {
      renderPoster(ctx, {
        width: PREVIEW_WIDTH,
        height: previewHeight,
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
  }, [
    poster,
    theme,
    geometry.radiusRatio,
    mapVersion,
    fontsVersion,
    status,
    placeholderLabel,
    previewHeight,
  ]);

  /** Cede un frame al navegador para que el spinner se pinte antes del trabajo pesado. */
  const yieldToBrowser = () =>
    new Promise<void>((resolve) => requestAnimationFrame(() => window.setTimeout(resolve, 0)));

  const handleExportPdf = useCallback(async () => {
    if (exporting !== "idle") return;
    setExporting("pdf");
    setExportPhase("Preparando el cielo…");
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
            placeholderLabel: "",
            dateStr: poster.dateStr,
            bleedMm,
            cropMarks,
            fileName: buildPdfFileName(poster.title, size, poster.dateStr),
            onPhase: setExportPhase,
          });
        },
      );
    } catch (caught) {
      setExportError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setExportPhase(null);
      setExporting("idle");
    }
  }, [exporting, geometry, poster, size, theme, bleedMm, cropMarks]);

  const handleExportPng = useCallback(async () => {
    if (exporting !== "idle") return;
    setExporting("png");
    setExportPhase("Componiendo el póster…");
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
        dateStr: poster.dateStr,
        fileName: buildPosterFileName(poster.title, poster.dateStr),
      });
    } catch (caught) {
      setExportError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setExportPhase(null);
      setExporting("idle");
    }
  }, [exporting, geometry, poster, theme, placeholderLabel]);

  const busy = exporting !== "idle";
  const statusMessage =
    status === "ready"
      ? "Cielo sincronizado con el momento y el lugar."
      : status === "error"
        ? (error ?? "Error al inicializar el mapa.")
        : "Cargando el motor del firmamento…";

  return (
    <section className="relative flex min-h-dvh flex-col items-center justify-center gap-6 px-4 py-10 lg:overflow-y-auto lg:px-12">
      <div className="flex w-full max-w-[620px] items-end justify-between gap-4">
        <div>
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.24em] text-[#9aa4bd]">
            Vista previa
          </p>
          <p className="mt-1 font-display text-2xl text-white">{poster.title || "Sin título"}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <p className="font-sans text-[11px] uppercase tracking-[0.14em] text-[#7f89a3]">
            {size.label} · 300 DPI
          </p>
          <Button
            type="button"
            variant="quiet"
            className="px-3 py-1.5 text-xs"
            onClick={() => setPreviewOpen(true)}
          >
            Ampliar
          </Button>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        aria-label="Vista previa del póster con el mapa del firmamento"
        className={cx(
          "block h-auto w-full max-w-[620px] rounded-[3px] ring-1 ring-white/10",
          "shadow-[0_40px_90px_-50px_rgba(0,0,0,0.95)]",
        )}
      />
      {/* Resumen textual para lectores de pantalla */}
      <p className="sr-only">
        Póster «{poster.title || "Sin título"}», {poster.subtitle}. Cielo de{" "}
        {poster.coordinates || poster.placeLabel || "lugar sin definir"}. Formato {size.label}.
      </p>

      <SizeSelector
        sizeId={poster.sizeId}
        onSizeChange={actions.setSizeId}
        bleedMm={bleedMm}
        onBleedChange={(on) => setBleedMm(on ? 3 : 0)}
        cropMarks={cropMarks}
        onCropMarksChange={setCropMarks}
        locked={busy}
      />

      {/* Estado + live region de exportación */}
      <div className="w-full max-w-[620px]">
        <div className="flex min-w-0 items-center gap-2.5" aria-live="polite">
          <span
            className={cx(
              "h-2 w-2 shrink-0 rounded-full",
              status === "ready"
                ? "bg-[#7dd8a5]"
                : status === "error"
                  ? "bg-[#ff9b8a]"
                  : "bg-[#e8c478]",
              status === "boot" && "animate-pulse",
            )}
          />
          <p className="text-[13px] text-[#9aa4bd]" role="status">
            {statusMessage}
          </p>
          {status === "error" ? (
            <Button type="button" variant="quiet" onClick={retry} className="shrink-0 px-3 py-1.5">
              Reintentar
            </Button>
          ) : null}
        </div>

        {exportPhase ? (
          <p role="status" className="mt-2 text-xs text-[#7f89a3]">
            {exportPhase}
          </p>
        ) : null}
      </div>

      {exportError ? <InlineNote tone="danger">{exportError}</InlineNote> : null}

      <div className="flex w-full max-w-[620px] flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[#7f89a3]">
          PDF listo para imprenta · PNG opcional 2400 × 3200 px
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="quiet"
            onClick={() => void handleExportPng()}
            disabled={busy || status !== "ready"}
          >
            {exporting === "png" ? (
              <>
                <Spinner />
                PNG…
              </>
            ) : (
              "PNG"
            )}
          </Button>
          <Button
            type="button"
            onClick={() => void handleExportPdf()}
            disabled={busy || status !== "ready"}
            className="min-w-[210px]"
          >
            {exporting === "pdf" ? (
              <>
                <Spinner />
                {exportPhase ?? "Generando PDF…"}
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

      {previewOpen ? (
        <PreviewModal
          poster={poster}
          mapCanvas={readMapCanvas()}
          mapRadiusRatio={geometry.radiusRatio}
          placeholderLabel={placeholderLabel}
          onClose={() => setPreviewOpen(false)}
        />
      ) : null}
    </section>
  );
}
