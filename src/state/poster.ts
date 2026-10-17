import type { Dispatch, SetStateAction } from "react";
import { DEFAULT_THEME_ID, type PosterThemeId, type ProjectionKey } from "../lib/celestialConfig";
import { formatCoordinates, parseCoordinate } from "../lib/coordinates";
import { estimateUtcOffsetMinutes, formatLongDateEs, toInputDate } from "../lib/time";

export interface SkyFlags {
  lines: boolean;
  names: boolean;
  grid: boolean;
  milkyway: boolean;
}

export type SkyFlagKey = keyof SkyFlags;

export interface PosterState {
  /** Fecha en formato ISO corto, valor de `<input type="date">`. */
  dateStr: string;
  /** Hora local del evento, valor de `<input type="time">`. */
  timeStr: string;
  /** Desfase UTC en minutos respecto a la hora introducida. */
  utcOffsetMinutes: number;
  /** true = el usuario fijó el desfase a mano (no se recalcula solo). */
  offsetTouched: boolean;
  /** Texto crudo de los campos numéricos (permite escribir a medias). */
  latitudeText: string;
  longitudeText: string;
  /** Últimos valores válidos: son los que viajan al motor astronómico. */
  latitude: number;
  longitude: number;
  placeLabel: string;
  projection: ProjectionKey;
  theme: PosterThemeId;
  flags: SkyFlags;
  title: string;
  subtitle: string;
  subtitleTouched: boolean;
  coordinates: string;
  coordinatesTouched: boolean;
}

export const DEFAULT_LOCATION = {
  latitude: -33,
  longitude: -68.5,
  label: "Mendoza, Argentina",
};

export function createDefaultPoster(): PosterState {
  const today = new Date();
  const dateStr = toInputDate(today);

  return {
    dateStr,
    timeStr: "21:30",
    utcOffsetMinutes: estimateUtcOffsetMinutes(DEFAULT_LOCATION.longitude),
    offsetTouched: false,
    latitudeText: String(DEFAULT_LOCATION.latitude),
    longitudeText: String(DEFAULT_LOCATION.longitude),
    latitude: DEFAULT_LOCATION.latitude,
    longitude: DEFAULT_LOCATION.longitude,
    placeLabel: DEFAULT_LOCATION.label,
    projection: "stereographic",
    theme: DEFAULT_THEME_ID,
    flags: { lines: true, names: true, grid: false, milkyway: true },
    title: "La noche que nos conocimos",
    subtitle: formatLongDateEs(dateStr),
    subtitleTouched: false,
    coordinates: formatCoordinates(DEFAULT_LOCATION.latitude, DEFAULT_LOCATION.longitude),
    coordinatesTouched: false,
  };
}

/**
 * Actualiza coordenadas manteniendo sincronizados los textos derivados
 * (coordenadas decorativas y desfase UTC) salvo que el usuario los haya editado.
 */
function commitLocation(
  state: PosterState,
  latitudeText: string,
  longitudeText: string,
  extra: Partial<PosterState> = {},
): PosterState {
  const next: PosterState = { ...state, latitudeText, longitudeText, ...extra };
  const latitude = parseCoordinate(latitudeText, "latitude");
  const longitude = parseCoordinate(longitudeText, "longitude");

  if (latitude !== null) next.latitude = latitude;
  if (longitude !== null) next.longitude = longitude;

  if (latitude !== null && longitude !== null) {
    if (!next.coordinatesTouched) next.coordinates = formatCoordinates(latitude, longitude);
    if (!next.offsetTouched) next.utcOffsetMinutes = estimateUtcOffsetMinutes(longitude);
    if (!extra.placeLabel) next.placeLabel = "";
  }
  return next;
}

export interface PosterActions {
  setDate(value: string): void;
  setTime(value: string): void;
  setUtcOffsetMinutes(value: number): void;
  resetUtcOffset(): void;
  setLatitude(value: string): void;
  setLongitude(value: string): void;
  selectPlace(place: { latitude: number; longitude: number; label: string }): void;
  setProjection(value: ProjectionKey): void;
  setTheme(value: PosterThemeId): void;
  toggleFlag(key: SkyFlagKey): void;
  setTitle(value: string): void;
  setSubtitle(value: string): void;
  resetSubtitle(): void;
  setCoordinates(value: string): void;
  resetCoordinates(): void;
}

type PosterSetter = Dispatch<SetStateAction<PosterState>>;

export function createPosterActions(setPoster: PosterSetter): PosterActions {
  return {
    setDate(value) {
      setPoster((prev) => ({
        ...prev,
        dateStr: value,
        subtitle: prev.subtitleTouched ? prev.subtitle : formatLongDateEs(value) || prev.subtitle,
      }));
    },
    setTime(value) {
      setPoster((prev) => ({ ...prev, timeStr: value }));
    },
    setUtcOffsetMinutes(value) {
      setPoster((prev) => ({
        ...prev,
        utcOffsetMinutes: Math.min(840, Math.max(-720, Math.round(value))),
        offsetTouched: true,
      }));
    },
    resetUtcOffset() {
      setPoster((prev) => ({
        ...prev,
        utcOffsetMinutes: estimateUtcOffsetMinutes(prev.longitude),
        offsetTouched: false,
      }));
    },
    setLatitude(value) {
      setPoster((prev) => commitLocation(prev, value, prev.longitudeText));
    },
    setLongitude(value) {
      setPoster((prev) => commitLocation(prev, prev.latitudeText, value));
    },
    selectPlace(place) {
      setPoster((prev) =>
        commitLocation(prev, String(place.latitude), String(place.longitude), {
          placeLabel: place.label,
          // Al elegir una ciudad nueva el desfase vuelve a estimarse, salvo que
          // el usuario lo haya bloqueado antes a propósito.
          offsetTouched: false,
        }),
      );
    },
    setProjection(value) {
      setPoster((prev) => ({ ...prev, projection: value }));
    },
    setTheme(value) {
      setPoster((prev) => ({ ...prev, theme: value }));
    },
    toggleFlag(key) {
      setPoster((prev) => ({ ...prev, flags: { ...prev.flags, [key]: !prev.flags[key] } }));
    },
    setTitle(value) {
      setPoster((prev) => ({ ...prev, title: value }));
    },
    setSubtitle(value) {
      setPoster((prev) => ({ ...prev, subtitle: value, subtitleTouched: true }));
    },
    resetSubtitle() {
      setPoster((prev) => ({
        ...prev,
        subtitle: formatLongDateEs(prev.dateStr),
        subtitleTouched: false,
      }));
    },
    setCoordinates(value) {
      setPoster((prev) => ({ ...prev, coordinates: value, coordinatesTouched: true }));
    },
    resetCoordinates() {
      setPoster((prev) => ({
        ...prev,
        coordinates: formatCoordinates(prev.latitude, prev.longitude),
        coordinatesTouched: false,
      }));
    },
  };
}
