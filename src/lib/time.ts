/**
 * Utilidades de fecha/hora para la mecánica celeste.
 *
 * d3-celestial trabaja con la *hora de pared* del lugar del evento y un
 * desfase UTC en minutos: internamente calcula
 *   `instanteUTC = horaDePared − (desfaseUTC − desfaseDelNavegador)`
 * y a partir de ahí obtiene el tiempo sideral local (`getMST`) y el cenit.
 * Por eso el `Date` que pasamos debe tener los campos locales igual a la hora
 * elegida por el usuario (se construye con el constructor local, no con ISO).
 */

export const MONTHS_ES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
] as const;

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^(\d{2}):(\d{2})$/;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Convierte una Date local al valor esperado por `<input type="date">`. */
export function toInputDate(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** "2024-02-14" → "14 de febrero de 2024" (locale independiente). */
export function formatLongDateEs(dateStr: string): string {
  const match = DATE_PATTERN.exec(dateStr.trim());
  if (!match) return "";
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return "";
  return `${day} de ${MONTHS_ES[month - 1]} de ${year}`;
}

/**
 * Construye la fecha de pared que d3-celestial formateará y re-analizará.
 * Devuelve `null` si los inputs no son una fecha/hora reales (30 de febrero…).
 */
export function buildSkyDate(dateStr: string, timeStr: string): Date | null {
  const dateMatch = DATE_PATTERN.exec(dateStr.trim());
  const timeMatch = TIME_PATTERN.exec(timeStr.trim());
  if (!dateMatch || !timeMatch) return null;

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  if (hour > 23 || minute > 59) return null;

  const date = new Date(year, month - 1, day, hour, minute, 0, 0);
  // Rechaza combinaciones inexistentes (2024-02-30 → 1 de marzo).
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute
  ) {
    return null;
  }
  return date;
}

/**
 * Estimación de desfase UTC a partir de la longitud (hora solar).
 * Solo es una base: para latitudes con zona horaria política (p. ej. España,
 * UTC+1) el usuario debe ajustarlo manualmente en el panel.
 */
export function estimateUtcOffsetMinutes(longitude: number): number {
  if (!Number.isFinite(longitude)) return 0;
  return clamp(Math.round(longitude / 15) * 60, -720, 840);
}

/** 330 → "UTC+05:30" · −300 → "UTC-05:00" · 0 → "UTC+00:00" */
export function formatUtcOffset(minutes: number): string {
  const sign = minutes < 0 ? "-" : "+";
  const abs = Math.abs(minutes);
  const hours = String(Math.floor(abs / 60)).padStart(2, "0");
  const rest = String(abs % 60).padStart(2, "0");
  return `UTC${sign}${hours}:${rest}`;
}
