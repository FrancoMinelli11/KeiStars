# Créditos de terceros

KeiStars no genera datos astronómicos ni tipografías propias: gracias a las
siguientes obras de terceros, que conservan su licencia original. Si
distribuyes una copia del sitio (`dist/`), incluye este archivo sin recortes.

## d3-celestial

- Autor: Olaf Frohn (https://github.com/ofrohn/d3-celestial)
- Licencia: BSD-3-Clause
- Los datos astronómicos incluidos (`mw.json`, `constellations*`, `stars.6.json`,
  `starnames.json`, `dsos.bright.json`, `dsonames.json`, `planets.json`)
  proceden de Stellarium / IAU a través del propio paquete; revisa su repositorio
  para las notas de atribución de cada dataset.
- Se distribuye como ficheros UMD en `public/vendor/celestial` (no se recompila).

## d3 v3 y d3.geo.projection

- Licencia: BSD-3-Clause
- Empaquetados dentro de `public/vendor/celestial/lib/`.

## jsPDF

- Licencia: MIT
- Se bundla (chunk dinámico) y solo se descarga cuando el usuario exporta el PDF.

## tz-lookup

- Autor: The Dark Sky Company
- Licencia: CC0 1.0 Universal
- Se bundla para resolver la zona horaria IANA a partir de latitud/longitud.

## Tipografías (Fontsource / Google Fonts)

| Familia            | Licencia                        |
| ------------------ | ------------------------------- |
| Cinzel             | SIL Open Font License 1.1 (OFL) |
| Playfair Display   | SIL Open Font License 1.1 (OFL) |
| Cormorant Garamond | SIL Open Font License 1.1 (OFL) |
| Inter              | SIL Open Font License 1.1 (OFL) |
| Space Mono         | SIL Open Font License 1.1 (OFL) |
| Merriweather       | SIL Open Font License 1.1 (OFL) |
| Courier Prime      | SIL Open Font License 1.1 (OFL) |

Se autoalojan como WOFF2 (`@fontsource/*`); el OFL permite redistribución con
estas mismas condiciones.

## Datos de mapas (geocodificación)

- Nominatim y Photon devuelven datos derivados de OpenStreetMap,
  ODbL 1.0: © OpenStreetMap contributors
  (https://www.openstreetmap.org/copyright).
