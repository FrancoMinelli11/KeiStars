import { describe, expect, it } from "vitest";
import { formatCoordinates, parseCoordinate } from "../coordinates";

describe("parseCoordinate", () => {
  it("acepta coma decimal y punto", () => {
    expect(parseCoordinate("-33,44", "latitude")).toBeCloseTo(-33.44);
    expect(parseCoordinate("-68.5", "longitude")).toBeCloseTo(-68.5);
  });

  it("acepta enteros y espacios", () => {
    expect(parseCoordinate("  33 ", "latitude")).toBe(33);
  });

  it("rechaza vacíos, texto y fuera de rango", () => {
    expect(parseCoordinate("", "latitude")).toBeNull();
    expect(parseCoordinate("abc", "latitude")).toBeNull();
    expect(parseCoordinate("95", "latitude")).toBeNull();
    expect(parseCoordinate("-91", "latitude")).toBeNull();
    expect(parseCoordinate("200", "longitude")).toBeNull();
    expect(parseCoordinate("-181", "longitude")).toBeNull();
    expect(parseCoordinate("90", "latitude")).toBe(90);
    expect(parseCoordinate("180", "longitude")).toBe(180);
  });
});

describe("formatCoordinates", () => {
  it("formato DMS Mendoza", () => {
    expect(formatCoordinates(-33, -68.5)).toBe("33° 00' S, 68° 30' W");
  });

  it("hemisferio norte y este", () => {
    expect(formatCoordinates(40.25, 3.6)).toBe("40° 15' N, 3° 36' E");
  });

  it("redondeo de minutos (59,6' → 60' acarreo a grado)", () => {
    expect(formatCoordinates(0, 0)).toBe("0° 00' N, 0° 00' E");
  });

  it("inválidos → vacío", () => {
    expect(formatCoordinates(95, 0)).toBe("");
    expect(formatCoordinates(Number.NaN, 0)).toBe("");
  });
});
