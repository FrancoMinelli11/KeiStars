import type { Dispatch, SetStateAction } from "react";
import {
  DEFAULT_THEME_ID,
  withColorOverride,
  type PosterThemeId,
  type ProjectionKey,
  type ThemeOverrides,
} from "../lib/celestialConfig";
import { formatCoordinates, parseCoordinate } from "../lib/coordinates";
import { buildSkyDate, estimateUtcOffsetMinutes, formatLongDateEs, toInputDate } from "../lib/time";
import { getUtcOffsetMinutesForWallDate, resolveTimeZone } from "../lib/timezone";
import { DEFAULT_POSTER_SIZE_ID, POSTER_SIZES } from "../lib/posterSizes";

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
  /** Zona IANA del lugar (tz-lookup): base del desfase automático. */
  timeZone: string | null;
  projection: ProjectionKey;
  theme: PosterThemeId;
  /** Colores personalizados sobre el preset (`null` = preset puro). */
  themeOverrides: ThemeOverrides | null;
  /** Formato de impresión activo. */
  sizeId: string;
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

/**
 * Desfase automático para el estado: la hora de pared en la zona IANA del
 * lugar; sin zona o sin fecha/hora completas cae a la estimación por longitud.
 */
function automaticOffset(poster: PosterState): number {
  if (poster.timeZone) {
    const wall = buildSkyDate(poster.dateStr, poster.timeStr);
    if (wall) {
      const offset = getUtcOffsetMinutesForWallDate(poster.timeZone, wall);
      if (offset !== null) return offset;
    }
  }
  return estimateUtcOffsetMinutes(poster.longitude);
}

export function createDefaultPoster(): PosterState {
  const today = new Date();
  const dateStr = toInputDate(today);
  const timeStr = "21:30";

  const poster: PosterState = {
    dateStr,
    timeStr,
    utcOffsetMinutes: 0,
    offsetTouched: false,
    latitudeText: String(DEFAULT_LOCATION.latitude),
    longitudeText: String(DEFAULT_LOCATION.longitude),
    latitude: DEFAULT_LOCATION.latitude,
    longitude: DEFAULT_LOCATION.longitude,
    placeLabel: DEFAULT_LOCATION.label,
    timeZone: resolveTimeZone(DEFAULT_LOCATION.latitude, DEFAULT_LOCATION.longitude),
    projection: "stereographic",
    theme: DEFAULT_THEME_ID,
    themeOverrides: null,
    sizeId: DEFAULT_POSTER_SIZE_ID,
    flags: { lines: true, names: true, grid: false, milkyway: true },
    title: "La noche que nos conocimos",
    subtitle: formatLongDateEs(dateStr),
    subtitleTouched: false,
    coordinates: formatCoordinates(DEFAULT_LOCATION.latitude, DEFAULT_LOCATION.longitude),
    coordinatesTouched: false,
  };
  poster.utcOffsetMinutes = automaticOffset(poster);
  return poster;
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

  if (latitude === null || longitude === null) return next;

  next.latitude = latitude;
  next.longitude = longitude;
  next.timeZone = resolveTimeZone(latitude, longitude);
  if (!next.coordinatesTouched) next.coordinates = formatCoordinates(latitude, longitude);
  if (!next.offsetTouched) next.utcOffsetMinutes = automaticOffset(next);
  if (!extra.placeLabel) next.placeLabel = "";
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
  setThemeColor(group: "poster" | "sky", key: string, value: string): void;
  resetThemeColors(): void;
  setSizeId(value: string): void;
  toggleFlag(key: SkyFlagKey): void;
  setTitle(value: string): void;
  setSubtitle(value: string): void;
  resetSubtitle(): void;
  setCoordinates(value: string): void;
  resetCoordinates(): void;
  resetAll(): void;
}

type PosterSetter = Dispatch<SetStateAction<PosterState>>;

export function createPosterActions(setPoster: PosterSetter): PosterActions {
  return {
    /* Fecha y hora: el desfase automático (zona IANA + hora de pared) puede
       conmutar por DST; solo se recalcula con un instante completo, para no
       bailar mientras el usuario edita un campo a medias. */
    setDate(value) {
      setPoster((prev) => {
        const base: PosterState = {
          ...prev,
          dateStr: value,
          subtitle: prev.subtitleTouched ? prev.subtitle : formatLongDateEs(value) || prev.subtitle,
        };
        if (!prev.offsetTouched && prev.timeZone && buildSkyDate(value, prev.timeStr)) {
          base.utcOffsetMinutes = automaticOffset(base);
        }
        return base;
      });
    },
    setTime(value) {
      setPoster((prev) => {
        if (!prev.offsetTouched && prev.timeZone && buildSkyDate(prev.dateStr, value)) {
          return {
            ...prev,
            timeStr: value,
            utcOffsetMinutes: automaticOffset({ ...prev, timeStr: value }),
          };
        }
        return { ...prev, timeStr: value };
      });
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
        utcOffsetMinutes: automaticOffset(prev),
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
      // El preset fija la estética base: los retoques de color se limpian.
      setPoster((prev) => ({ ...prev, theme: value, themeOverrides: null }));
    },
    setThemeColor(group, key, value) {
      setPoster((prev) => ({
        ...prev,
        themeOverrides: withColorOverride(prev.themeOverrides, prev.theme, group, key, value),
      }));
    },
    resetThemeColors() {
      setPoster((prev) => ({ ...prev, themeOverrides: null }));
    },
    setSizeId(value) {
      setPoster((prev) => ({
        ...prev,
        sizeId: POSTER_SIZES.some((size) => size.id === value) ? value : prev.sizeId,
      }));
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
    resetAll() {
      setPoster(createDefaultPoster());
    },
  };
}
