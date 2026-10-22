/**
 * Copia los assets necesarios de `d3-celestial` (UMD + datos GeoJSON/estelares)
 * a `public/vendor/celestial` para que Vite los sirva como archivos estáticos.
 *
 * Motivo: `celestial.min.js` es un IIFE clásico que asigna `this.Celestial`
 * y referencia la variable global `d3` en tiempo de evaluación. Empaquetarlo
 * con Vite/ESM rompe ambos supuestos (`this === undefined` en módulos ESM y
 * `module.exports` indefinido), así que se carga fuera del bundler.
 *
 * También copia el LICENSE del paquete al vendor: si publicas `dist/`, los
 * avisos BSD viajan con los ficheros (ver THIRD_PARTY_NOTICES.md).
 *
 * Se ejecuta automáticamente en `predev` y `prebuild`.
 *
 * ATENCIÓN: src/lib/celestialLoader.ts declara este mismo listado; si cambias
 * aquí, cambia allá también.
 */
import { copyFile, mkdir, readFile, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = path.join(root, "node_modules", "d3-celestial");
const targetDir = path.join(root, "public", "vendor", "celestial");

/** Scripts UMD (orden de carga: d3 v3 -> proyecciones -> d3-celestial). */
const SCRIPT_FILES = ["lib/d3.min.js", "lib/d3.geo.projection.min.js", "celestial.min.js"];

/**
 * Ficheros de datos que `d3-celestial` descarga de `datapath` de forma
 * incondicional en `load()` (aunque la capa correspondiente esté desactivada).
 * Su ausencia provoca 404 + `window.alert` en el caso de `mw.json`.
 */
const DATA_FILES = [
  "mw.json",
  "constellations.json",
  "constellations.borders.json",
  "constellations.lines.json",
  "stars.6.json",
  "starnames.json",
  "dsos.bright.json",
  "dsonames.json",
  "planets.json",
];

/** Los datos viven en `data/` dentro del paquete y se publican en `data/` del vendor. */
const resolveSource = (file) => (DATA_FILES.includes(file) ? path.join("data", file) : file);

const ALL_FILES = [...SCRIPT_FILES, ...DATA_FILES];

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

if (!(await exists(sourceDir))) {
  console.error("[vendor] No existe node_modules/d3-celestial. Ejecuta `npm install` y vuelve a intentarlo.");
  process.exit(1);
}

const missing = [];
for (const file of ALL_FILES) {
  if (!(await exists(path.join(sourceDir, resolveSource(file))))) missing.push(file);
}

if (missing.length > 0) {
  console.error("[vendor] El paquete d3-celestial no contiene los archivos requeridos:");
  for (const file of missing) console.error(`  - ${file}`);
  process.exit(1);
}

const d3CelestialPkg = JSON.parse(await readFile(path.join(sourceDir, "package.json"), "utf8"));

await mkdir(targetDir, { recursive: true });
for (const file of ALL_FILES) {
  const target = path.join(targetDir, resolveSource(file));
  await mkdir(path.dirname(target), { recursive: true });
  await copyFile(path.join(sourceDir, resolveSource(file)), target);
}

// El LICENSE viaja con los ficheros redistribuidos.
if (await exists(path.join(sourceDir, "LICENSE"))) {
  await copyFile(path.join(sourceDir, "LICENSE"), path.join(targetDir, "LICENSE"));
}

const manifest = {
  library: `d3-celestial@${d3CelestialPkg.version}`,
  generatedAt: new Date().toISOString(),
  files: ALL_FILES,
};
await writeFile(path.join(targetDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");

console.log(`[vendor] ${ALL_FILES.length} archivos de d3-celestial copiados a public/vendor/celestial`);
