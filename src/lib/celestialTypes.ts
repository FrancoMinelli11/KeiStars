/**
 * Tipos propios del motor `d3-celestial` (la librería no publica .d.ts).
 * Solo se declara la superficie usada por la aplicación: nada de `any` suelto.
 */

export interface CelestialStyle {
  fill?: string;
  stroke?: string;
  width?: number;
  opacity?: number;
  font?: string | string[];
  align?: "left" | "center" | "right" | "start" | "end";
  baseline?: "alphabetic" | "top" | "hanging" | "middle" | "ideographic" | "bottom";
  dash?: number[];
}

/** Etiquetas de la cuadrícula (pos: cadena vacía = sin etiquetas). */
export interface CelestialGridLabels {
  pos: string[];
  fill?: string;
  font?: string;
}

export interface CelestialLineConfig extends CelestialStyle {
  show: boolean;
  lon?: CelestialGridLabels;
  lat?: CelestialGridLabels;
}

export interface CelestialFormFields {
  location: boolean;
  general: boolean;
  stars: boolean;
  dsos: boolean;
  constellations: boolean;
  lines: boolean;
  other: boolean;
  download: boolean;
}

/**
 * Subconjunto de la config de `Celestial.display()`. Los campos están
 * documentados en `node_modules/d3-celestial/readme.md`.
 */
export interface CelestialConfig {
  /** Ancho en px CSS del lienzo. La altura la fija la proyección (ratio 1). */
  width: number;
  container: string;
  /** Carpeta/URL con los GeoJSON. Debe terminar en "/". */
  datapath: string;
  projection: string;
  transform: "equatorial" | "ecliptic" | "galactic" | "supergalactic";
  /** "zenith" centra el mapa en el cenit del observador (geopos + fecha). */
  follow: "zenith" | "center";
  /** [latitud, longitud] en grados. */
  geopos: [number, number] | null;
  orientationfixed: boolean;
  interactive: boolean;
  controls: boolean;
  form: boolean;
  location: boolean;
  formFields: CelestialFormFields;
  advanced: boolean;
  disableAnimations: boolean;
  /** false: nunca llama a la API externa de TimeZoneDB. */
  settimezone: boolean;
  adaptable: boolean;
  zoomlevel: number | null;
  stars: {
    show: boolean;
    limit: number;
    colors: boolean;
    style: CelestialStyle;
    size: number;
    exponent: number;
    designation: boolean;
    propername: boolean;
    data: string;
  };
  dsos: { show: boolean; style: CelestialStyle; data: string; size: number | null };
  constellations: {
    names: boolean;
    nameStyle: CelestialStyle & { font: string[] };
    lines: boolean;
    /**
     * Escalares: la librería normaliza (`arrayfy`) los tres valores internamente
     * para elegir estilo según el brillo de cada constelación.
     */
    lineStyle: CelestialStyle;
    bounds: boolean;
    boundStyle: CelestialStyle;
  };
  mw: { show: boolean; style: CelestialStyle };
  lines: Record<string, CelestialLineConfig>;
  planets: { show: boolean };
  background: CelestialStyle;
  horizon: { show: boolean };
  daylight: { show: boolean };
}

export interface CelestialSkyviewParams {
  date?: Date;
  location?: [number, number];
  timezone?: number;
}

export interface CelestialApi {
  display(config: CelestialConfig): void;
  /** Aplica cambios de estilo/visibilidad sin volver a descargar los datos. */
  apply(config: Partial<CelestialConfig>): void;
  redraw(): void;
  skyview(params: CelestialSkyviewParams): unknown;
  date(date?: Date, timezone?: number): Date | undefined;
  location(location?: [number, number], timezone?: number): [number, number] | undefined;
  /** Se invoca tras cada repintado del mapa: ideal para sincronizar el póster. */
  addCallback(callback: (() => void) | null): void;
  clear(): void;
  container: unknown | null;
  data: unknown[];
}

/** Gestión mínima de eventos de d3 v3 para poder desmontarlos sin fugas. */
export interface D3EventHost {
  select(target: unknown): { on(type: string, listener: null): unknown };
}

declare global {
  interface Window {
    Celestial?: CelestialApi;
    d3?: D3EventHost;
  }
}

export {};
