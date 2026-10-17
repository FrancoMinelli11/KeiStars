import type { CelestialConfig, CelestialLineConfig } from "./celestialTypes";
import type { SkyFlags } from "../state/poster";

export type ProjectionKey = "stereographic" | "azimuthalEquidistant";
export type PosterThemeId = "midnight" | "monochrome" | "parchment" | "obsidian";

/** Plantilla por defecto: la más versátil para regalos conmemorativos. */
export const DEFAULT_THEME_ID: PosterThemeId = "midnight";

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

/** Fuente con la que se pinta un bloque de texto (canvas y exportación). */
export interface PosterThemeFont {
  family: string;
  weight: number;
  italic?: boolean;
  /** Kerning en px de diseño (0 = sin espaciado adicional). */
  tracking?: number;
}

export interface PosterThemeFonts {
  title: PosterThemeFont;
  subtitle: PosterThemeFont;
  meta: PosterThemeFont;
}

export interface PosterTheme {
  id: PosterThemeId;
  label: string;
  hint: string;
  /** Descriptor corto del papel/acabado, para el selector de plantillas. */
  paperLabel: string;
  poster: {
    bg: string;
    text: string;
    muted: string;
    accent: string;
    frame: string;
    ring: string;
    /** Grosor del aro en px de diseño (por defecto 2,5). */
    ringWidth: number;
    /** Opacidad del aro (por defecto 1). */
    ringAlpha: number;
    /** Segundo aro concéntrico: separación en fracción del radio (0 = desactivado). */
    ringInnerGap: number;
  };
  sky: {
    /** Puede coincidir con `poster.bg` (cielo fundido) o distinguirse (disco). */
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
  /** Tipografía del póster: se usa en pantalla y en la exportación PNG/PDF. */
  fonts: PosterThemeFonts;
}

export const THEMES: Record<PosterThemeId, PosterTheme> = {
  midnight: {
    id: "midnight",
    label: "Midnight Blue",
    hint: "Clásico conmemorativo: cielo azul noche, estrellas blancas y detalles en azul hielo.",
    paperLabel: "Papel azul noche",
    poster: {
      bg: "#0b132b",
      text: "#eaf2ff",
      muted: "#8ea3c9",
      accent: "#48e5c2",
      frame: "#48e5c2",
      ring: "#48e5c2",
      ringWidth: 2.2,
      ringAlpha: 0.75,
      ringInnerGap: 0,
    },
    sky: {
      bg: "#1c2541",
      star: "#ffffff",
      starColors: true,
      constellationLine: "#6fffe9",
      constellationLineOpacity: 0.45,
      constellationName: "#6fffe9",
      graticule: "#2a3a63",
      graticuleOpacity: 0.9,
      milkyWay: "#8fb7e8",
      milkyWayOpacity: 0.12,
    },
    fonts: {
      title: { family: "Cinzel", weight: 600, tracking: 4 },
      subtitle: { family: "Playfair Display", weight: 500, italic: true },
      meta: { family: "Inter", weight: 500, tracking: 5.5 },
    },
  },
  monochrome: {
    id: "monochrome",
    label: "Minimal Monochrome",
    hint: "Estilo nórdico de galería: papel blanco, tinta negra de trazo fino y tipografía limpia.",
    paperLabel: "Blanco roto",
    poster: {
      bg: "#f8fafc",
      text: "#0f172a",
      muted: "#64748b",
      accent: "#94a3b8",
      frame: "#0f172a",
      ring: "#0f172a",
      ringWidth: 1.2,
      ringAlpha: 1,
      ringInnerGap: 0,
    },
    sky: {
      bg: "#ffffff",
      star: "#0f172a",
      starColors: false,
      constellationLine: "#0f172a",
      constellationLineOpacity: 0.5,
      constellationName: "#334155",
      graticule: "#e2e8f0",
      graticuleOpacity: 1,
      milkyWay: "#0f172a",
      milkyWayOpacity: 0.05,
    },
    fonts: {
      title: { family: "Inter", weight: 500, tracking: 10 },
      subtitle: { family: "Inter", weight: 400, italic: true },
      meta: { family: "Space Mono", weight: 400, tracking: 4.5 },
    },
  },
  parchment: {
    id: "parchment",
    label: "Vintage Parchment",
    hint: "Carta náutica antigua: pergamino cálido, tinta desvaída y doble aro de bronce.",
    paperLabel: "Pergamino",
    poster: {
      bg: "#f4ebd0",
      text: "#2c2416",
      muted: "#7a6a52",
      accent: "#b38b59",
      frame: "#b38b59",
      ring: "#b38b59",
      ringWidth: 1.8,
      ringAlpha: 1,
      ringInnerGap: 0.016,
    },
    sky: {
      bg: "#ebdcb9",
      star: "#2c2416",
      starColors: false,
      constellationLine: "#4a3728",
      constellationLineOpacity: 0.6,
      constellationName: "#6b5a44",
      graticule: "#d8c9a3",
      graticuleOpacity: 1,
      milkyWay: "#4a3728",
      milkyWayOpacity: 0.08,
    },
    fonts: {
      title: { family: "Merriweather", weight: 700 },
      subtitle: { family: "Merriweather", weight: 400, italic: true },
      meta: { family: "Courier Prime", weight: 400, tracking: 4 },
    },
  },
  obsidian: {
    id: "obsidian",
    label: "Obsidian & Gold",
    hint: "Premium: negro carbón mate, estrellas doradas y versalitas con kerning amplio.",
    paperLabel: "Negro carbón",
    poster: {
      bg: "#09090b",
      text: "#f5edd8",
      muted: "#a89a72",
      accent: "#e5c07b",
      frame: "#d4af37",
      ring: "#d4af37",
      ringWidth: 2,
      ringAlpha: 0.9,
      ringInnerGap: 0.012,
    },
    sky: {
      bg: "#121214",
      star: "#e5c07b",
      starColors: false,
      constellationLine: "#d4af37",
      constellationLineOpacity: 0.45,
      constellationName: "#d4af37",
      graticule: "#26262b",
      graticuleOpacity: 1,
      milkyWay: "#d4af37",
      milkyWayOpacity: 0.07,
    },
    fonts: {
      title: { family: "Cinzel", weight: 700, tracking: 8 },
      subtitle: { family: "Playfair Display", weight: 500, italic: true },
      meta: { family: "Inter", weight: 500, tracking: 6 },
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
