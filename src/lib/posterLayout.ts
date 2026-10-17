/**
 * Geometría del póster: única fuente de verdad compartida por la vista previa
 * (canvas 1200×1600) y la exportación (PNG 2400×3200 o PDF a 300 DPI).
 *
 * Medidas expresadas en el "espacio de diseño" de 1200 px de ancho; al pedir
 * otro ancho se escalan uniformemente (`u = width / 1200`), de modo que el
 * mismo diseño sirve para A4, 30×40, 40×50 o 50×70 cm.
 *
 * El círculo celeste queda anclado al margen superior y el bloque de textos al
 * borde inferior; de esa forma un formato más alto (50×70) simplemente gana
 * aire intermedio y uno más ancho (40×50) empuja el texto sin solaparse jamás
 * con el cielo.
 */

export const POSTER_ASPECT = 3 / 4;
export const DESIGN_WIDTH = 1200;
export const DESIGN_HEIGHT = 1600;

/** Radio del círculo celeste en función del ancho del póster. */
export const POSTER_CIRCLE_RATIO = 424 / DESIGN_WIDTH;

/** Anclajes verticales del bloque de texto, medidos en px de diseño desde el borde inferior. */
const FOOTER = {
  coordinates: DESIGN_HEIGHT - 1462, // 138
  divider: DESIGN_HEIGHT - 1300, // 300
  subtitle: DESIGN_HEIGHT - 1252, // 348
  title: DESIGN_HEIGHT - 1186, // 414
};

/** Anclajes verticales desde el borde superior (px de diseño). */
const HEADER = {
  circleTop: 638 - 424, // centro del círculo 638 − radio 424
};

/** Separación mínima entre el borde inferior del círculo y la línea del título. */
const CIRCLE_TITLE_GAP = 56;

/** Desplazamientos internos del bloque de textos (px de diseño). */
const TEXT_STEP = {
  subtitle: 1252 - 1186, // 66
  divider: 1300 - 1186, // 114
};

export interface PosterTextBlock {
  /** Línea base del texto, centrada horizontalmente. */
  y: number;
  size: number;
  maxWidth: number;
}

export interface PosterLayout {
  width: number;
  height: number;
  /** Factor de escala respecto al espacio de diseño (px → px de diseño). */
  unit: number;
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

/**
 * Calcula la geometría para un lienzo de `width × height` px.
 * Sin `height` se mantiene la proporción 3:4 clásica (vista previa y PNG).
 */
export function getPosterLayout(width: number, height: number = Math.round(width / POSTER_ASPECT)): PosterLayout {
  const u = width / DESIGN_WIDTH;
  const r = POSTER_CIRCLE_RATIO * width;
  const circleCy = HEADER.circleTop * u + r;
  const circleBottom = circleCy + r;

  // El texto nunca invade el círculo, aunque el formato sea más ancho que A4.
  const titleY = Math.max(circleBottom + CIRCLE_TITLE_GAP * u, height - FOOTER.title * u);

  return {
    width,
    height,
    unit: u,
    frameInset: 56 * u,
    frameStroke: Math.max(1, 2 * u),
    innerFrameInset: 68 * u,
    innerFrameStroke: Math.max(1, 1 * u),
    circle: {
      cx: width / 2,
      cy: circleCy,
      r,
      stroke: Math.max(1, 2.5 * u),
    },
    title: { y: titleY, size: 86 * u, maxWidth: 1010 * u },
    subtitle: { y: titleY + TEXT_STEP.subtitle * u, size: 44 * u, maxWidth: 920 * u },
    divider: { y: titleY + TEXT_STEP.divider * u, width: 190 * u, stroke: Math.max(1, 1.5 * u) },
    coordinates: {
      y: height - FOOTER.coordinates * u,
      size: 26 * u,
      maxWidth: 900 * u,
      tracking: 5.5 * u,
    },
  };
}

/** Diámetro (en px) que debe tener el círculo del mapa para un ancho de póster. */
export function circleDiameterFor(width: number): number {
  return 2 * POSTER_CIRCLE_RATIO * width;
}
