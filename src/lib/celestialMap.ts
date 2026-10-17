import { loadCelestial } from "./celestialLoader";
import {
  buildCelestialConfig,
  buildCelestialStyle,
  type CelestialStyleInput,
  type ProjectionKey,
} from "./celestialConfig";
import type { CelestialApi } from "./celestialTypes";
import { isValidLatitude, isValidLongitude } from "./coordinates";

/** ID fijo del contenedor: d3-celestial lo usa en selectores internos. */
export const CELESTIAL_HOST_ID = "keistars-sky";

export interface InitCelestialInput extends CelestialStyleInput {
  host: HTMLElement;
  projection: ProjectionKey;
  latitude: number;
  longitude: number;
  /** Se registra con `Celestial.addCallback`: se dispara tras cada repintado. */
  onRedraw?: () => void;
}

export interface SkyViewInput {
  date: Date;
  latitude: number;
  longitude: number;
  utcOffsetMinutes: number;
}

export function requireCelestial(): CelestialApi {
  const api = window.Celestial;
  if (!api) throw new Error("d3-celestial todavía no está cargado.");
  return api;
}

/**
 * Desmonta el estado global de d3-celestial.
 *
 * La librería es un singleton con estado a nivel de módulo (`Celestial.container`,
 * manejadores de `window.resize`, un `#celestial-form` hermano del mapa y un
 * `#error` en `body`). Sin esta limpieza, un montaje/desmontaje (React
 * StrictMode, cambio de proyección) duplicaría el formulario y dejaría el mapa
 * dibujándose en un `<container>` ya huérfano.
 */
export function destroyCelestial(host: HTMLElement | null): void {
  const api = window.Celestial;
  try {
    window.d3?.select(window).on("resize", null);
    window.d3?.select(document).on("mousedown", null);
  } catch {
    /* el listener ya no existe: nada que hacer */
  }
  try {
    api?.addCallback(null);
    api?.clear();
  } catch {
    /* API aún no inicializada */
  }
  if (api) api.container = null;

  if (host) {
    host.querySelectorAll("canvas, container").forEach((node) => node.remove());
    host.parentElement?.querySelector(":scope > #celestial-form")?.remove();
  }
  document.getElementById("error")?.remove();
}

/**
 * Inicializa (o reinicia) el mapa celeste sobre `host`.
 * El ciclo es: cargar scripts → destruir estado residual → `display()` →
 * registrar callback de repintado.
 */
export async function initCelestial(input: InitCelestialInput): Promise<void> {
  const { api, source } = await loadCelestial();
  const host = input.host;

  if (!host.isConnected) {
    throw new Error("El contenedor del mapa ya no está montado en el DOM.");
  }
  if (!host.id) {
    throw new Error(`El contenedor del mapa necesita el id "${CELESTIAL_HOST_ID}".`);
  }

  destroyCelestial(host);

  api.display(
    buildCelestialConfig({
      geometry: input.geometry,
      theme: input.theme,
      flags: input.flags,
      hostId: host.id,
      datapath: source.datapath,
      projection: input.projection,
      latitude: input.latitude,
      longitude: input.longitude,
    }),
  );
  api.addCallback(input.onRedraw ?? null);
}

/** Cambios de tema/visibilidad: repintado inmediato sin volver a descargar datos. */
export function applyCelestialStyle(input: CelestialStyleInput): void {
  requireCelestial().apply(buildCelestialStyle(input));
}

/**
 * Orienta el mapa al cenit del observador para una fecha/hora/desfase.
 * `skyview()` actualiza los campos internos del formulario y ejecuta el cálculo
 * de tiempo sideral + rotación (síncrono gracias a `disableAnimations`).
 */
export function applySkyView(input: SkyViewInput): void {
  if (!isValidLatitude(input.latitude)) {
    throw new Error(`Latitud inválida: ${input.latitude}`);
  }
  if (!isValidLongitude(input.longitude)) {
    throw new Error(`Longitud inválida: ${input.longitude}`);
  }
  requireCelestial().skyview({
    date: input.date,
    location: [input.latitude, input.longitude],
    timezone: input.utcOffsetMinutes,
  });
}
