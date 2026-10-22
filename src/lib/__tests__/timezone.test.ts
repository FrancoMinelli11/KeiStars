import { describe, expect, it } from "vitest";
import {
  describeTimeZone,
  getUtcOffsetMinutesForWallDate,
  getUtcOffsetMinutesForWallTime,
  isValidTimeZone,
  resolveTimeZone,
} from "../timezone";

function wall(year: number, month: number, day: number, hour = 12, minute = 0) {
  return { year, month, day, hour, minute };
}

describe("resolveTimeZone", () => {
  it("traduce coordenadas a su zona IANA real", () => {
    expect(resolveTimeZone(-33, -68.5)).toBe("America/Argentina/Mendoza");
    expect(resolveTimeZone(40.4168, -3.7038)).toBe("Europe/Madrid");
    expect(resolveTimeZone(27.7172, 85.324)).toBe("Asia/Kathmandu");
    expect(resolveTimeZone(-34.6037, -58.3816)).toBe("America/Argentina/Buenos_Aires");
    expect(resolveTimeZone(35.6762, 139.6503)).toBe("Asia/Tokyo");
  });

  it("devuelve null con coordenadas fuera de rango", () => {
    expect(resolveTimeZone(200, 0)).toBeNull();
    expect(resolveTimeZone(0, 400)).toBeNull();
  });
});

describe("isValidTimeZone", () => {
  it("valida contra la base TZ del motor", () => {
    expect(isValidTimeZone("America/Argentina/Mendoza")).toBe(true);
    expect(isValidTimeZone("Europe/Madrid")).toBe(true);
    expect(isValidTimeZone("Marte/Olympus_Mons")).toBe(false);
  });
});

describe("getUtcOffsetMinutesForWallTime", () => {
  it("Mendoza es UTC−03:00 (no la estimación solar −05:00)", () => {
    expect(getUtcOffsetMinutesForWallTime("America/Argentina/Mendoza", wall(2024, 1, 15))).toBe(
      -180,
    );
    expect(getUtcOffsetMinutesForWallTime("America/Argentina/Mendoza", wall(2024, 7, 15))).toBe(
      -180,
    );
  });

  it("respeta el horario de verano de Madrid", () => {
    expect(getUtcOffsetMinutesForWallTime("Europe/Madrid", wall(2024, 1, 15))).toBe(60);
    expect(getUtcOffsetMinutesForWallTime("Europe/Madrid", wall(2024, 7, 15))).toBe(120);
  });

  it("husos de media y cuarto de hora", () => {
    expect(getUtcOffsetMinutesForWallTime("Asia/Kolkata", wall(2024, 6, 1))).toBe(330);
    expect(getUtcOffsetMinutesForWallTime("Asia/Kathmandu", wall(2024, 6, 1))).toBe(345);
  });

  it("describeTimeZone produce una etiqueta legible", () => {
    expect(describeTimeZone("America/Argentina/Mendoza", -180)).toBe(
      "America/Argentina/Mendoza · UTC-03:00",
    );
    expect(describeTimeZone(null, 345)).toBe("zona desconocida · UTC+05:45");
  });

  it("zona desconocida → null", () => {
    expect(getUtcOffsetMinutesForWallTime("Marte/Olympus_Mons", wall(2024, 1, 1))).toBeNull();
  });
});

describe("getUtcOffsetMinutesForWallDate", () => {
  it("usa los campos locales de la fecha de pared", () => {
    // buildSkyDate construye con el constructor local: los getters locales son
    // exactamente la hora de pared tecleada, independientemente del TZ del SO.
    const date = new Date(2024, 6, 15, 22, 0);
    expect(getUtcOffsetMinutesForWallDate("Europe/Madrid", date)).toBe(120);
    expect(getUtcOffsetMinutesForWallDate("America/Argentina/Mendoza", date)).toBe(-180);
  });
});
