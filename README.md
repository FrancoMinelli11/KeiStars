# keiStars

Generador de **pósters conmemorativos de mapa estelar**: elige una fecha, una hora y un lugar,
y obtén un cartel (vista previa + PNG en alta resolución) con el firmamento tal y como se vio
—o se verá— desde ese punto del planeta.

Todo el cálculo astronómico y el render ocurre **en tu navegador**; no hay backend.

---

## Stack

| Capa     | Tecnología |
| -------- | ---------- |
| UI       | React 19 + TypeScript (estricto) |
| Build    | Vite 8 |
| Estilos  | Tailwind CSS 4 (`@tailwindcss/vite`) |
| Motor    | [`d3-celestial`](https://github.com/ofrohn/d3-celestial) 0.7 (cargado fuera del bundler) |
| Geocoder | Nominatim (OpenStreetMap) con respaldo en Photon |

## Requisitos

- Node.js ≥ 20 (probado con 24)
- npm ≥ 10

## Puesta en marcha

```bash
npm install     # instala dependencias
npm run dev     # predev copia los assets de d3-celestial y arranca Vite
```

Abre <http://localhost:5173>.

## Scripts

| Comando              | Qué hace                                                                  |
| -------------------- | ------------------------------------------------------------------------- |
| `npm run dev`        | Copia `public/vendor/celestial` (`predev`) y arranca el servidor de Vite   |
| `npm run build`      | Copia vendor, `tsc --noEmit` y `vite build` → `dist/`                      |
| `npm run preview`    | Sirve el build de producción                                              |
| `npm run vendor`     | Regenera solo la carpeta vendor de d3-celestial                           |
| `npm run typecheck`  | Comprobación de tipos sin emitir                                          |

---

## Arquitectura

### 1. d3-celestial vive fuera del bundler

`celestial.min.js` es un IIFE clásico que termina en `this.Celestial = …` y usa la variable
global `d3` **en el momento de evaluación**. Importarlo desde un módulo ESM (Vite) rompe ambos
supuestos (`this === undefined` en módulos ecológicos ESM, `d3` sin declarar), así que la app
inyecta tres `<script>` clásicos en orden —y con *fallback* a jsDelivr si fallan:

1. `lib/d3.min.js` (d3 v3)
2. `lib/d3.geo.projection.min.js`
3. `celestial.min.js`

→ `src/lib/celestialLoader.ts`

### 2. `datapath` local sin 404

`scripts/copy-vendor.mjs` copia a `public/vendor/celestial` la whitelist exacta de ficheros que
la librería descarga de forma incondicional en `load()` (`mw.json`, `constellations.*`,
`stars.6.json`, `starnames.json`, `dsos.bright.json`, `dsonames.json`, `planets.json`) y escribe
un `manifest.json` con el listado. El cargador valida ese manifiesto antes de declarar el origen
local disponible; si falta algo, usa el CDN.

### 3. Ciclo de vida del mapa

Una **única instancia** de d3-celestial se monta en un *slot* oculto:

| Momento                          | Llamada                                                        |
| -------------------------------- | -------------------------------------------------------------- |
| Montaje / cambio de proyección   | `Celestial.display(config)` tras `destroyCelestial()`           |
| Cambio de tema o de *toggles*     | `Celestial.apply(estilo)` (repinta sin recargar los GeoJSON)    |
| Cambio de fecha, hora o lugar     | `Celestial.skyview({ date, location, timezone })` con debounce  |
| Desmontaje (incluye StrictMode)  | `destroyCelestial()` limpia canvas, `#celestial-form`, `#error` y listeners |

Orientación cenital: `follow: "zenith"` + `transform: "equatorial"` + `disableAnimations` (giros
síncronos, indispensables para exportar sin esperar transiciones) y `settimezone: false` (nunca
consulta TimeZoneDB: el desfase UTC lo aporta el usuario, con estimación por longitud).

→ `src/lib/celestialMap.ts`, `src/hooks/useCelestialMap.ts`

### 4. Exportación nítida y sin *tainted canvas*

El mapa se dibuja en su propio `<canvas>` (tamaño calculado para que su círculo del horizonte
mida exactamente el círculo del póster exportado). La vista previa y el PNG se componen con la
**misma función** (`renderPoster`), así que lo que ves es lo que descargas:

- Vista previa: `1200 × 1600`
- Exportación: `2400 × 3200` (2×) vía `canvas.toBlob("image/png")` → descarga

No se pintan imágenes *cross-origin*, así que el lienzo nunca queda contaminado. Se espera a
`document.fonts.ready` para que las tipografías sean idénticas en pantalla y en el PNG.

→ `src/lib/posterLayout.ts`, `src/lib/posterRender.ts`, `src/lib/exportPoster.ts`

### 5. Datos desacoplados del motor

El estado del póster (fecha, hora, desfase UTC, coordenadas, textos) vive en
`src/state/poster.ts`. Escribir en los campos **no** redibuja el cielo en cada tecla: el
desencadenante astronómico (`dateStr|timeStr|offset|lat|lon`) está normalizado y con *debounce*
de 400 ms.

### 6. Búsqueda de lugares

- `Nominatim` (OpenStreetMap) como proveedor principal, con **Photon** como respaldo automático.
- *Debounce* de 450 ms, mínimo de 3 caracteres, `AbortController`, *timeout* de 12 s y caché en
  memoria de las últimas 20 consultas, para respetar la política de uso de ambos servicios.

→ `src/lib/nominatim.ts`, `src/hooks/useCitySearch.ts`

---

## Estructura

```
scripts/copy-vendor.mjs      # copia d3-celestial + manifiesto a public/vendor
public/vendor/celestial/     # generado: scripts UMD + GeoJSON (no editar a mano)
src/
  components/                # panel de control, secciones, escenario del póster, UI
  hooks/                     # useCelestialMap, useCitySearch, useDebouncedValue
  lib/                       # loader, config, ciclo de vida, tiempo, coordenadas,
                             # geocoder, layout/render/export del póster, tipos
  state/poster.ts            # estado + acciones del formulario
  App.tsx  main.tsx  index.css
```

## Consideraciones

- **Sin API keys**: se usan APIs públicas con límites de uso. Si tu despliegue recibe tráfico
  real, apunta `Nominatim` a tu propia instancia o formaliza un acuerdo de uso.
- **Privacidad**: las coordenadas y la fecha nunca salen de tu equipo; solo la búsqueda de
  ciudades consulta un servicio externo.
- **Tipografías**: Cormorant Garamond e Inter se cargan desde Google Fonts; si no hay red, el
  póster usa las fuentes del sistema sin romper la exportación.
