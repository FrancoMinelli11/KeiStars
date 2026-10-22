import { describe, expect, it } from "vitest";
import { circleDiameterFor, getPosterLayout, POSTER_CIRCLE_RATIO } from "../posterLayout";
import { EXPORT_WIDTH, POSTER_SIZES } from "../posterSizes";

describe("getPosterLayout", () => {
  it("respeta la proporción 3:4 cuando no se pasa alto", () => {
    const layout = getPosterLayout(1200);
    expect(layout.width).toBe(1200);
    expect(layout.height).toBe(1600);
  });

  it("escala proporcionalmente con la unidad de diseño", () => {
    const layout = getPosterLayout(2400, 3200);
    expect(layout.unit).toBeCloseTo(2);
    expect(layout.circle.r).toBeCloseTo(POSTER_CIRCLE_RATIO * 2400);
    expect(layout.title.size).toBeCloseTo(168);
    expect(layout.title.maxWidth).toBeCloseTo(2020);
    expect(layout.coordinates.tracking).toBeCloseTo(11);
  });

  it("el círculo queda centrado y los textos van debajo sin solaparse", () => {
    const layout = getPosterLayout(1200, 1600);
    expect(layout.circle.cx).toBe(600);
    expect(layout.circle.cy - layout.circle.r).toBeGreaterThan(0);
    expect(layout.title.y).toBeGreaterThan(layout.circle.cy + layout.circle.r);
    expect(layout.subtitle.y).toBeGreaterThan(layout.title.y);
    expect(layout.divider.y).toBeGreaterThan(layout.subtitle.y);
    expect(layout.coordinates.y).toBeGreaterThan(layout.divider.y);
    expect(layout.coordinates.y).toBeLessThan(layout.height);
  });

  it("cada formato de imprenta encaja sin desbordar", () => {
    for (const size of POSTER_SIZES) {
      const layout = getPosterLayout(size.widthPx, size.heightPx);
      // El pie de coordenadas termina dentro de la hoja (con el padding estimado).
      expect(layout.coordinates.y + 26 * layout.unit).toBeLessThanOrEqual(layout.height);
      // El disco no pisa el marco superior del papel.
      expect(layout.circle.cy - layout.circle.r).toBeGreaterThan(layout.innerFrameInset);
      // El ancho de los textos cabe en la caja de diseño.
      expect(layout.title.maxWidth).toBeLessThanOrEqual(layout.width);
      expect(layout.subtitle.maxWidth).toBeLessThanOrEqual(layout.width);
      expect(layout.coordinates.maxWidth).toBeLessThanOrEqual(layout.width);
    }
  });
});

describe("circleDiameterFor", () => {
  it("coincide con el diámetro del layout", () => {
    const diameter = circleDiameterFor(EXPORT_WIDTH);
    const layout = getPosterLayout(EXPORT_WIDTH);
    expect(diameter).toBeCloseTo(layout.circle.r * 2);
    expect(diameter).toBeCloseTo((2 * 424 * EXPORT_WIDTH) / 1200);
  });
});
