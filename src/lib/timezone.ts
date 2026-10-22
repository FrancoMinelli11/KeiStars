/**
 * Zonas horarias reales (IANA) a partir de coordenadas.
 *
 * Sustituye la estimación solar `longitud/15` (que daba UTC-5 en Mendoza cuando
 * la zona real es UTC-3, redondeaba Nepal (+05:45) a +06:00 e ignoraba el
 * horario de verano) por:
 *
 *   1. `tz-lookup` → zona IANA (polígono internacional TZ).
 *   2. `Intl.DateTimeFormat(zone).formatToParts()` → desfase UTC válido para
 *      la **hora de pared** elegida, con transiciones de DST resueltas
 *      iterando dos veces (horas ambiguas caen en el desfase posterior).
 */

import tzlookup from "tz-lookup";
import { clamp } from "./time";

export interface WallTime {
  year: number;
  /** 1–12 */
  month: number;
  day: number;
  hour: number;
  minute: number;
}

/** Resuelve la zona IANA de unas coordenadas; `null` si no hay datos. */
export function resolveTimeZone(latitude: number, longitude: number): string | null {
  try {
    const zone = tzlookup(latitude, longitude);
    return typeof zone === "string" && zone.length > 0 && isValidTimeZone(zone) ? zone : null;
  } catch {
    return null;
  }
}

/** ¿Intl conoce la zona? (defensa contra bases TZ desactualizadas). */
export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

/* Desfase instantáneo, con caché de formateadores por zona. */
const formatters = new Map<string, Intl.DateTimeFormat>();

function formatParts(zone: string, at: Date): Record<string, number> {
  let formatter = formatters.get(zone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      hour12: false,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    formatters.set(zone, formatter);
  }
  const map: Record<string, number> = {};
  for (const part of formatter.formatToParts(at)) {
    if (part.type !== "literal") map[part.type] = Number(part.value);
  }
  return map;
}

/** Desfase (minutos) de `zone` para el instante `at`. */
function offsetAt(zone: string, at: Date): number {
  const parts = formatParts(zone, at);
  const hour = parts.hour === 24 ? 0 : parts.hour;
  const wallAsUtc = Date.UTC(
    parts.year,
    (parts.month ?? 1) - 1,
    parts.day ?? 1,
    hour ?? 0,
    parts.minute ?? 0,
  );
  return (wallAsUtc - at.getTime()) / 60_000;
}

/**
 * Desfase UTC (minutos) que convierte la hora de pared `wall` en el instante
 * correcto dentro de `zone`, contemplando DST.
 *
 * Dos iteraciones convergen en horas normales y en la mayoría de transiciones:
 *  - muelle (hora inexistente 02:30 AST→EDT): devuelven el desfase posterior.
 *  - otoño (hora ambigua 01:30): devuelven el desfase estándar (posterior).
 */
export function getUtcOffsetMinutesForWallTime(zone: string, wall: WallTime): number | null {
  if (!isValidTimeZone(zone)) return null;
  const asUtc = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute);
  if (!Number.isFinite(asUtc)) return null;
  let offset = offsetAt(zone, new Date(asUtc));
  offset = offsetAt(zone, new Date(asUtc - offset * 60_000));
  return clamp(Math.round(offset), -720, 840);
}

/**
 * Desfase para una `Date` de pared (la que construye `buildSkyDate`: sus campos
 * locales son exactamente los que escribió el usuario).
 */
export function getUtcOffsetMinutesForWallDate(zone: string, wall: Date): number | null {
  return getUtcOffsetMinutesForWallTime(zone, {
    year: wall.getFullYear(),
    month: wall.getMonth() + 1,
    day: wall.getDate(),
    hour: wall.getHours(),
    minute: wall.getMinutes(),
  });
}

/** Etiqueta corta para la UI: "America/Argentina/Mendoza (UTC-03:00)". */
export function describeTimeZone(zone: string | null, offsetMinutes: number): string {
  const zoneLabel = zone ?? "zona desconocida";
  const sign = offsetMinutes < 0 ? "-" : "+";
  const abs = Math.abs(offsetMinutes);
  const hours = String(Math.floor(abs / 60)).padStart(2, "0");
  const minutes = String(abs % 60).padStart(2, "0");
  return `${zoneLabel} · UTC${sign}${hours}:${minutes}`;
}
