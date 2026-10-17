import type { CelestialConfig, CelestialLineConfig } from "./celestialTypes";
import type { SkyFlags } from "../state/poster";

export type ProjectionKey = "stereographic" | "azimuthalEquidistant";
export type PosterThemeId = "night" | "minimal";

export interface ProjectionInfo {
  /** Valor que espera `config.projection` (clave de la tabla interna). */
  id: string;
  label: string;
  hint: string;
  /**
   * Radio del círculo del horizonte por px de ancho de lienzo (= r90 / 1024).
   * Derivado de la tabla "scale normalizada a 1024 px" de d3-celestial y
   * medido con d3 v3:
   *  - stereographic      → r90 = scale = 500      → 500 / 1024
   *  - azimuthalEquidistant → r90 = scale · π/2    → 320 · π/2 / 1024
   * Ambas proyecciones son cenitales (clipAngle 90) con ratio 1 (lienzo cuadrado).
   */
  radiusRatio: number;
}

export const PROJECTIONS: Record<ProjectionKey, ProjectionInfo> = {
  stereographic: {
    id: "stereographic",
    label: "Estereográfica",
    hint: "Vista hemisférica desde el cenit. Recomendada: el círculo llena el marco.",
    radiusRatio: 500 / 1024,
  },
  azimuthalEquidistant: {
    id: "azimuthalEquidistant",
    label: "Equidistante azimutal",
    hint: "Distancias reales desde el cenit; deforma menos el horizonte bajo.",
    radiusRatio: (320 * (Math.PI / 2)) / 1024,
  },
};

export const PROJECTION_KEYS = Object.keys(PROJECTIONS) as ProjectionKey[];

export interface PosterTheme {
  id: PosterThemeId;
  label: string;
  hint: string;
  poster: {
    bg: string;
    text: string;
    muted: string;
    accent: string;
    frame: string;
    ring: string;
  };
  sky: {
    /** Debe coincidir con `poster.bg` para que el círculo se funda con el papel. */
    bg: string;
    star: string;
    starColors: boolean;
    constellationLine: string;
    constellationLineOpacity: number;
    constellationName: string;
    graticule: string;
    graticuleOpacity: number;
    milkyWay: string;
    milkyWayOpacity: number;
  };
}

export const THEMES: Record<PosterThemeId, PosterTheme> = {
  night: {
    id: "night",
    label: "Modo noche",
    hint: "Fondo azul noche, estrellas en color espectral y detalles en dorado.",
    poster: {
      bg: "#0a0f1f",
      text: "#f3efe4",
      muted: "#9aa4bd",
      accent: "#e8c478",
      frame: "#e8c478",
      ring: "#e8c478",
    },
    sky: {
      bg: "#0a0f1f",
      star: "#ffffff",
      starColors: true,
      constellationLine: "#8fa0c4",
      constellationLineOpacity: 0.5,
      constellationName: "#e8c478",
      graticule: "#27314f",
      graticuleOpacity: 0.9,
      milkyWay: "#93a7da",
      milkyWayOpacity: 0.15,
    },
  },
  minimal: {
    id: "minimal",
    label: "Minimalista / impreso",
    hint: "Papel blanco, estrellas y líneas en tinta oscura: pensado para imprimir.",
    poster: {
      bg: "#ffffff",
      text: "#141414",
      muted: "#6b7080",
      accent: "#8b8b8b",
      frame: "#141414",
      ring: "#141414",
    },
    sky: {
      bg: "#ffffff",
      star: "#101010",
      starColors: false,
      constellationLine: "#4a4f5c",
      constellationLineOpacity: 0.7,
      constellationName: "#6b7080",
      graticule: "#d5d9e2",
      graticuleOpacity: 1,
      milkyWay: "#101010",
      milkyWayOpacity: 0.07,
    },
  },
};

export const THEME_IDS = Object.keys(THEMES) as PosterThemeId[];

/** Lienzo de exportación (2× de la vista previa). */
export const EXPORT_WIDTH = 2400;
export const PREVIEW_WIDTH = 1200;

export interface MapGeometry {
  /** Ancho CSS del lienzo de d3-celestial. */
  widthCss: number;
  /** Radio del círculo celeste / ancho CSS (= radio en píxeles del dispositivo). */
  radiusRatio: number;
  /** Factor por el que se escalan todos los tamaños en px de la config. */
  sizeFactor: number;
  devicePixelRatio: number;
}

/**
 * Calcula el tamaño del mapa de modo que su círculo del horizonte coincida
 * exactamente con el círculo del póster exportado (2400 px).
 *
 * El resultado en píxeles de dispositivo (`widthCss · dpr`) es independiente de
 * la DPR, y como todos los estilos se escalan con `widthCss / 1024`, la
 * apariencia final del cielo es idéntica en pantallas retina y no retina.
 */
export function computeMapGeometry(projection: ProjectionKey, targetCircleDiameter: number): MapGeometry {
  const dpr = Math.max(1, typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1);
  const { radiusRatio } = PROJECTIONS[projection];
  const widthCss = Math.min(4096, Math.max(512, Math.ceil(targetCircleDiameter / (2 * radiusRatio * dpr))));
  return { widthCss, radiusRatio, sizeFactor: widthCss / 1024, devicePixelRatio: dpr };
}

export interface CelestialStyleInput {
  geometry: MapGeometry;
  theme: PosterTheme;
  flags: SkyFlags;
}

const MAP_FONT_SANS = (size: number) =>
  `${size}px "Inter", "Helvetica Neue", Helvetica, Arial, sans-serif`;

/**
 * Bloque de estilo compartido entre `display()` (config completa) y
 * `Celestial.apply()` (cambios de tema/visibilidad sin recargar datos).
 */
export function buildCelestialStyle(input: CelestialStyleInput): Partial<CelestialConfig> {
  const { geometry, theme, flags } = input;
  const s = geometry.sizeFactor;
  const sky = theme.sky;

  const graticule: CelestialLineConfig = {
    show: flags.grid,
    stroke: sky.graticule,
    width: 0.6 * s,
    opacity: sky.graticuleOpacity,
    lon: { pos: [""], fill: sky.graticule, font: MAP_FONT_SANS(10 * s) },
    lat: { pos: [""], fill: sky.graticule, font: MAP_FONT_SANS(10 * s) },
  };

  return {
    stars: {
      show: true,
      limit: 6,
      colors: sky.starColors,
      style: { fill: sky.star, opacity: 1 },
      size: 7 * s,
      exponent: -0.28,
      designation: false,
      propername: false,
      data: "stars.6.json",
    },
    dsos: { show: false, style: { fill: sky.star, opacity: 1 }, data: "dsos.bright.json", size: null },
    constellations: {
      names: flags.names,
      nameStyle: {
        fill: sky.constellationName,
        align: "center",
        baseline: "middle",
        font: [MAP_FONT_SANS(14 * s), MAP_FONT_SANS(12 * s), MAP_FONT_SANS(11 * s)],
        opacity: 1,
      },
      lines: flags.lines,
      lineStyle: {
        stroke: sky.constellationLine,
        width: 1 * s,
        opacity: sky.constellationLineOpacity,
      },
      bounds: false,
      boundStyle: { stroke: sky.graticule, width: 0.5 * s, opacity: 0.6, dash: [2 * s, 4 * s] },
    },
    mw: {
      show: flags.milkyway,
      style: { fill: sky.milkyWay, opacity: sky.milkyWayOpacity },
    },
    lines: {
      graticule,
      equatorial: { show: false, stroke: sky.graticule, width: 1 * s, opacity: 0.6 },
      ecliptic: { show: false, stroke: sky.graticule, width: 1 * s, opacity: 0.6 },
      galactic: { show: false, stroke: sky.graticule, width: 1 * s, opacity: 0.6 },
      supergalactic: { show: false, stroke: sky.graticule, width: 1 * s, opacity: 0.6 },
    },
    background: { fill: sky.bg, opacity: 1, stroke: sky.bg, width: 0 },
    horizon: { show: false },
    daylight: { show: false },
    planets: { show: false },
  };
}

export interface CelestialConfigInput extends CelestialStyleInput {
  hostId: string;
  datapath: string;
  projection: ProjectionKey;
  latitude: number;
  longitude: number;
}

/**
 * Config completa para `Celestial.display()`.
 *
 * Decisiones clave:
 * - `follow: "zenith"` + `geopos`: la orientación la resuelve la librería
 *   (tiempo sideral local) a partir de `Celestial.skyview()`.
 * - `disableAnimations`: los giros son síncronos, indispensable para exportar
 *   sin esperar transiciones de d3.
 * - `settimezone: false`: nunca consulta TimeZoneDB; el desfase UTC lo aporta
 *   el usuario, de forma determinista.
 * - `interactive/form/controls: false`: el mapa es un artefacto de render, no
 *   un widget manipulable (el formulario interno igual se crea oculto porque
 *   la API `skyview()` escribe sobre esos campos).
 */
export function buildCelestialConfig(input: CelestialConfigInput): CelestialConfig {
  const style = buildCelestialStyle(input);
  const { geometry, projection, hostId, datapath, latitude, longitude } = input;

  return {
    width: geometry.widthCss,
    container: hostId,
    datapath,
    projection: PROJECTIONS[projection].id,
    transform: "equatorial",
    follow: "zenith",
    geopos: [latitude, longitude],
    orientationfixed: true,
    interactive: false,
    controls: false,
    form: false,
    location: false,
    formFields: {
      location: false,
      general: false,
      stars: false,
      dsos: false,
      constellations: false,
      lines: false,
      other: false,
      download: false,
    },
    advanced: false,
    disableAnimations: true,
    settimezone: false,
    adaptable: false,
    zoomlevel: null,
    ...style,
  } as CelestialConfig;
}
