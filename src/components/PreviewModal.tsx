import { useEffect, useRef } from "react";
import { renderPoster } from "../lib/posterRender";
import { getPosterSize } from "../lib/posterSizes";
import type { PosterState } from "../state/poster";
import { resolveTheme } from "../lib/celestialConfig";
import { Button } from "./ui";

/**
 * Vista previa a pantalla completa: un lienzo aparte pintado con la misma
 * `renderPoster`, tamaño mayor y cierre con Esc/clic exterior. Se usa para
 * revisar tipografía y detalles del cielo antes de exportar.
 */
export function PreviewModal({
  poster,
  mapCanvas,
  mapRadiusRatio,
  placeholderLabel,
  onClose,
}: {
  poster: PosterState;
  mapCanvas: HTMLCanvasElement | null;
  mapRadiusRatio: number;
  placeholderLabel: string;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = 1600;
    const height = Math.round(width / 0.75);
    canvas.width = width;
    canvas.height = height;

    const frame = window.requestAnimationFrame(() => {
      renderPoster(ctx, {
        width,
        height,
        theme: resolveTheme(poster.theme, poster.themeOverrides),
        title: poster.title,
        subtitle: poster.subtitle,
        coordinates: poster.coordinates,
        mapCanvas,
        mapRadiusRatio,
        placeholderLabel,
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [poster, mapCanvas, mapRadiusRatio, placeholderLabel]);

  const size = getPosterSize(poster.sizeId);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Vista previa a pantalla completa"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-[#05070d]/95 p-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex w-full max-w-[90vw] items-center justify-between gap-4">
        <p className="font-sans text-[11px] uppercase tracking-[0.24em] text-[#9aa4bd]">
          {size.label} · vista ampliada
        </p>
        <Button ref={closeRef} type="button" variant="quiet" onClick={onClose}>
          Cerrar (Esc)
        </Button>
      </div>

      <canvas
        ref={canvasRef}
        className="max-h-[82vh] w-auto max-w-[90vw] rounded-[3px] shadow-[0_40px_120px_-40px_rgba(0,0,0,0.95)]"
      />
    </div>
  );
}
