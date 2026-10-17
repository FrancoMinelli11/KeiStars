/** Parseo, validación y formato decorativo de coordenadas geográficas. */

export function isValidLatitude(value: number): boolean {
  return Number.isFinite(value) && value >= -90 && value <= 90;
}

export function isValidLongitude(value: number): boolean {
  return Number.isFinite(value) && value >= -180 && value <= 180;
}

/**
 * Acepta coma o punto decimal. Devuelve `null` cuando el valor está vacío,
 * no es numérico o se sale del rango del eje.
 */
export function parseCoordinate(value: string, axis: "latitude" | "longitude"): number | null {
  const normalized = value.trim().replace(",", ".");
  if (normalized === "") return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;
  return axis === "latitude"
    ? isValidLatitude(parsed)
      ? parsed
      : null
    : isValidLongitude(parsed)
      ? parsed
      : null;
}

function toDms(value: number, axis: "latitude" | "longitude"): string {
  const direction = axis === "latitude" ? (value >= 0 ? "N" : "S") : value >= 0 ? "E" : "W";
  const absolute = Math.abs(value);
  let degrees = Math.floor(absolute);
  let minutes = Math.round((absolute - degrees) * 60);
  if (minutes === 60) {
    degrees += 1;
    minutes = 0;
  }
  return `${degrees}° ${String(minutes).padStart(2, "0")}' ${direction}`;
}

/** -33, -68.5 → "33° 00' S, 68° 30' W" */
export function formatCoordinates(latitude: number, longitude: number): string {
  if (!isValidLatitude(latitude) || !isValidLongitude(longitude)) return "";
  return `${toDms(latitude, "latitude")}, ${toDms(longitude, "longitude")}`;
}
