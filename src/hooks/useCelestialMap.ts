import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useDebouncedValue } from "./useDebouncedValue";
import {
  EXPORT_WIDTH,
  THEMES,
  computeMapGeometry,
  type MapGeometry,
  type PosterThemeId,
  type ProjectionKey,
} from "../lib/celestialConfig";
import {
  applyCelestialStyle,
  applySkyView,
  destroyCelestial,
  initCelestial,
} from "../lib/celestialMap";
import { circleDiameterFor } from "../lib/posterLayout";
import { buildSkyDate } from "../lib/time";
import type { SkyFlags } from "../state/poster";

export type CelestialStatus = "boot" | "ready" | "error";

export interface CelestialMapParams {
  hostRef: RefObject<HTMLDivElement | null>;
  projection: ProjectionKey;
  themeId: PosterThemeId;
  flags: SkyFlags;
  dateStr: string;
  timeStr: string;
  utcOffsetMinutes: number;
  latitude: number;
  longitude: number;
  /** Disparado tras cada repintado de d3-celestial. Debe ser estable. */
  onRedraw: () => void;
}

export interface CelestialMapResult {
  status: CelestialStatus;
  error: string | null;
  geometry: MapGeometry;
  retry: () => void;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Ciclo de vida del mapa celeste:
 *
 * 1. `init` → carga los scripts, ejecuta `Celestial.display()` y enfoque inicial
 *    al cenit con `Celestial.skyview()`.
 * 2. `style` → `Celestial.apply()` al cambiar tema o visibilidad (sin recarga).
 * 3. `sky`   → `Celestial.skyview()` con debounce ante cambios de fecha/hora/lugar.
 *
 * El desmontaje (o el cambio de proyección) siempre pasa por
 * `destroyCelestial()` para no dejar contenedores huérfanos ni listeners.
 */
export function useCelestialMap(params: CelestialMapParams): CelestialMapResult {
  const [status, setStatus] = useState<CelestialStatus>("boot");
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const theme = THEMES[params.themeId];
  const geometry = useMemo(
    () => computeMapGeometry(params.projection, circleDiameterFor(EXPORT_WIDTH)),
    [params.projection],
  );

  // Los efectos leen los últimos valores sin reejecutarse por cada tecla.
  const latest = useRef(params);
  latest.current = params;

  // La clave de inicialización encapsula proyección + reintento a propósito:
  // cambiar de proyección altera el tamaño del lienzo y exige un `display()` nuevo.
  const initKey = `${params.projection}:${attempt}`;

  useEffect(() => {
    const host = latest.current.hostRef.current;
    if (!host) return;

    let cancelled = false;
    setStatus("boot");
    setError(null);

    void (async () => {
      const current = latest.current;
      try {
        await initCelestial({
          host,
          geometry,
          theme: THEMES[current.themeId],
          flags: current.flags,
          projection: current.projection,
          latitude: current.latitude,
          longitude: current.longitude,
          onRedraw: current.onRedraw,
        });
        if (cancelled) return;
        setStatus("ready");

        const date = buildSkyDate(current.dateStr, current.timeStr);
        if (date) {
          applySkyView({
            date,
            latitude: current.latitude,
            longitude: current.longitude,
            utcOffsetMinutes: current.utcOffsetMinutes,
          });
        }
      } catch (caught) {
        if (cancelled) return;
        setStatus("error");
        setError(errorMessage(caught));
      }
    })();

    return () => {
      cancelled = true;
      destroyCelestial(latest.current.hostRef.current);
    };
  }, [initKey, geometry]);

  // Tema y toggles: repintado inmediato sin volver a descargar los GeoJSON.
  useEffect(() => {
    if (status !== "ready") return;
    try {
      applyCelestialStyle({ geometry, theme, flags: latest.current.flags });
      setError(null);
    } catch (caught) {
      setStatus("error");
      setError(errorMessage(caught));
    }
  }, [status, theme, params.flags, geometry]);

  // Fecha / hora / lugar: desacoplados de la edición de los textos del póster.
  const astronomyKey = [
    params.dateStr,
    params.timeStr,
    params.utcOffsetMinutes,
    params.latitude,
    params.longitude,
  ].join("|");
  const debouncedAstronomyKey = useDebouncedValue(astronomyKey, 400);

  useEffect(() => {
    if (status !== "ready") return;
    const current = latest.current;
    const date = buildSkyDate(current.dateStr, current.timeStr);
    if (!date) return;
    try {
      applySkyView({
        date,
        latitude: current.latitude,
        longitude: current.longitude,
        utcOffsetMinutes: current.utcOffsetMinutes,
      });
      setError(null);
    } catch (caught) {
      setStatus("error");
      setError(errorMessage(caught));
    }
  }, [status, debouncedAstronomyKey]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  return { status, error, geometry, retry };
}
