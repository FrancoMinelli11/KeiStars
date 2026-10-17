/**
 * Formatos estándar de impresión y su equivalencia cm ↔ mm ↔ px a 300 DPI.
 *
 * Píxeles = (cm / 2,54) · 300. Esas medidas alimentan el canvas de composición
 * (raster a tamaño real de imprenta), mientras que mm van al documento PDF.
 */

export const PRINT_DPI = 300;
const PX_PER_CM = PRINT_DPI / 2.54;

export interface PosterSize {
  id: string;
  /** Etiqueta corta para los botones ("21 × 30"). */
  shortLabel: string;
  /** Etiqueta completa ("21 × 30 cm"). */
  label: string;
  widthCm: number;
  heightCm: number;
  widthMm: number;
  heightMm: number;
  /** Lienzo de composición a 300 DPI. */
  widthPx: number;
  heightPx: number;
}

function makeSize(widthCm: number, heightCm: number): PosterSize {
  const widthPx = Math.round(widthCm * PX_PER_CM);
  const heightPx = Math.round(heightCm * PX_PER_CM);

  return {
    id: `${widthCm}x${heightCm}`,
    shortLabel: `${widthCm} × ${heightCm}`,
    label: `${widthCm} × ${heightCm} cm`,
    widthCm,
    heightCm,
    widthMm: widthCm * 10,
    heightMm: heightCm * 10,
    widthPx,
    heightPx,
  };
}

export const POSTER_SIZES: PosterSize[] = [
  makeSize(21, 30), // A4 vertical
  makeSize(30, 40),
  makeSize(40, 50),
  makeSize(50, 70),
];

export const DEFAULT_POSTER_SIZE_ID = "30x40";

export function getPosterSize(id: string): PosterSize {
  return POSTER_SIZES.find((size) => size.id === id) ?? POSTER_SIZES[0];
}

/** "3543 × 4724 px · 300 DPI" */
export function describePosterSize(size: PosterSize): string {
  return `${size.widthPx} × ${size.heightPx} px · ${PRINT_DPI} DPI`;
}
