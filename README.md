# keiStars

Generador de **pósters conmemorativos de mapa estelar**: elige una fecha, una hora y un
lugar, y obtén un cartel —vista previa, PNG o **PDF listo para imprenta** (21×30, 30×40,
40×50 y 50×70 cm a 300 DPI)— con el firmamento tal y como se vio —o se verá— desde ese
punto del planeta.

Todo el cálculo astronómico y el render ocurre **en tu navegador**; no hay backend.

---

## Qué incluye

- **Cielo fiel a la hora local del lugar**: zona horaria IANA real (`tz-lookup` + `Intl`),
  con horario de verano resuelto por hora de pared. Coincide con la zona política
  (p. ej. Mendoza es UTC−03:00, no la estimación solar UTC−05:00).
- **Cuatro plantillas** (Midnight Blue, Minimal Monochrome, Vintage Parchment,
  Obsidian & Gold) y **personalización de los 12 colores** del papel y del cielo, con
  fusión sobre el preset activo y aviso de contraste bajo.
- **PDF de imprenta**: tamaño exacto, 300 DPI, sangrado opcional de 3 mm, marcas de
  corte y metadatos del documento.
- **PNG** de 2400 × 3200 px para uso digital.
- **Autoguardado** del diseño y **enlace compartible** (`#p=` con el estado codificado;
  no viaja a ningún servidor).
- **Tipografías autoalojadas** (`@fontsource`): sin peticiones a Google Fonts, con
  fallback por categoría tipográfica y carga explícita antes de exportar.
- **Accesibilidad**: grupos de opciones con teclado (roving tabindex), regiones
  `aria-live`, foco visible, resumen textual del póster y vista ampliada.
- **Búsqueda de lugares** con Nominatim y respaldo en Photon, con throttle de ~1 req/s,
  caché y atribución de OpenStreetMap.
- **Tests** (Vitest) y **CI** (typecheck + lint + tests + build).

## Stack

| Capa     | Tecnología                                                                       |
| -------- | -------------------------------------------------------------------------------- |
| UI       | React 19 + TypeScript 7 (estricto)                                               |
| Build    | Vite 8                                                                           |
| Estilos  | Tailwind CSS 4 (`@tailwindcss/vite`)                                             |
| Motor    | [`d3-celestial`](https://github.com/ofrohn/d3-celestial) 0.7 (fuera del bundler) |
| PDF      | `jsPDF` (import dinámico: solo se descarga al exportar)                          |
| Zonas    | `tz-lookup` + `Intl.DateTimeFormat`                                              |
| Fuentes  | Fontsource (autoalojadas, subset latino)                                         |
| Geocoder | Nominatim (OpenStreetMap) con respaldo en Photon                                 |
| Calidad  | Vitest, ESLint (flat), Prettier, GitHub Actions                                  |

## Requisitos

- Node.js ≥ 22.12 (probado con 24; Vitest 5 no soporta Node 20)
- npm ≥ 10

## Puesta en marcha

```bash
npm install     # instala dependencias
npm run dev     # predev copia los assets de d3-celestial y arranca Vite
```

Abre <http://localhost:5173/KeiStars/> (el `base` de Vite es `/KeiStars/`).

## Scripts

| Script                 | Qué hace                                                 |
| ---------------------- | -------------------------------------------------------- |
| `npm run dev`          | Copia el vendor de d3-celestial y arranca Vite           |
| `npm run build`        | Typecheck + build de producción en `dist/`               |
| `npm run preview`      | Sirve el build de producción                             |
| `npm run typecheck`    | Solo comprobación de tipos (`tsc --noEmit`)              |
| `npm run test`         | Tests unitarios (Vitest)                                 |
| `npm run test:watch`   | Tests en modo watch                                      |
| `npm run coverage`     | Cobertura V8 (texto + HTML)                              |
| `npm run lint`         | ESLint (TypeScript, hooks y fast refresh)                |
| `npm run format`       | Prettier sobre `src/**` y documentación                  |
| `npm run format:check` | Comprueba formato sin escribir                           |
| `npm run vendor`       | Copia scripts y datos de d3-celestial a `public/vendor/` |

> TypeScript 7 no expone todavía la API de compilador que usa `typescript-eslint`.
> Siguiendo la recomendación oficial, `package.json` instala TS 7 como
> `@typescript/native` (binario `tsc`) y TS 6 como `typescript` (API para ESLint).

## Arquitectura

```
src/
├─ lib/
│  ├─ celestialConfig.ts   # agregador: proyecciones, geometría, estilo y config de d3
│  ├─ themes.ts            # presets, tipografías, overrides de color y resolveTheme()
│  ├─ fonts.ts             # fontSpec/fontStack/ensurePosterFonts
│  ├─ timezone.ts          # zona IANA + desfase UTC por hora de pared (DST)
│  ├─ time.ts              # fecha/hora de pared, formato es-ES, offset solar
│  ├─ storage.ts           # localStorage + enlace compartible base64url
│  ├─ canvasLimits.ts      # límites de lienzo por dispositivo (móviles)
│  ├─ posterSizes.ts       # formatos de imprenta cm ↔ mm ↔ px
│  ├─ posterLayout.ts      # geometría del póster a partir del ancho
│  ├─ posterRender.ts      # composición en canvas (vista previa y exportación)
│  ├─ exportPoster.ts      # PNG 2400×3200 (toBlob, liberación de canvas)
│  ├─ exportPosterPdf.ts   # PDF 300 DPI, sangrado, marcas de corte y metadatos
│  ├─ celestialMap.ts      # init/apply/resize/skyview y withCelestialResolution
│  ├─ celestialLoader.ts   # carga de los scripts UMD fuera del bundler
│  └─ nominatim.ts         # Nominatim + Photon con throttle y caché
├─ state/poster.ts         # estado y acciones (lugar, tiempo, tema, textos, tamaño)
├─ hooks/                  # useCelestialMap, useThemeFonts, useCitySearch, …
└─ components/             # panel de control, escenario, tamaño, colores, modal…
```

### El motor vive fuera del bundler

`celestial.min.js` es un IIFE clásico que asigna `this.Celestial` y usa la global `d3`
en tiempo de evaluación; empaquetarlo rompe ambos supuestos. Por eso:

1. `scripts/copy-vendor.mjs` copia los scripts UMD y los datos astronómicos de
   `node_modules/d3-celestial` a `public/vendor/celestial` (con su LICENSE).
2. `celestialLoader.ts` los inyecta en orden (`d3` → proyecciones → d3-celestial) con
   timeout de 15 s y fallback a CDN.

Hay **una sola instancia** del motor: su canvas vive en un slot oculto y el póster se
compone con `drawImage` sobre un canvas de composición. La vista previa y la
exportación usan exactamente la misma función `renderPoster()`.

### Zona horaria

`resolveTimeZone(lat, lon)` obtiene la zona IANA; `getUtcOffsetMinutesForWallTime()`
itera `Intl.DateTimeFormat` dos veces hasta converger en el desfase válido para la hora
de pared (resolviendo DST). El desfase manual del usuario (`offsetTouched`) siempre
manda y «Estimar» lo devuelve al automático.

### Composición y exportación

- `computeMapGeometry()` renderiza el cielo a la resolución exacta del círculo del
  póster (300 DPI); `withCelestialResolution()` aplica estilos, redimensiona el motor
  y **restaura el preview en `finally`** aunque falle la captura.
- PNG: `toBlob` (menos bloqueo que `toDataURL`), liberación del canvas al terminar y
  nombre con la fecha.
- PDF: se compone el contenido a tamaño de corte sobre una hoja ampliada con sangrado
  opcional, se dibujan las marcas de corte y se embebe como JPEG q0.95. Metadatos de
  título/autor/creador y fecha en el nombre del archivo.
- En móviles, `checkCanvasCapacity()` bloquea formatos que superarían el área máxima
  de canvas antes de reservar memoria y explica cómo continuar.

## Personalización de colores

En **El estilo → Colores personalizados** pueden ajustarse los colores del papel
(fondo, titular, texto secundario, acento, marco y aro) y del cielo (fondo, estrellas,
líneas, nombres, retícula y Vía Láctea). Los retoques se fusionan sobre el preset con
`resolveTheme()` sin mutar la plantilla:

- editar un color activa el estado «Personalizado»;
- cada campo tiene un ↺ para volver al valor del preset;
- **cambiar de plantilla reinicia los retoques** (el preset fija la estética base);
- los colores viajan al motor (`Celestial.apply`) y a la exportación con el mismo objeto;
- si el contraste titular/papel o estrella/cielo es bajo, se avisa (el póster se genera
  igual).

## Persistencia y enlace compartible

- `savePoster()` guarda el estado completo (v2) en `localStorage` en cada cambio.
- `loadInitialPoster()` prioriza `#p=<base64url>` del enlace, luego el borrador guardado
  y por último el diseño por defecto.
- **Compartir diseño** copia un enlace que abre la app con el póster ya montado. El
  payload es UTF-8 seguro (títulos con tildes o emoji incluidos) y se descarta si no
  valida el esquema.

## Geocodificación

- Nominatim como primera opción; si falla, Photon (OSM, sin API key).
- Debounce de 450 ms, mínimo 3 caracteres, caché insensible a mayúsculas y cola de
  peticiones con máximo ~1 req/s (política de uso de Nominatim).
- Endpoints configurables por entorno:

  ```bash
  VITE_NOMINATIM_URL=https://nominatim.tudominio.org/search
  VITE_PHOTON_URL=https://photon.komoot.io/api/
  ```

- Atribución visible en la interfaz: © OpenStreetMap contributors.

## Tipografías autoalojadas

| Familia            | Uso                           | Pesos                |
| ------------------ | ----------------------------- | -------------------- |
| Cinzel             | Titulares (Midnight/Obsidian) | 600, 700             |
| Playfair Display   | Subtítulos                    | 500, 500 italic      |
| Inter              | UI, etiquetas, metas          | 400, 500, 600        |
| Space Mono         | Meta (Monochrome)             | 400                  |
| Merriweather       | Título/subtítulo (Parchment)  | 400, 700, 400 italic |
| Courier Prime      | Meta (Parchment)              | 400                  |
| Cormorant Garamond | Títulos de la UI              | 600                  |

Solo se carga el subset latino. `ensurePosterFonts()` espera a las familias del tema
activo (`Promise.allSettled` + `document.fonts.ready`) antes de rasterizar; si una
fuente falla se usa el fallback de su categoría (`serif`/`sans`/`mono`) sin abortar.

## Tests y CI

```bash
npm run test       # 60 tests: tiempo, coordenadas, formatos, layout, temas, TZ, storage
npm run typecheck
npm run lint
npm run format:check
npm run build
```

CI (`.github/workflows/ci.yml`) ejecuta lo anterior en cada push a `main` y en cada PR,
con la versión de Node fijada en `.nvmrc`.

## Despliegue

El sitio es estático: `npm run build` deja `dist/` listo para GitHub Pages, Netlify,
Vercel o cualquier CDN. El `base` de Vite es `/KeiStars/`; si se publica en la raíz,
cambia `base` en `vite.config.ts`. Para geocodificar con más tráfico, apunta las
variables `VITE_NOMINATIM_URL`/`VITE_PHOTON_URL` a una instancia propia o a un proxy.

## Limitaciones conocidas

- **La vista previa y el PNG mantienen la proporción 3:4 de diseño** (1200×1600 y
  2400×3200), con independencia del formato de imprenta elegido. El PDF sí usa la
  proporción real del papel. Es una decisión de producto, no un bug de render.
- En formato 50×70 a DPR 1, `computeMapGeometry()` topa el canvas del motor en 4096 px;
  el cielo se reescala ~4 % en la composición final (imperceptible a 300 DPI, pero
  documentado).
- El PDF embebe una imagen JPEG: no hay texto vectorial ni seleccionable.
- jsPDF no soporta CMYK: el PDF es RGB. Si la imprenta lo exige, debe convertirlo.
- En iOS/Android los formatos por encima del área límite de canvas se bloquean con un
  mensaje; usa un ordenador para 50×70.
- La búsqueda depende de servicios públicos con límites de uso.

## Licencia

MIT (ver `LICENSE`). Datos astronómicos, d3-celestial, jsPDF y tipografías conservan sus
licencias originales; ver `THIRD_PARTY_NOTICES.md`.
