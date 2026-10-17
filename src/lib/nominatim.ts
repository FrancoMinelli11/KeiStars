export interface PlaceResult {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
}

const NOMINATIM_ENDPOINT = "https://nominatim.openstreetmap.org/search";
/** Respaldo: Photon es un geocodificador OSM con CORS abierto y sin API key. */
const PHOTON_ENDPOINT = "https://photon.komoot.io/api/";

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

async function searchNominatim(query: string, signal?: AbortSignal): Promise<PlaceResult[]> {
  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    limit: "6",
    addressdetails: "1",
  });
  const payload = (await fetchJson(`${NOMINATIM_ENDPOINT}?${params.toString()}`, signal)) as NominatimItem[];
  if (!Array.isArray(payload)) return [];

  return payload
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
 * 1. Nominatim (OpenStreetMap): la referencia en calidad de resultados.
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
