import { useEffect, useMemo, useState } from "react";
import { useDebouncedValue } from "./useDebouncedValue";
import { searchPlaces, type PlaceResult } from "../lib/nominatim";

export type CitySearchStatus = "idle" | "loading" | "success" | "error";

export interface CitySearchState {
  query: string;
  results: PlaceResult[];
  status: CitySearchStatus;
  error: string | null;
  setQuery(value: string): void;
  clear(): void;
}

const MIN_QUERY_LENGTH = 3;
const DEBOUNCE_MS = 450;
const REQUEST_TIMEOUT_MS = 12000;
const CACHE_LIMIT = 20;

const cache = new Map<string, PlaceResult[]>();

function remember(query: string, results: PlaceResult[]): void {
  if (cache.size >= CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(query, results);
}

/**
 * Buscador de ciudades con debounce de 450 ms y mínimo de 3 caracteres
 * (límites de uso de los geocodificadores públicos). Incluye cancelación de
 * peticiones superadas, timeout de 12 s y caché en memoria de las últimas
 * consultas.
 */
export function useCitySearch(): CitySearchState {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [status, setStatus] = useState<CitySearchStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const debouncedQuery = useDebouncedValue(query, DEBOUNCE_MS);

  useEffect(() => {
    const normalized = debouncedQuery.trim();

    if (normalized.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setStatus("idle");
      setError(null);
      return;
    }

    const cached = cache.get(normalized);
    if (cached) {
      setResults(cached);
      setStatus("success");
      setError(null);
      return;
    }

    const controller = new AbortController();
    let timedOut = false;
    const timeoutId = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, REQUEST_TIMEOUT_MS);

    setStatus("loading");

    searchPlaces(normalized, controller.signal)
      .then((found) => {
        remember(normalized, found);
        setResults(found);
        setError(null);
        setStatus("success");
      })
      .catch((caught: unknown) => {
        if (timedOut) {
          setResults([]);
          setError("La búsqueda tardó demasiado. Comprueba tu conexión y vuelve a intentarlo.");
          setStatus("error");
          return;
        }
        if (controller.signal.aborted) return; // consulta sustituida o componente desmontado
        setResults([]);
        setError(
          caught instanceof Error
            ? caught.message
            : "No se pudo consultar el servicio de mapas. Inténtalo de nuevo.",
        );
        setStatus("error");
      })
      .finally(() => window.clearTimeout(timeoutId));

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [debouncedQuery]);

  return useMemo(
    () => ({
      query,
      results,
      status,
      error,
      setQuery,
      clear() {
        setQuery("");
        setResults([]);
        setStatus("idle");
        setError(null);
      },
    }),
    [query, results, status, error],
  );
}
