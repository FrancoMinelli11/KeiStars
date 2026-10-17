import type { PosterTheme } from "./celestialConfig";
import { getPosterLayout, type PosterLayout } from "./posterLayout";

export interface PosterRenderInput {
  /** Ancho en px del lienzo de destino (1200 vista previa / 2400 exportación). */
  width: number;
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

const FONT_TITLE = (size: number) => `600 ${size}px "Cormorant Garamond", Georgia, "Times New Roman", serif`;
const FONT_SUBTITLE = (size: number) =>
  `italic 500 ${size}px "Cormorant Garamond", Georgia, "Times New Roman", serif`;
const FONT_META = (size: number) => `500 ${size}px "Inter", system-ui, "Helvetica Neue", Arial, sans-serif`;

function tidy(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** Reduce el cuerpo hasta que el texto quepa en `maxWidth` (mín. 62 %). */
function fitFont(ctx: CanvasRenderingContext2D, text: string, font: (size: number) => string, size: number, maxWidth: number): number {
  let current = size;
  ctx.font = font(current);
  const min = size * 0.62;
  while (ctx.measureText(text).width > maxWidth && current > min) {
    current -= Math.max(1, size * 0.03);
    ctx.font = font(current);
  }
  return current;
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
    ctx.font = FONT_META(layout.subtitle.size * 0.5);
    drawCentered(ctx, input.placeholderLabel, circle.cx, circle.cy + layout.subtitle.size * 0.18);
  }

  ctx.restore();
}

/**
 * Pinta el póster completo: fondo, marcos, círculo celeste recortado y textos.
 * Es la misma función para la vista previa y para el PNG de alta resolución.
 */
export function renderPoster(ctx: CanvasRenderingContext2D, input: PosterRenderInput): PosterLayout {
  const layout = getPosterLayout(input.width);
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

  // Aro decorativo alrededor del cielo
  ctx.beginPath();
  ctx.arc(layout.circle.cx, layout.circle.cy, layout.circle.r, 0, Math.PI * 2);
  ctx.lineWidth = layout.circle.stroke;
  ctx.strokeStyle = theme.poster.ring;
  ctx.stroke();

  const title = tidy(input.title);
  if (title) {
    ctx.fillStyle = theme.poster.text;
    fitFont(ctx, title, FONT_TITLE, layout.title.size, layout.title.maxWidth);
    drawCentered(ctx, title, width / 2, layout.title.y);
  }

  const subtitle = tidy(input.subtitle);
  if (subtitle) {
    ctx.fillStyle = theme.poster.accent;
    fitFont(ctx, subtitle, FONT_SUBTITLE, layout.subtitle.size, layout.subtitle.maxWidth);
    drawCentered(ctx, subtitle, width / 2, layout.subtitle.y);
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
    fitFont(ctx, coordinates, FONT_META, layout.coordinates.size, layout.coordinates.maxWidth);
    drawTracked(ctx, coordinates.toUpperCase(), width / 2, layout.coordinates.y, layout.coordinates.tracking);
  }

  ctx.restore();
  return layout;
}
