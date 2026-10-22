import { fontSpec } from "./fonts";
import type { PosterTheme, PosterThemeFont } from "./themes";
import { getPosterLayout, type PosterLayout } from "./posterLayout";

export interface PosterRenderInput {
  /** Ancho en px del lienzo de destino (1200 vista previa / 2400 PNG / tamaño de imprenta). */
  width: number;
  /**
   * Alto en px. Opcional: si se omite se usa la proporción 3:4. Los formatos
   * de impresión (21×30, 40×50…) lo pasan para conservar su proporción real.
   */
  height?: number;
  theme: PosterTheme;
  title: string;
  subtitle: string;
  coordinates: string;
  /**
   * Lienzo de d3-celestial. Debe medir como mínimo el diámetro del círculo
   * del póster para que el bitmaps se componga 1:1 (sin reescalado borroso).
   */
  mapCanvas: HTMLCanvasElement | null;
  /** Radio del círculo celeste / ancho del lienzo del mapa. */
  mapRadiusRatio: number;
  placeholderLabel: string;
}

/** Ancho ocupado por un texto con tracking manual entre caracteres. */
export function measureTracked(
  ctx: CanvasRenderingContext2D,
  text: string,
  tracking: number,
): number {
  const chars = Array.from(text);
  if (chars.length === 0) return 0;
  const widths = chars.map((char) => ctx.measureText(char).width);
  return widths.reduce((sum, w) => sum + w, 0) + tracking * (chars.length - 1);
}

function tidy(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/* ------------------------------------------------------------------ */
/* Ajuste de titulares: encajar sin salirse del área de diseño         */
/* ------------------------------------------------------------------ */

export interface FittedText {
  /** Texto definitivo (`…` si hubo que recortar). */
  text: string;
  /** Cuerpo final de la fuente. */
  size: number;
  /** Tracking final (escala proporcionalmente con el cuerpo). */
  tracking: number;
  /** true si se recortó con elipsis. */
  clipped: boolean;
}

/** El texto nunca baja de aquí: es donde entra la elipsis. */
const MIN_SIZE_RATIO = 0.5;
const ELLIPSIS = "…";

/**
 * Encaja un texto de una línea en `maxWidth`:
 *
 * 1. Reduce el cuerpo (hasta `MIN_SIZE_RATIO` del original) **y a la vez**
 *    escala el tracking de forma proporcional al cuerpo — así el titular
 *    demasiado ancho encoge homogéneamente en vez de expulsar al aire.
 * 2. Si aún no cabe al mínimo, recorta con elipsis por búsqueda binaria
 *    (el texto jamás se sale del área, pase lo que pase).
 *
 * Deja `ctx.font` ajustado al cuerpo final para dibujar inmediatamente.
 */
export function fitTrackedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  font: PosterThemeFont,
  size: number,
  maxWidth: number,
  baseTracking: number,
): FittedText {
  const min = Math.max(8, size * MIN_SIZE_RATIO);
  let current = size;
  let tracking = baseTracking * (current / size);
  ctx.font = fontSpec(font, current);
  let width = measureTracked(ctx, text, tracking);

  while (width > maxWidth && current > min) {
    current = Math.max(min, current - Math.max(1, size * 0.025));
    tracking = baseTracking * (current / size);
    ctx.font = fontSpec(font, current);
    width = measureTracked(ctx, text, tracking);
  }

  if (width <= maxWidth) {
    return { text, size: current, tracking, clipped: false };
  }

  // Al mínimo el texto sigue sin caber: elipsis binaria (prefijo más largo).
  const fits = (candidate: string): boolean => measureTracked(ctx, candidate, tracking) <= maxWidth;
  const chars = Array.from(text);
  if (!fits(ELLIPSIS)) {
    return { text: "", size: current, tracking, clipped: true };
  }
  const candidate = (count: number) => `${chars.slice(0, count).join("")}${ELLIPSIS}`;
  let low = 0;
  let high = chars.length;
  let bestFit = ELLIPSIS;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (fits(candidate(mid))) {
      bestFit = candidate(mid);
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return { text: bestFit, size: current, tracking, clipped: true };
}

/* ------------------------------------------------------------------ */
/* Dibujo de texto                                                     */
/* ------------------------------------------------------------------ */

/** Dibuja centrado; con tracking > 0 reparte el kerning a mano (portable). */
function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  tracking: number,
): void {
  if (!text) return;
  if (tracking > 0) drawTracked(ctx, text, x, y, tracking);
  else drawCentered(ctx, text, x, y);
}

function drawCentered(ctx: CanvasRenderingContext2D, text: string, x: number, y: number): void {
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(text, x, y);
}

/** Texto centrado con espaciado manual entre caracteres (portable, sin `letterSpacing`). */
function drawTracked(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  tracking: number,
): void {
  const chars = Array.from(text);
  const widths = chars.map((char) => ctx.measureText(char).width);
  const total = widths.reduce((sum, w) => sum + w, 0) + tracking * Math.max(0, chars.length - 1);
  let cursor = x - total / 2;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  chars.forEach((char, index) => {
    ctx.fillText(char, cursor, y);
    cursor += widths[index] + tracking;
  });
}

/* ------------------------------------------------------------------ */
/* Composición                                                         */
/* ------------------------------------------------------------------ */

/**
 * Aro decorativo alrededor del cielo. Las plantillas definen grosor (px de
 * diseño), opacidad y un opcional segundo aro concéntrico (p. ej. el doble
 * aro de bronce de Vintage Parchment).
 */
function drawRing(ctx: CanvasRenderingContext2D, layout: PosterLayout, theme: PosterTheme): void {
  const { poster } = theme;
  const { cx, cy, r } = layout.circle;

  ctx.save();
  ctx.globalAlpha = poster.ringAlpha;
  ctx.strokeStyle = poster.ring;

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.lineWidth = Math.max(1, poster.ringWidth * layout.unit);
  ctx.stroke();

  if (poster.ringInnerGap > 0) {
    ctx.lineWidth = Math.max(1, poster.ringWidth * 0.55 * layout.unit);
    ctx.beginPath();
    ctx.arc(cx, cy, r * (1 - poster.ringInnerGap), 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

function drawMap(
  ctx: CanvasRenderingContext2D,
  input: PosterRenderInput,
  layout: PosterLayout,
): void {
  const { circle } = layout;

  ctx.save();
  ctx.beginPath();
  ctx.arc(circle.cx, circle.cy, circle.r, 0, Math.PI * 2);
  ctx.clip();

  const map = input.mapCanvas;
  if (map && map.width > 0 && map.height > 0) {
    // El círculo celeste ocupa exactamente `mapRadiusRatio · ancho` del lienzo.
    const sourceRadius = input.mapRadiusRatio * map.width;
    const sourceX = map.width / 2 - sourceRadius;
    const sourceY = map.height / 2 - sourceRadius;
    const sourceSize = sourceRadius * 2;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(
      map,
      sourceX,
      sourceY,
      sourceSize,
      sourceSize,
      circle.cx - circle.r,
      circle.cy - circle.r,
      circle.r * 2,
      circle.r * 2,
    );
  } else {
    ctx.fillStyle = input.theme.poster.bg;
    ctx.fillRect(circle.cx - circle.r, circle.cy - circle.r, circle.r * 2, circle.r * 2);
    ctx.setLineDash([6, 10]);
    ctx.strokeStyle = input.theme.poster.muted;
    ctx.lineWidth = Math.max(1, layout.frameStroke / 2);
    ctx.beginPath();
    ctx.arc(circle.cx, circle.cy, circle.r * 0.94, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = input.theme.poster.muted;
    ctx.font = fontSpec(input.theme.fonts.meta, layout.subtitle.size * 0.5);
    drawCentered(ctx, input.placeholderLabel, circle.cx, circle.cy + layout.subtitle.size * 0.18);
  }

  ctx.restore();
}

/**
 * Pinta el póster completo: fondo, marcos, círculo celeste recortado y textos.
 * Es la misma función para la vista previa y para el PNG de alta resolución.
 */
export function renderPoster(
  ctx: CanvasRenderingContext2D,
  input: PosterRenderInput,
): PosterLayout {
  const layout = getPosterLayout(input.width, input.height);
  const { theme } = input;
  const { width, height } = layout;

  ctx.save();
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = theme.poster.bg;
  ctx.fillRect(0, 0, width, height);

  // Marco exterior + filete interior
  ctx.strokeStyle = theme.poster.frame;
  ctx.lineWidth = layout.frameStroke;
  ctx.strokeRect(
    layout.frameInset,
    layout.frameInset,
    width - layout.frameInset * 2,
    height - layout.frameInset * 2,
  );
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = layout.innerFrameStroke;
  ctx.strokeRect(
    layout.innerFrameInset,
    layout.innerFrameInset,
    width - layout.innerFrameInset * 2,
    height - layout.innerFrameInset * 2,
  );
  ctx.globalAlpha = 1;

  drawMap(ctx, input, layout);

  // Aro decorativo alrededor del cielo (grosor, opacidad y doble aro por plantilla)
  drawRing(ctx, layout, theme);

  const { fonts } = theme;

  const title = tidy(input.title);
  if (title) {
    const baseTracking = (fonts.title.tracking ?? 0) * layout.unit;
    const fitted = fitTrackedText(
      ctx,
      title,
      fonts.title,
      layout.title.size,
      layout.title.maxWidth,
      baseTracking,
    );
    ctx.fillStyle = theme.poster.text;
    drawText(ctx, fitted.text, width / 2, layout.title.y, fitted.tracking);
  }

  const subtitle = tidy(input.subtitle);
  if (subtitle) {
    const baseTracking = (fonts.subtitle.tracking ?? 0) * layout.unit;
    const fitted = fitTrackedText(
      ctx,
      subtitle,
      fonts.subtitle,
      layout.subtitle.size,
      layout.subtitle.maxWidth,
      baseTracking,
    );
    ctx.fillStyle = theme.poster.accent;
    drawText(ctx, fitted.text, width / 2, layout.subtitle.y, fitted.tracking);
  }

  // Filete de cierre
  ctx.strokeStyle = theme.poster.accent;
  ctx.globalAlpha = 0.8;
  ctx.lineWidth = layout.divider.stroke;
  ctx.beginPath();
  ctx.moveTo(width / 2 - layout.divider.width / 2, layout.divider.y);
  ctx.lineTo(width / 2 + layout.divider.width / 2, layout.divider.y);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Se mide el texto tal cual se dibuja (mayúsculas cambian el ancho).
  const coordinates = tidy(input.coordinates).toUpperCase();
  if (coordinates) {
    const baseTracking = layout.coordinates.tracking;
    const fitted = fitTrackedText(
      ctx,
      coordinates,
      fonts.meta,
      layout.coordinates.size,
      layout.coordinates.maxWidth,
      baseTracking,
    );
    ctx.fillStyle = theme.poster.muted;
    drawTracked(ctx, fitted.text, width / 2, layout.coordinates.y, fitted.tracking);
  }

  ctx.restore();
  return layout;
}
