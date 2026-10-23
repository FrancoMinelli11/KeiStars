import { checkCanvasCapacity } from "./canvasLimits";
import { ensurePosterFonts } from "./fonts";
import { EXPORT_WIDTH } from "./posterSizes";
import { getPosterLayout } from "./posterLayout";
import { renderPoster, type PosterRenderInput } from "./posterRender";

/**
 * Compone el póster en alta resolución (2400×3200) y lo descarga como PNG.
 *
 * El mapa celeste se compone desde su propio canvas (renderizado ya a tamaño
 * de exportación), por lo que no hay reescalado ni riesgo de "tainted canvas":
 * d3-celestial solo dibuja formas/JSON, nunca imágenes cross-origin.
 */
export async function exportPoster(input: ExportPosterInput): Promise<void> {
  const layout = getPosterLayout(EXPORT_WIDTH);

  const capacity = checkCanvasCapacity(layout.width, layout.height);
  if (!capacity.ok)
    throw new Error(capacity.message ?? "El lienzo supera el límite del dispositivo.");

  const canvas = document.createElement("canvas");
  canvas.width = layout.width;
  canvas.height = layout.height;

  try {
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Este navegador no permite crear un lienzo 2D para exportar.");
    }

    await ensurePosterFonts(input.theme.fonts);
    renderPoster(ctx, { ...input, width: layout.width, height: layout.height });

    // `toBlob` es asíncrono: menor bloqueo del hilo principal que toDataURL.
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) {
      throw new Error("No se pudo generar el PNG. Vuelve a intentarlo en unos segundos.");
    }

    downloadBlob(
      blob,
      input.fileName ?? buildPosterFileName(input.title, input.dateStr ?? "cielo"),
    );
  } finally {
    // Libera de inmediato el buffer del lienzo (~196 MB en el export 2400×3200).
    canvas.width = 0;
    canvas.height = 0;
  }
}

export interface ExportPosterInput extends Omit<PosterRenderInput, "width" | "height"> {
  dateStr?: string;
  fileName?: string;
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Se revoca tras la descarga para no bloquear la memoria del object URL.
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/* ------------------------------------------------------------------ */
/* Nombres de archivo                                                  */
/* ------------------------------------------------------------------ */

export function slugify(text: string, fallback = "poster"): string {
  const slug = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || fallback;
}

export function buildPosterFileName(title: string, dateStr: string): string {
  const date = dateStr.replace(/[^0-9]/g, "");
  return `keistars-${slugify(title)}-${date || "cielo"}.png`;
}
