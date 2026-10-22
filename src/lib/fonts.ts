/**
 * Tipografía del póster: cadenas `font` del canvas, pilas de fallback y carga
 * explícita de las familias del tema activo.
 *
 * Las fuentes están **autoalojadas** vía `@fontsource/*` (WOFF2 + @font-face
 * inyectados por Vite): sin peticiones a Google Fonts, funcionan sin red y la
 * referencia cruzada familia→fallback es la declarada por cada preset.
 */
import type { FontCategory, PosterTheme, PosterThemeFont } from "./themes";

/** Pila de respaldo por categoría tipográfica. */
const FALLBACK_STACKS: Record<FontCategory, string> = {
  serif: 'Georgia, "Times New Roman", serif',
  sans: 'system-ui, "Helvetica Neue", Arial, sans-serif',
  mono: '"Courier New", ui-monospace, monospace',
};

/** `"Merriweather", Georgia, "Times New Roman", serif` */
export function fontStack(family: string, category: FontCategory): string {
  return `"${family}", ${FALLBACK_STACKS[category]}`;
}

/** Cadena `font` del canvas para una tipografía de plantilla. */
export function fontSpec(font: PosterThemeFont, size: number): string {
  return `${font.italic ? "italic " : ""}${font.weight} ${size}px ${fontStack(font.family, font.fallback)}`;
}

/* ------------------------------------------------------------------ */
/* Carga de tipografías para exportar                                  */
/* ------------------------------------------------------------------ */

/**
 * Cuerpo (px) con el que se piden las familias a `document.fonts.load`.
 * Cargar una familia con un cuerpo la deja disponible para todos los tamaños.
 */
const FONT_LOAD_SIZE = 64;

/** Specs `font` de las tres familias del tema (título, subtítulo y meta). */
export function fontLoadSpecsForTheme(theme: PosterTheme): string[] {
  return [
    fontSpec(theme.fonts.title, FONT_LOAD_SIZE),
    fontSpec(theme.fonts.subtitle, FONT_LOAD_SIZE),
    fontSpec(theme.fonts.meta, FONT_LOAD_SIZE),
  ];
}

/**
 * Espera a que las tipografías web del tema estén listas antes de rasterizar.
 *
 * - `Promise.allSettled`: si una familia falla, las otras no se ven arrastradas
 *   y la exportación continúa con el fallback declarado (por categoría).
 * - Después, `document.fonts.ready` da margen a que cualquier carga pendiente
 *   aterrice, de modo que la exportación es idéntica a la vista previa.
 */
export async function ensurePosterFonts(theme: PosterTheme): Promise<void> {
  if (!("fonts" in document)) return;
  try {
    await Promise.allSettled(fontLoadSpecsForTheme(theme).map((spec) => document.fonts.load(spec)));
    await document.fonts.ready;
  } catch {
    /* tipografías de respaldo: la exportación no se aborta por esto */
  }
}
