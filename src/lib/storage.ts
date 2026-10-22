/**
 * Persistencia del diseño y enlace compartible.
 *
 * - El estado completo se serializa con versión de esquema (`v`) y se restaura
 *   desde localStorage al abrir la app.
 * - `buildShareHref` codifica el estado en un fragmento `#p=` (base64url del
 *   JSON UTF-8) para que «compartir» no toque un servidor: el enlace abre la
 *   app con el póster ya montado.
 */

import { createDefaultPoster, type PosterState } from "../state/poster";
import { hasColorOverrides, isHexColor, THEME_IDS, type ThemeOverrides } from "./themes";
import { POSTER_SIZES } from "./posterSizes";
import { isValidTimeZone } from "./timezone";

const STORAGE_KEY = "keistars.poster.v2";
export const SHARE_HASH_PREFIX = "#p=";
/** Versión del esquema serializado; los payloads distintos se descartan. */
export const SCHEMA_VERSION = 2;

/* ------------------------------------------------------------------ */
/* Serialización                                                       */
/* ------------------------------------------------------------------ */

/** Los campos se congelan a la forma compartida (sin textos en vivo referencias). */
export function serializePoster(poster: PosterState): SerializedPoster {
  return {
    v: SCHEMA_VERSION,
    dateStr: poster.dateStr,
    timeStr: poster.timeStr,
    utcOffsetMinutes: poster.utcOffsetMinutes,
    offsetTouched: poster.offsetTouched,
    latitudeText: poster.latitudeText,
    longitudeText: poster.longitudeText,
    latitude: poster.latitude,
    longitude: poster.longitude,
    placeLabel: poster.placeLabel,
    timeZone: poster.timeZone,
    projection: poster.projection,
    theme: poster.theme,
    themeOverrides: poster.themeOverrides,
    sizeId: poster.sizeId,
    flags: poster.flags,
    title: poster.title,
    subtitle: poster.subtitle,
    subtitleTouched: poster.subtitleTouched,
    coordinates: poster.coordinates,
    coordinatesTouched: poster.coordinatesTouched,
  };
}

export interface SerializedPoster extends Omit<PosterState, never> {
  v: number;
}

/* ------------------------------------------------------------------ */
/* Hidratación defensiva                                               */
/* ------------------------------------------------------------------ */

const EXPECTED_FLAGS = ["lines", "names", "grid", "milkyway"] as const;

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asBool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function asFlags(value: unknown, fallback: PosterState["flags"]): PosterState["flags"] {
  if (!value || typeof value !== "object") return fallback;
  const raw = value as Record<string, unknown>;
  const next = { ...fallback };
  for (const key of EXPECTED_FLAGS) {
    const flag = raw[key];
    if (typeof flag === "boolean") next[key] = flag;
  }
  return next;
}

function asSizeId(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  return POSTER_SIZES.some((size) => size.id === value) ? value : fallback;
}

function asProjection(
  value: unknown,
  fallback: PosterState["projection"],
): PosterState["projection"] {
  return typeof value === "string" && value === "stereographic"
    ? "stereographic"
    : typeof value === "string" && value === "azimuthalEquidistant"
      ? "azimuthalEquidistant"
      : fallback;
}

function asTheme(value: unknown, fallback: PosterState["theme"]): PosterState["theme"] {
  return typeof value === "string" && (THEME_IDS as string[]).includes(value)
    ? (value as PosterState["theme"])
    : fallback;
}

function asTimeZone(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 && isValidTimeZone(value) ? value : null;
}

function asThemeOverrides(value: unknown): ThemeOverrides | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const patch = (group: "poster" | "sky"): Record<string, string> | undefined => {
    const section = raw[group];
    if (!section || typeof section !== "object") return undefined;
    const source = section as Record<string, unknown>;
    const cleaned: Record<string, string> = {};
    for (const [key, color] of Object.entries(source)) {
      if (isHexColor(color)) cleaned[key] = color.toLowerCase();
    }
    return Object.keys(cleaned).length > 0 ? cleaned : undefined;
  };
  const poster = patch("poster");
  const sky = patch("sky");
  const overrides: ThemeOverrides = {};
  if (poster) overrides.poster = poster;
  if (sky) overrides.sky = sky;
  return hasColorOverrides(overrides) ? overrides : null;
}

/**
 * Reconstruye un `PosterState` desde datos serializados (url/localStorage).
 * Los campos inválidos caen al valor por defecto correspondiente.
 */
export function hydratePoster(payload: unknown): PosterState | null {
  if (!payload || typeof payload !== "object") return null;
  const raw = payload as Record<string, unknown>;
  if (raw.v !== SCHEMA_VERSION) return null;

  const defaults = createDefaultPoster();

  const offset = asNumber(raw.utcOffsetMinutes, defaults.utcOffsetMinutes);
  const themeOverrides = asThemeOverrides(raw.themeOverrides);

  const poster: PosterState = {
    dateStr: asString(raw.dateStr, ""),
    timeStr: asString(raw.timeStr, ""),
    utcOffsetMinutes: Math.min(840, Math.max(-720, Math.round(offset))),
    offsetTouched: asBool(raw.offsetTouched, false),
    latitudeText: asString(raw.latitudeText, defaults.latitudeText),
    longitudeText: asString(raw.longitudeText, defaults.longitudeText),
    latitude: asNumber(raw.latitude, defaults.latitude),
    longitude: asNumber(raw.longitude, defaults.longitude),
    placeLabel: asString(raw.placeLabel, ""),
    timeZone: asTimeZone(raw.timeZone),
    projection: asProjection(raw.projection, defaults.projection),
    theme: asTheme(raw.theme, defaults.theme),
    themeOverrides,
    sizeId: asSizeId(raw.sizeId, defaults.sizeId),
    flags: asFlags(raw.flags, defaults.flags),
    title: asString(raw.title, ""),
    subtitle: asString(raw.subtitle, ""),
    subtitleTouched: asBool(raw.subtitleTouched, false),
    coordinates: asString(raw.coordinates, ""),
    coordinatesTouched: asBool(raw.coordinatesTouched, false),
  };
  return poster;
}

/* ------------------------------------------------------------------ */
/* Codificación base64url (UTF-8 seguro)                               */
/* ------------------------------------------------------------------ */

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(encoded: string): Uint8Array {
  const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i) & 0xff;
  return bytes;
}

/* ------------------------------------------------------------------ */
/* Compartir y persistir                                               */
/* ------------------------------------------------------------------ */

interface LocationLike {
  origin: string;
  pathname: string;
}

/**
 * Enlace compartible: `https://host/path#p=<base64url.json>`.
 * `current` se inyecta para poder probar en Node.
 */
export function buildShareHref(poster: PosterState, current?: LocationLike): string {
  const location = current ?? (typeof window !== "undefined" ? window.location : undefined);
  const payload = toBase64Url(new TextEncoder().encode(JSON.stringify(serializePoster(poster))));
  const base = location ? `${location.origin}${location.pathname}` : "/";
  return `${base}${SHARE_HASH_PREFIX}${payload}`;
}

/** Lee el hash `#p=` y decodifica el estado; `null` si no es válido. */
export function decodeShareState(hash: string): PosterState | null {
  if (!hash.startsWith(SHARE_HASH_PREFIX)) return null;
  try {
    const json = new TextDecoder().decode(fromBase64Url(hash.slice(SHARE_HASH_PREFIX.length)));
    return hydratePoster(JSON.parse(json));
  } catch {
    return null;
  }
}

/** Guarda el diseño en localStorage (silencioso: la cuota falla sin drama). */
export function savePoster(poster: PosterState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(serializePoster(poster)));
  } catch {
    /* almacenamiento lleno o bloqueado */
  }
}

/**
 * Estado inicial de la app: el enlace compartido manda, después el borrador
 * guardado, y por último el diseño por defecto.
 */
export function loadInitialPoster(): PosterState {
  if (typeof window === "undefined") return createDefaultPoster();

  try {
    const fromHash = decodeShareState(window.location.hash);
    if (fromHash) return fromHash;
  } catch {
    /* hash corrupto: se sigue con el storage */
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = hydratePoster(JSON.parse(stored));
      if (parsed) return parsed;
    }
  } catch {
    /* JSON corrupto: diseño por defecto */
  }

  return createDefaultPoster();
}
