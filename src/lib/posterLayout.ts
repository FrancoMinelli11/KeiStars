export const POSTER_ASPECT = 3 / 4;
export const DESIGN_WIDTH = 1200;
export const DESIGN_HEIGHT = 1600;

/** Radio del círculo celeste en función del ancho del póster. */
export const POSTER_CIRCLE_RATIO = 424 / DESIGN_WIDTH;

/** Separaciones verticales relativas en px de diseño */
const SPACING = {
  circleTitleGap: 102, // Distancia entre el aro inferior y el título
  subtitleStep: 72, // Distancia entre línea base de título y subtítulo
  dividerStep: 108, // Distancia entre línea base de título y línea divisoria
  coordsStep: 172, // Distancia entre línea base de título y coordenadas
  bottomTextPadding: 26, // Altura estimada del texto de coordenadas hasta su base
};

export interface PosterTextBlock {
  y: number;
  size: number;
  maxWidth: number;
}

export interface PosterLayout {
  width: number;
  height: number;
  unit: number;
  frameInset: number;
  frameStroke: number;
  innerFrameInset: number;
  innerFrameStroke: number;
  circle: { cx: number; cy: number; r: number };
  title: PosterTextBlock;
  subtitle: PosterTextBlock;
  divider: { y: number; width: number; stroke: number };
  coordinates: PosterTextBlock & { tracking: number };
}

/**
 * Calcula la geometría adaptándose al aspect ratio real del formato de impresión.
 * Distribuye el aire sobrante de forma armónica entre cabecera y pie.
 */
export function getPosterLayout(
  width: number,
  height: number = Math.round(width / POSTER_ASPECT),
): PosterLayout {
  const u = width / DESIGN_WIDTH;
  const r = POSTER_CIRCLE_RATIO * width;
  const circleDiameter = r * 2;

  // 1. Altura que ocupan todos los textos desde la base del círculo
  const textSectionHeight =
    (SPACING.circleTitleGap + SPACING.coordsStep + SPACING.bottomTextPadding) * u;

  // 2. Altura total del contenido combinado (disco + textos)
  const totalContentHeight = circleDiameter + textSectionHeight;

  // 3. Distribución del aire vertical sobrante
  // Se asigna ~42% del aire restante arriba y ~58% abajo (centro óptico natural para pósters)
  const verticalSlack = Math.max(0, height - totalContentHeight);
  const minTopMargin = 80 * u;
  const topMargin = Math.max(minTopMargin, verticalSlack * 0.42);

  // 4. Posición del círculo
  const circleCy = topMargin + r;
  const circleBottom = circleCy + r;

  // 5. Textos 100% anclados a circleBottom (mantienen distancias exactas sin importar el formato)
  const titleY = circleBottom + SPACING.circleTitleGap * u;
  const subtitleY = titleY + SPACING.subtitleStep * u;
  const dividerY = titleY + SPACING.dividerStep * u;
  const coordsY = titleY + SPACING.coordsStep * u;

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
    },
    title: {
      y: titleY,
      size: 84 * u,
      maxWidth: 1010 * u,
    },
    subtitle: {
      y: subtitleY,
      size: 42 * u,
      maxWidth: 920 * u,
    },
    divider: {
      y: dividerY,
      width: 190 * u,
      stroke: Math.max(1, 1.5 * u),
    },
    coordinates: {
      y: coordsY,
      size: 26 * u,
      maxWidth: 900 * u,
      tracking: 5.5 * u,
    },
  };
}

export function circleDiameterFor(width: number): number {
  return 2 * POSTER_CIRCLE_RATIO * width;
}
