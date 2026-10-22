import { describe, expect, it } from "vitest";
import {
  buildSkyDate,
  estimateUtcOffsetMinutes,
  formatLongDateEs,
  formatUtcOffset,
  toInputDate,
} from "../time";

describe("buildSkyDate", () => {
  it("acepta una fecha/hora reales", () => {
    const date = buildSkyDate("2024-02-29", "21:30");
    expect(date).not.toBeNull();
    expect(date?.getFullYear()).toBe(2024);
    expect(date?.getMonth()).toBe(1);
    expect(date?.getDate()).toBe(29);
    expect(date?.getHours()).toBe(21);
    expect(date?.getMinutes()).toBe(30);
  });

  it("rechaza 29 de febrero en años no bisiestos", () => {
    expect(buildSkyDate("2023-02-29", "21:30")).toBeNull();
  });

  it("rechaza el día 30 de febrero y fechas imposibles", () => {
    expect(buildSkyDate("2024-02-30", "21:30")).toBeNull();
    expect(buildSkyDate("2024-04-31", "21:30")).toBeNull();
  });

  it("rechaza horas fuera de rango", () => {
    expect(buildSkyDate("2024-02-29", "24:00")).toBeNull();
    expect(buildSkyDate("2024-02-29", "12:60")).toBeNull();
  });

  it("rechaza entradas vacías o parciales", () => {
    expect(buildSkyDate("", "21:30")).toBeNull();
    expect(buildSkyDate("2024-02-29", "")).toBeNull();
    expect(buildSkyDate("bogus", "21:30")).toBeNull();
  });
});

describe("formatLongDateEs", () => {
  it("formato sin depender del locale", () => {
    expect(formatLongDateEs("2024-02-14")).toBe("14 de febrero de 2024");
    expect(formatLongDateEs("1999-12-31")).toBe("31 de diciembre de 1999");
  });

  it("devuelve vacío con basura", () => {
    expect(formatLongDateEs("14/02/2024")).toBe("");
    expect(formatLongDateEs("")).toBe("");
    expect(formatLongDateEs("2024-13-40")).toBe("");
  });
});

describe("formatUtcOffset", () => {
  it("formatos con signo y media hora", () => {
    expect(formatUtcOffset(330)).toBe("UTC+05:30");
    expect(formatUtcOffset(-300)).toBe("UTC-05:00");
    expect(formatUtcOffset(0)).toBe("UTC+00:00");
    expect(formatUtcOffset(840)).toBe("UTC+14:00");
  });
});

describe("estimateUtcOffsetMinutes", () => {
  it("estimación solar aproximada", () => {
    expect(estimateUtcOffsetMinutes(-68.5)).toBe(-300);
    expect(estimateUtcOffsetMinutes(0)).toBe(0);
  });

  it("aclampa a los rangos válidos", () => {
    expect(estimateUtcOffsetMinutes(200)).toBeLessThanOrEqual(840);
    expect(estimateUtcOffsetMinutes(-2000)).toBe(-720);
    expect(estimateUtcOffsetMinutes(Number.NaN)).toBe(0);
  });
});

describe("toInputDate", () => {
  it("emite YYYY-MM-DD con ceros", () => {
    expect(toInputDate(new Date(2024, 0, 5))).toBe("2024-01-05");
  });
});
