import type { CelestialApi } from "./celestialTypes";

/**
 * Carga segura de d3-celestial fuera del bundler.
 *
 * `celestial.min.js` es un IIFE clásico que termina en `this.Celestial = ...`
 * y usa la global `d3` en tiempo de evaluación. Importarlo desde un módulo ESM
 * (Vite) provoca `Cannot read properties of undefined (reading 'document')`
 * o `this is undefined`, por eso se inyectan <script> en orden:
 *
 *   d3.min.js (v3) → d3.geo.projection.min.js → celestial.min.js
 *
 * Estrategia:
 *   1. Origen local `public/vendor/celestial` (copiado por scripts/copy-vendor.mjs),
 *      validado contra `manifest.json` para garantizar que `datapath` no 404.
 *   2. Fallback a jsDelivr (mismo empaquetado publicado en npm).
 */

const BASE = import.meta.env.BASE_URL.endsWith("/")
  ? import.meta.env.BASE_URL
  : `${import.meta.env.BASE_URL}/`;

export interface CelestialSource {
  id: "local" | "cdn";
  label: string;
  base: string;
  /** Rutas relativas a `base`, en orden de ejecución. */
  scripts: string[];
  /** Ruta absoluta que se usará como `datapath` de la config. */
  datapath: string;
  manifestUrl: string | null;
}

export const REQUIRED_DATA_FILES = [
  "mw.json",
  "constellations.json",
  "constellations.borders.json",
  "constellations.lines.json",
  "stars.6.json",
  "starnames.json",
  "dsos.bright.json",
  "dsonames.json",
  "planets.json",
] as const;

const CDN_VERSION = "0.7.35";

const SOURCES: CelestialSource[] = [
  {
    id: "local",
    label: "vendor local",
    base: `${BASE}vendor/celestial/`,
    scripts: ["lib/d3.min.js", "lib/d3.geo.projection.min.js", "celestial.min.js"],
    datapath: `${BASE}vendor/celestial/data/`,
    manifestUrl: `${BASE}vendor/celestial/manifest.json`,
  },
  {
    id: "cdn",
    label: "jsDelivr",
    base: `https://cdn.jsdelivr.net/npm/d3-celestial@${CDN_VERSION}/`,
    scripts: ["lib/d3.min.js", "lib/d3.geo.projection.min.js", "celestial.min.js"],
    datapath: `https://cdn.jsdelivr.net/npm/d3-celestial@${CDN_VERSION}/data/`,
    manifestUrl: null,
  },
];

export interface CelestialBundle {
  api: CelestialApi;
  source: CelestialSource;
}

let pending: Promise<CelestialBundle> | null = null;
let resolved: CelestialBundle | null = null;

/*
 * Timeout de inyección: si un script remoto se cuelga, la app no queda
 * atrapada eternamente en "Cargando el motor…": el fallo se informa y el
 * fallback (o el reintentar del usuario) puede actuar.
 */
const SCRIPT_TIMEOUT_MS = 15_000;

function injectScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = false;

    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      script.remove();
      if (error) reject(error);
      else resolve();
    };

    const timeoutId = window.setTimeout(() => {
      finish(
        new Error(`Tiempo agotado (15 s) al cargar ${src.split("/").pop()}. Revisa tu conexión.`),
      );
    }, SCRIPT_TIMEOUT_MS);

    script.addEventListener("load", () => finish(), { once: true });
    script.addEventListener(
      "error",
      () => finish(new Error(`No se pudo cargar el script ${src}`)),
      { once: true },
    );
    document.head.appendChild(script);
  });
}

async function loadScripts(source: CelestialSource): Promise<void> {
  if (window.Celestial) return;
  for (const file of source.scripts) {
    await injectScript(`${source.base}${file}`);
  }
  if (!window.Celestial) {
    throw new Error(
      `Los scripts de ${source.label} se cargaron pero window.Celestial sigue indefinido.`,
    );
  }
}

/**
 * Comprueba que todos los GeoJSON exigidos por `load()` están publicados.
 * El origen local usa `manifest.json` (una única petición); el CDN se da por
 * válido si responde el manifiesto de npm.
 */
async function verifyData(source: CelestialSource): Promise<string[]> {
  if (!source.manifestUrl) return [];
  try {
    const response = await fetch(source.manifestUrl, { cache: "no-cache" });
    if (!response.ok) return [...REQUIRED_DATA_FILES];
    const manifest = (await response.json()) as { files?: string[] };
    const files = Array.isArray(manifest.files) ? manifest.files : [];
    return REQUIRED_DATA_FILES.filter((file) => !files.includes(file));
  } catch {
    return [...REQUIRED_DATA_FILES];
  }
}

async function boot(): Promise<CelestialBundle> {
  const failures: string[] = [];

  for (const source of SOURCES) {
    try {
      await loadScripts(source);
      const missing = await verifyData(source);
      if (missing.length > 0) {
        failures.push(`${source.label}: faltan datos (${missing.join(", ")})`);
        continue;
      }
      const api = window.Celestial;
      if (!api) throw new Error(`${source.label}: window.Celestial no disponible`);
      return { api, source };
    } catch (error) {
      failures.push(`${source.label}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  throw new Error(
    `No se pudo inicializar d3-celestial. ${failures.join(" | ")}. ` +
      "Ejecuta `npm run vendor` para regenerar public/vendor/celestial o revisa tu conexión.",
  );
}

/** Carga (o reutiliza) el bundle. Concurrencia segura: todas las llamadas comparten la promesa. */
export function loadCelestial(): Promise<CelestialBundle> {
  if (resolved) return Promise.resolve(resolved);
  if (!pending) {
    pending = boot()
      .then((bundle) => {
        resolved = bundle;
        return bundle;
      })
      .catch((error: unknown) => {
        pending = null;
        throw error;
      });
  }
  return pending;
}
