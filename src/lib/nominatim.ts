export interface PlaceResult {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
}

/**
 * Endpoints sobreescribibles por entorno (`VITE_NOMINATIM_URL`,
 * `VITE_PHOTON_URL`): así un despliegue con tráfico real puede apuntar a una
 * instancia propia o un proxy sin tocar código.
 */
const NOMINATIM_ENDPOINT =
  import.meta.env.VITE_NOMINATIM_URL || "https://nominatim.openstreetmap.org/search";
/** Respaldo: Photon es un geocodificador OSM con CORS abierto y sin API key. */
const PHOTON_ENDPOINT = import.meta.env.VITE_PHOTON_URL || "https://photon.komoot.io/api/";

/** Atribución exigida por las datas de OSM / Photon. */
export const GEOCODER_ATTRIBUTION = "Geocodificado con Nominatim · © OpenStreetMap contributors";
export const OSM_ATTRIBUTION_URL = "https://www.openstreetmap.org/copyright";

interface NominatimItem {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

interface PhotonFeature {
  properties: {
    name?: string;
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    osm_type?: string;
    osm_id?: number;
  };
  geometry: { coordinates: [number, number] };
}

function toNominatimPlace(item: NominatimItem): PlaceResult {
  const parts = item.display_name.split(",").map((part) => part.trim());
  const label = [parts[0], parts[1], parts.at(-1)].filter(Boolean).join(", ");

  return {
    id: String(item.place_id),
    label,
    latitude: Number(item.lat),
    longitude: Number(item.lon),
  };
}

function toPhotonPlace(feature: PhotonFeature, index: number): PlaceResult {
  const p = feature.properties;
  const label = [p.name, p.city ?? p.state, p.country].filter(Boolean).join(", ");

  return {
    id: `${p.osm_type ?? "node"}:${p.osm_id ?? index}`,
    label: label || p.name || p.country || "Lugar sin nombre",
    latitude: feature.geometry.coordinates[1],
    longitude: feature.geometry.coordinates[0],
  };
}

async function fetchJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(url, {
    signal,
    headers: { Accept: "application/json", "Accept-Language": "es" },
  });
  if (!response.ok) {
    throw new Error(`El servicio de mapas respondió con ${response.status}.`);
  }
  return response.json();
}

/* ------------------------------------------------------------------ */
/* Throttle: máx. ~1 req/s (política de uso de Nominatim)              */
/* ------------------------------------------------------------------ */

const MIN_INTERVAL_MS = 1100;
let lastRequestAt = 0;
let queue: Promise<unknown> = Promise.resolve();

function scheduleThrottled<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const wait = Math.max(0, MIN_INTERVAL_MS - (Date.now() - lastRequestAt));
    if (wait > 0) await new Promise((resolve) => window.setTimeout(resolve, wait));
    lastRequestAt = Date.now();
    return task();
  });
  // La cola sobrevive a los errores del enunciado corriente.
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run as Promise<T>;
}

async function searchNominatim(query: string, signal?: AbortSignal): Promise<PlaceResult[]> {
  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    limit: "6",
  });
  const payload = scheduleThrottled(async () => {
    const data = await fetchJson(`${NOMINATIM_ENDPOINT}?${params.toString()}`, signal);
    return data;
  });
  const items = (await payload) as NominatimItem[];
  if (!Array.isArray(items)) return [];

  return items
    .map(toNominatimPlace)
    .filter((place) => Number.isFinite(place.latitude) && Number.isFinite(place.longitude));
}

async function searchPhoton(query: string, signal?: AbortSignal): Promise<PlaceResult[]> {
  const params = new URLSearchParams({ q: query, limit: "6" });
  const payload = (await fetchJson(`${PHOTON_ENDPOINT}?${params.toString()}`, signal)) as {
    features?: PhotonFeature[];
  };
  if (!Array.isArray(payload.features)) return [];

  return payload.features
    .map(toPhotonPlace)
    .filter((place) => Number.isFinite(place.latitude) && Number.isFinite(place.longitude));
}

/**
 * Busca lugares geocodificados.
 *
 * 1. Nominatim (OpenStreetMap): la referencia en calidad de resultados; con
 *    *throttle* duro de ~1 req/s y caché por consulta (el hook la gestiona).
 * 2. Photon: respaldo automático si Nominatim falla, limita la IP o está caído.
 *
 * La petición viaja con la señal del llamante para poder cancelarse, y el hook
 * la aborta a los 12 s para no dejar la interfaz en "buscando" indefinidamente.
 */
export async function searchPlaces(query: string, signal?: AbortSignal): Promise<PlaceResult[]> {
  try {
    return await searchNominatim(query, signal);
  } catch (nominatimError) {
    if (signal?.aborted) throw nominatimError;

    try {
      return await searchPhoton(query, signal);
    } catch {
      throw new Error(
        "No se pudo buscar el lugar: Nominatim y Photon no respondieron. Revisa tu conexión e inténtalo de nuevo.",
      );
    }
  }
}
