import { ensurePosterFonts, slugify } from "./exportPoster";
import { renderPoster, type PosterRenderInput } from "./posterRender";
import type { PosterSize } from "./posterSizes";

/**
 * Calidad JPEG de la imagen incrustada en el PDF.
 * Es el compromiso entre nitidez de impresión y peso del archivo: a 300 DPI el
 * JPEG conserva detalle suficiente y evita PDFs de cientos de MB que produciría
 * un PNG sin comprimir a tamaño 50×70.
 */
const JPEG_QUALITY = 0.95;

export interface ExportPdfInput extends Omit<PosterRenderInput, "width" | "height"> {
  size: PosterSize;
  fileName?: string;
}

/** "keistars-la-noche-que-nos-conocimos-30x40cm.pdf" */
export function buildPdfFileName(title: string, size: PosterSize): string {
  return `keistars-${slugify(title)}-${size.id}cm.pdf`;
}

/**
 * Compone el póster a tamaño real de imprenta (300 DPI) y lo embebe en un PDF
 * de medida exacta, listo para enviar a imprenta.
 *
 * El mapa celeste debe llegar ya renderizado a esa resolución (lo hace
 * `withCelestialResolution`); aquí solo se compone y se rasteriza.
 */
export async function exportPosterToPdf(input: ExportPdfInput): Promise<void> {
  // jsPDF (y sus dependencias) solo se descarga cuando el usuario exporta.
  const { jsPDF } = await import("jspdf");

  const { size } = input;
  const canvas = document.createElement("canvas");
  canvas.width = size.widthPx;
  canvas.height = size.heightPx;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Este navegador no permite crear un lienzo 2D para exportar.");
  }

  try {
    await ensurePosterFonts();
    renderPoster(ctx, { ...input, width: size.widthPx, height: size.heightPx });

    const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
    if (!dataUrl.startsWith("data:image/jpeg")) {
      throw new Error("No se pudo rasterizar el póster para el PDF.");
    }

    const doc = new jsPDF({
      orientation: size.heightPx >= size.widthPx ? "portrait" : "landscape",
      unit: "mm",
      format: [size.widthMm, size.heightMm],
      compress: true,
    });

    // La imagen cubre el 100 % de la página: 0,0 con el ancho/alto en mm.
    doc.addImage(dataUrl, "JPEG", 0, 0, size.widthMm, size.heightMm, undefined, "FAST");
    doc.save(input.fileName ?? buildPdfFileName(input.title, size));
  } finally {
    // Libera de inmediato el buffer del lienzo (hasta ~200 MB en 50×70 cm).
    canvas.width = 0;
    canvas.height = 0;
  }
}
