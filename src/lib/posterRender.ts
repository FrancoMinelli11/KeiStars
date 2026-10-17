import type { PosterTheme, PosterThemeFont } from "./celestialConfig";
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

const SERIF_FALLBACK = 'Georgia, "Times New Roman", serif';
const SANS_FALLBACK = 'system-ui, "Helvetica Neue", Arial, sans-serif';

/** Cadena `font` del canvas para una tipografía de plantilla. */
export function fontSpec(font: PosterThemeFont, size: number, serif = true): string {
  const fallback = serif ? SERIF_FALLBACK : SANS_FALLBACK;
  return `${font.italic ? "italic " : ""}${font.weight} ${size}px "${font.family}", ${fallback}`;
}

/** Ancho ocupado por un texto con tracking manual entre caracteres. */
function measureTracked(ctx: CanvasRenderingContext2D, text: string, tracking: number): number {
  const chars = Array.from(text);
  if (chars.length === 0) return 0;
  const widths = chars.map((char) => ctx.measureText(char).width);
  return widths.reduce((sum, w) => sum + w, 0) + tracking * (chars.length - 1);
}

function tidy(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Reduce el cuerpo hasta que el texto (con su tracking) quepa en `maxWidth`
 * (mín. 62 %). Devuelve el cuerpo definitivo y deja `ctx.font` ajustado.
 */
function fitFont(
  ctx: CanvasRenderingContext2D,
  text: string,
  font: PosterThemeFont,
  serif: boolean,
  size: number,
  maxWidth: number,
  tracking: number,
): number {
  let current = size;
  ctx.font = fontSpec(font, current, serif);
  const min = size * 0.62;
  while (measureTracked(ctx, text, tracking) > maxWidth && current > min) {
    current -= Math.max(1, size * 0.03);
    ctx.font = fontSpec(font, current, serif);
  }
  return current;
}

/** Dibuja centrado; con tracking > 0 reparte el kerning a mano (portable). */
function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, tracking: number): void {
  if (tracking > 0) drawTracked(ctx, text, x, y, tracking);
  else drawCentered(ctx, text, x, y);
}

function drawCentered(ctx: CanvasRenderingContext2D, text: string, x: number, y: number): void {
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(text, x, y);
}

/** Texto centrado con espaciado manual entre caracteres (portable, sin `letterSpacing`). */
function drawTracked(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, tracking: number): void {
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

function drawMap(ctx: CanvasRenderingContext2D, input: PosterRenderInput, layout: PosterLayout): void {
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
    ctx.font = fontSpec(input.theme.fonts.meta, layout.subtitle.size * 0.5, false);
    drawCentered(ctx, input.placeholderLabel, circle.cx, circle.cy + layout.subtitle.size * 0.18);
  }

  ctx.restore();
}

/**
 * Pinta el póster completo: fondo, marcos, círculo celeste recortado y textos.
 * Es la misma función para la vista previa y para el PNG de alta resolución.
 */
export function renderPoster(ctx: CanvasRenderingContext2D, input: PosterRenderInput): PosterLayout {
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
    const titleTracking = (fonts.title.tracking ?? 0) * layout.unit;
    ctx.fillStyle = theme.poster.text;
    fitFont(ctx, title, fonts.title, true, layout.title.size, layout.title.maxWidth, titleTracking);
    drawText(ctx, title, width / 2, layout.title.y, titleTracking);
  }

  const subtitle = tidy(input.subtitle);
  if (subtitle) {
    const subtitleTracking = (fonts.subtitle.tracking ?? 0) * layout.unit;
    ctx.fillStyle = theme.poster.accent;
    fitFont(
      ctx,
      subtitle,
      fonts.subtitle,
      true,
      layout.subtitle.size,
      layout.subtitle.maxWidth,
      subtitleTracking,
    );
    drawText(ctx, subtitle, width / 2, layout.subtitle.y, subtitleTracking);
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

  const coordinates = tidy(input.coordinates);
  if (coordinates) {
    ctx.fillStyle = theme.poster.muted;
    fitFont(
      ctx,
      coordinates,
      fonts.meta,
      false,
      layout.coordinates.size,
      layout.coordinates.maxWidth,
      layout.coordinates.tracking,
    );
    drawTracked(ctx, coordinates.toUpperCase(), width / 2, layout.coordinates.y, layout.coordinates.tracking);
  }

  ctx.restore();
  return layout;
}
