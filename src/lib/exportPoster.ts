import { EXPORT_WIDTH } from "./celestialConfig";
import { getPosterLayout } from "./posterLayout";
import { renderPoster, type PosterRenderInput } from "./posterRender";

const FONT_SPECS = [
  '600 64px "Cormorant Garamond"',
  'italic 500 32px "Cormorant Garamond"',
  '500 24px "Inter"',
];

/**
 * Espera a que las tipografías web estén disponibles para que el texto del PNG
 * sea idéntico al de la vista previa. Si fallan (sin red), se usan las de
 * respaldo de la pila del sistema sin abortar la exportación.
 */
export async function ensurePosterFonts(): Promise<void> {
  if (!("fonts" in document)) return;
  try {
    await Promise.all(FONT_SPECS.map((spec) => document.fonts.load(spec)));
    await document.fonts.ready;
  } catch {
    /* tipografías de respaldo */
  }
}

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

export interface ExportPosterInput extends Omit<PosterRenderInput, "width"> {
  fileName?: string;
}

/**
 * Compone el póster en alta resolución (2400×3200) y lo descarga como PNG.
 *
 * El mapa celeste se compone desde su propio canvas (renderizado ya a tamaño
 * de exportación), por lo que no hay reescalado ni riesgo de "tainted canvas":
 * d3-celestial solo dibuja formas/JSON, nunca imágenes cross-origin.
 */
export async function exportPoster(input: ExportPosterInput): Promise<void> {
  const layout = getPosterLayout(EXPORT_WIDTH);
  const canvas = document.createElement("canvas");
  canvas.width = layout.width;
  canvas.height = layout.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Este navegador no permite crear un lienzo 2D para exportar.");
  }

  await ensurePosterFonts();
  renderPoster(ctx, { ...input, width: EXPORT_WIDTH });

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) {
    throw new Error("No se pudo generar el PNG. Vuelve a intentarlo en unos segundos.");
  }

  downloadBlob(blob, input.fileName ?? buildPosterFileName(input.title, "cielo"));
}
