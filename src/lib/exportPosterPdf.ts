import { checkCanvasCapacity } from "./canvasLimits";
import { ensurePosterFonts } from "./fonts";
import { renderPoster, type PosterRenderInput } from "./posterRender";
import { PRINT_DPI, type PosterSize } from "./posterSizes";
import { slugify } from "./exportPoster";
import { buildSkyDate, toInputDate } from "./time";

/**
 * Calidad JPEG de la imagen incrustada en el PDF.
 * Es el compromiso entre nitidez de impresión y peso del archivo: a 300 DPI el
 * JPEG conserva detalle suficiente y evita PDFs de cientos de MB que produciría
 * un PNG sin comprimir a tamaño 50×70.
 */
const JPEG_QUALITY = 0.95;

/** Sangrado estándar de imprenta (3 mm) y derivados de las marcas de corte. */
const CROP_MARK_GAP_MM = 1;
const CROP_MARK_LENGTH_MM = 2;
const CROP_MARK_STROKE_PX = (0.5 / 72) * PRINT_DPI; // 0,5 pt
const CROP_MARK_COLOR = "#000000";

export interface ExportPdfInput extends Omit<PosterRenderInput, "width" | "height"> {
  size: PosterSize;
  /** Fecha ISO (YYYY-MM-DD) para el nombre del archivo. */
  dateStr?: string;
  /** Sangrado en mm a cada lado (0 = páginas sin sangrado). */
  bleedMm?: number;
  /** Marcas de corte en las esquinas (requieren sangrado en la hoja). */
  cropMarks?: boolean;
  fileName?: string;
  /** Notifica la fase ("Componiendo el póster…", "Guardando PDF…") a la UI. */
  onPhase?: (phase: string) => void;
}

/** `keistars-la-noche-que-nos-conocimos-30x40cm-20240214.pdf` */
export function buildPdfFileName(title: string, size: PosterSize, dateStr?: string): string {
  const wall = dateStr ? buildSkyDate(dateStr, "00:00") : null;
  const stamp = wall ? toInputDate(wall).replace(/[^0-9]/g, "") : "";
  const suffix = stamp ? `-${stamp}` : "";
  return `keistars-${slugify(title)}-${size.id}cm${suffix}.pdf`;
}

function mmToPx(mm: number): number {
  return Math.round((mm / 25.4) * PRINT_DPI);
}

/** Marcas de corte sobre la prolongación de los bordes de corte. */
function drawCropMarks(
  ctx: CanvasRenderingContext2D,
  bleedPx: number,
  totalWidth: number,
  totalHeight: number,
): void {
  const gap = mmToPx(CROP_MARK_GAP_MM);
  const length = mmToPx(CROP_MARK_LENGTH_MM);
  const trimLeft = bleedPx;
  const trimTop = bleedPx;
  const trimRight = totalWidth - bleedPx;
  const trimBottom = totalHeight - bleedPx;

  ctx.save();
  ctx.strokeStyle = CROP_MARK_COLOR;
  ctx.lineWidth = CROP_MARK_STROKE_PX;
  ctx.beginPath();
  for (const x of [trimLeft, trimRight]) {
    ctx.moveTo(x, trimTop - gap - length);
    ctx.lineTo(x, trimTop - gap);
    ctx.moveTo(x, trimBottom + gap);
    ctx.lineTo(x, trimBottom + gap + length);
  }
  for (const y of [trimTop, trimBottom]) {
    ctx.moveTo(trimLeft - gap - length, y);
    ctx.lineTo(trimLeft - gap, y);
    ctx.moveTo(trimRight + gap, y);
    ctx.lineTo(trimRight + gap + length, y);
  }
  ctx.stroke();
  ctx.restore();
}

/** Lienzo → dataURL JPEG vía Blob: la codificación sale del hilo principal. */
function canvasToJpegDataUrl(canvas: HTMLCanvasElement): Promise<string> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("No se pudo rasterizar el póster."));
          return;
        }
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("No se pudo codificar el póster para el PDF."));
        reader.readAsDataURL(blob);
      },
      "image/jpeg",
      JPEG_QUALITY,
    );
  });
}

/**
 * Compone el póster a tamaño real de imprenta (300 DPI) y lo embebe en un PDF
 * de medida exacta, con sangrado opcional de 3 mm, marcas de corte y
 * metadatos del documento: listo para enviar a imprenta.
 *
 * - El mapa celeste llega ya renderizado a esa resolución (`withCelestialResolution`);
 *   aquí solo se compone y se rasteriza.
 * - La imagen cubre la hoja completa (sangrado incluido): el corte se produce
 *   3 mm dentro del póster y los textos quedan alejados de la guillotina.
 * - El color del documento es RGB (jsPDF no soporta CMYK): avísale a tu
 *   imprenta, que serán ellos quienes conviertan el color al calibrar.
 */
export async function exportPosterToPdf(input: ExportPdfInput): Promise<void> {
  // jsPDF (y sus dependencias) solo se descarga cuando el usuario exporta.
  const { jsPDF } = await import("jspdf");

  const { size } = input;
  const bleedMm = Math.max(0, input.bleedMm ?? 0);
  const bleedPx = mmToPx(bleedMm);
  const totalWidthPx = size.widthPx + bleedPx * 2;
  const totalHeightPx = size.heightPx + bleedPx * 2;

  const capacity = checkCanvasCapacity(totalWidthPx, totalHeightPx);
  if (!capacity.ok)
    throw new Error(capacity.message ?? "El lienzo supera el límite del dispositivo.");

  const canvas = document.createElement("canvas");
  canvas.width = totalWidthPx;
  canvas.height = totalHeightPx;

  try {
    input.onPhase?.("Componiendo el póster…");

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Este navegador no permite crear un lienzo 2D para exportar.");
    }

    await ensurePosterFonts(input.theme.fonts);

    // La hoja completa se pinta del color del papel: la sangra es superficie
    // extendida del póster, no margen blanco.
    ctx.fillStyle = input.theme.poster.bg;
    ctx.fillRect(0, 0, totalWidthPx, totalHeightPx);

    // Contenido a tamaño de corte, desplazado dentro del sangrado.
    ctx.save();
    ctx.translate(bleedPx, bleedPx);
    renderPoster(ctx, { ...input, width: size.widthPx, height: size.heightPx });
    ctx.restore();

    if (input.cropMarks && bleedMm > 0) {
      drawCropMarks(ctx, bleedPx, totalWidthPx, totalHeightPx);
    }

    input.onPhase?.("Guardando PDF…");
    const dataUrl = await canvasToJpegDataUrl(canvas);

    const doc = new jsPDF({
      orientation: size.heightPx >= size.widthPx ? "portrait" : "landscape",
      unit: "mm",
      format: [size.widthMm + bleedMm * 2, size.heightMm + bleedMm * 2],
      compress: true,
    });

    doc.setProperties({
      title: input.title || "Póster de carta celeste",
      subject: input.subtitle || undefined,
      author: "Generado con KeiStars",
      keywords: "carta celeste, póster, estrellas, d3-celestial",
      creator: "KeiStars (d3-celestial + jsPDF)",
    });

    // La imagen cubre el 100 % de la página (sangrado incluido).
    doc.addImage(dataUrl, "JPEG", 0, 0, size.widthMm + bleedMm * 2, size.heightMm + bleedMm * 2);
    doc.save(input.fileName ?? buildPdfFileName(input.title, size, input.dateStr));
  } finally {
    // Libera de inmediato el buffer del lienzo (hasta ~200 MB en 50×70 cm).
    canvas.width = 0;
    canvas.height = 0;
  }
}
