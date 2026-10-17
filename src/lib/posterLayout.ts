/**
 * Geometría del póster: única fuente de verdad compartida por la vista previa
 * (canvas 1200×1600) y la exportación (canvas 2400×3200).
 *
 * Todas las medidas están expresadas en el "espacio de diseño" de 1200 px de
 * ancho; al pedir otro ancho se escalan uniformemente (`u = width / 1200`),
 * de modo que el PNG descargado es exactamente 2× la vista previa.
 */

export const POSTER_ASPECT = 3 / 4;
export const DESIGN_WIDTH = 1200;

/** Radio del círculo celeste en función del ancho del póster. */
export const POSTER_CIRCLE_RATIO = 424 / DESIGN_WIDTH;

export interface PosterTextBlock {
  /** Línea base del texto, centrada horizontalmente. */
  y: number;
  size: number;
  maxWidth: number;
}

export interface PosterLayout {
  width: number;
  height: number;
  frameInset: number;
  frameStroke: number;
  innerFrameInset: number;
  innerFrameStroke: number;
  circle: { cx: number; cy: number; r: number; stroke: number };
  title: PosterTextBlock;
  subtitle: PosterTextBlock;
  divider: { y: number; width: number; stroke: number };
  coordinates: PosterTextBlock & { tracking: number };
}

export function getPosterLayout(width: number): PosterLayout {
  const height = Math.round(width / POSTER_ASPECT);
  const u = width / DESIGN_WIDTH;

  return {
    width,
    height,
    frameInset: 56 * u,
    frameStroke: Math.max(1, 2 * u),
    innerFrameInset: 68 * u,
    innerFrameStroke: Math.max(1, 1 * u),
    circle: {
      cx: width / 2,
      cy: 638 * u,
      r: 424 * u,
      stroke: Math.max(1, 2.5 * u),
    },
    title: { y: 1186 * u, size: 86 * u, maxWidth: 1010 * u },
    subtitle: { y: 1252 * u, size: 44 * u, maxWidth: 920 * u },
    divider: { y: 1300 * u, width: 190 * u, stroke: Math.max(1, 1.5 * u) },
    coordinates: { y: 1462 * u, size: 26 * u, maxWidth: 900 * u, tracking: 5.5 * u },
  };
}

/** Diámetro (en px) que debe tener el círculo del mapa para un ancho de póster. */
export function circleDiameterFor(width: number): number {
  return 2 * POSTER_CIRCLE_RATIO * width;
}
