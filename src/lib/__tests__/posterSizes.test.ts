import { describe, expect, it } from "vitest";
import {
  DEFAULT_POSTER_SIZE_ID,
  describePosterSize,
  EXPORT_WIDTH,
  getPosterSize,
  POSTER_SIZES,
  PREVIEW_WIDTH,
  PRINT_DPI,
} from "../posterSizes";

describe("POSTER_SIZES", () => {
  it("usa proporciones de papel verticales estándar", () => {
    expect(POSTER_SIZES.map((size) => size.id)).toEqual(["21x30", "30x40", "40x50", "50x70"]);
    for (const size of POSTER_SIZES) {
      expect(size.heightCm).toBeGreaterThan(size.widthCm);
      expect(size.widthMm).toBe(size.widthCm * 10);
      expect(size.heightMm).toBe(size.heightCm * 10);
    }
  });

  it("convierte cm a píxeles a 300 DPI", () => {
    const size = getPosterSize("30x40");
    expect(size.widthPx).toBe(Math.round((30 / 2.54) * PRINT_DPI));
    expect(size.heightPx).toBe(Math.round((40 / 2.54) * PRINT_DPI));
    expect(size.widthPx).toBe(3543);
    expect(size.heightPx).toBe(4724);
  });

  it("el 50×70 supera los 48 Mpx", () => {
    const size = getPosterSize("50x70");
    expect(size.widthPx).toBe(5906);
    expect(size.heightPx).toBe(8268);
    expect(size.widthPx * size.heightPx).toBeGreaterThan(48_000_000);
  });

  it("el 30×40 es el formato por defecto y existe", () => {
    expect(POSTER_SIZES.some((size) => size.id === DEFAULT_POSTER_SIZE_ID)).toBe(true);
    expect(DEFAULT_POSTER_SIZE_ID).toBe("30x40");
  });
});

describe("getPosterSize", () => {
  it("un id desconocido cae al primer formato disponible", () => {
    expect(getPosterSize("nope")).toBe(POSTER_SIZES[0]);
  });
});

describe("describePosterSize", () => {
  it("describe px y DPI", () => {
    expect(describePosterSize(getPosterSize("30x40"))).toBe("3543 × 4724 px · 300 DPI");
  });
});

describe("anchos de lienzo", () => {
  it("la exportación PNG duplica la vista previa", () => {
    expect(PREVIEW_WIDTH).toBe(1200);
    expect(EXPORT_WIDTH).toBe(PREVIEW_WIDTH * 2);
  });
});
