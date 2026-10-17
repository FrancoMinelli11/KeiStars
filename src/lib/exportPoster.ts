import { EXPORT_WIDTH, type PosterTheme } from "./celestialConfig";
import { getPosterLayout } from "./posterLayout";
import { fontSpec, renderPoster, type PosterRenderInput } from "./posterRender";

/**
 * Cuerpo (px) con el que se piden las familias a `document.fonts.load`.
 * Cargar una familia con un cuerpo la deja disponible para todos los tamaños.
 */
const FONT_LOAD_SIZE = 64;

/**
 * Specs de las tres familias de la plantilla (título, subtítulo y meta).
 * Se construyen desde `theme.fonts` para que la exportación use exactamente
 * la tipografía del preset activo (nunca el fallback del sistema).
 */
function fontSpecsForTheme(theme: PosterTheme): string[] {
  return [
    fontSpec(theme.fonts.title, FONT_LOAD_SIZE),
    fontSpec(theme.fonts.subtitle, FONT_LOAD_SIZE),
    fontSpec(theme.fonts.meta, FONT_LOAD_SIZE),
  ];
}

/**
 * Espera a que las tipografías web de la plantilla estén disponibles para que
 * el texto del PNG/PDF sea idéntico al de la vista previa. Si fallan (sin red),
 * se usan las de respaldo de la pila del sistema sin abortar la exportación.
 */
export async function ensurePosterFonts(theme: PosterTheme): Promise<void> {
  if (!("fonts" in document)) return;
  try {
    await Promise.all(fontSpecsForTheme(theme).map((spec) => document.fonts.load(spec)));
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

  await ensurePosterFonts(input.theme);
  renderPoster(ctx, { ...input, width: EXPORT_WIDTH });

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) {
    throw new Error("No se pudo generar el PNG. Vuelve a intentarlo en unos segundos.");
  }

  downloadBlob(blob, input.fileName ?? buildPosterFileName(input.title, "cielo"));
}
