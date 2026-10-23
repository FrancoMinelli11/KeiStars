/**
 * Plantillas (presets) del póster.
 *
 * Cada `PosterTheme` alimenta **a la vez** los colores de d3-celestial
 * (`buildCelestialStyle`) y los de la composición del lienzo
 * (`renderPoster`), de modo que la vista previa y la exportación comparten
 * exactamente la misma estética.
 *
 * Además de los presupuestos (`THEMES`), el usuario puede personalizar los
 * colores desde el panel: `resolveTheme(id, overrides)` devuelve el preset
 * fusionado con los retoques sin mutar el original.
 */

/** Categoría tipográfica para el fallback cuando la familia falle. */
export type FontCategory = "serif" | "sans" | "mono";

export type PosterThemeId = "midnight" | "monochrome" | "parchment" | "obsidian";

/** Plantilla por defecto: la más versátil para regalos conmemorativos. */
export const DEFAULT_THEME_ID: PosterThemeId = "midnight";

/** Fuente con la que se pinta un bloque de texto (canvas y exportación). */
export interface PosterThemeFont {
  family: string;
  weight: number;
  italic?: boolean;
  /** Kerning en px de diseño (0 = sin espaciado adicional). */
  tracking?: number;
  /**
   * Categoría tipográfica a la que pertenece la familia: define el fallback
   * del canvas (`fontSpec`) para que un fallo de carga no deforme la pieza
   * cruzando de serif a sans.
   */
  fallback: FontCategory;
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
      title: { family: "Cinzel", weight: 600, tracking: 4, fallback: "serif" },
      subtitle: { family: "Playfair Display", weight: 500, italic: true, fallback: "serif" },
      meta: { family: "Inter", weight: 500, tracking: 5.5, fallback: "sans" },
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
      title: { family: "Inter", weight: 500, tracking: 10, fallback: "sans" },
      subtitle: { family: "Inter", weight: 400, italic: true, fallback: "sans" },
      meta: { family: "Space Mono", weight: 400, tracking: 4.5, fallback: "mono" },
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
      title: { family: "Merriweather", weight: 700, fallback: "serif" },
      subtitle: { family: "Merriweather", weight: 400, italic: true, fallback: "serif" },
      meta: { family: "Courier Prime", weight: 400, tracking: 4, fallback: "mono" },
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
      title: { family: "Cinzel", weight: 700, tracking: 8, fallback: "serif" },
      subtitle: { family: "Playfair Display", weight: 500, italic: true, fallback: "serif" },
      meta: { family: "Inter", weight: 500, tracking: 6, fallback: "sans" },
    },
  },
};

export const THEME_IDS = Object.keys(THEMES) as PosterThemeId[];

/* ------------------------------------------------------------------ */
/* Personalización de colores                                          */
/* ------------------------------------------------------------------ */

/** Colores del papel y los textos que el usuario puede cambiar. */
export interface PosterColorPatch {
  bg?: string;
  text?: string;
  muted?: string;
  accent?: string;
  frame?: string;
  ring?: string;
}

/** Colores del cielo que el usuario puede cambiar. */
export interface SkyColorPatch {
  bg?: string;
  star?: string;
  constellationLine?: string;
  constellationName?: string;
  graticule?: string;
  milkyWay?: string;
}

/** Retoques sobre el preset activo (`null` = exactamente el preset). */
export interface ThemeOverrides {
  poster?: PosterColorPatch;
  sky?: SkyColorPatch;
}

/** ¿Hay al menos un color personalizado? */
export function hasColorOverrides(overrides: ThemeOverrides | null | undefined): boolean {
  if (!overrides) return false;
  return (
    Object.keys(overrides.poster ?? {}).length > 0 || Object.keys(overrides.sky ?? {}).length > 0
  );
}

/**
 * Aplica (o retira) un retoque de color. Si el valor coincide con el del preset
 * la clave se elimina —restablecer un campo no deja un override «fantasma»— y,
 * si no queda ningún retoque, se devuelve `null`. No muta la entrada.
 */
export function withColorOverride(
  overrides: ThemeOverrides | null,
  themeId: PosterThemeId,
  group: "poster" | "sky",
  key: string,
  value: string,
): ThemeOverrides | null {
  if (!isHexColor(value)) return overrides;

  const presetValue = (THEMES[themeId][group] as unknown as Record<string, unknown>)[key];
  const clearsPreset =
    typeof presetValue === "string" && presetValue.toLowerCase() === value.toLowerCase();
  const source = overrides?.[group] as Record<string, string | undefined> | undefined;
  const current = source?.[key];

  /* Sin cambio efectivo: devolver la MISMA referencia y no asignar nada. Los
     pickers nativos pueden emitir muchos eventos por arrastre; no deben
     provocar renders. */
  if (clearsPreset) {
    if (current === undefined) return overrides;
  } else if (current !== undefined && current.toLowerCase() === value.toLowerCase()) {
    return overrides;
  }

  const target = { ...(source ?? {}) } as Record<string, string | undefined>;
  if (clearsPreset) {
    delete target[key];
  } else {
    target[key] = value;
  }

  /* Se conserva la referencia del grupo que no se toca: cambiar solo un color
     del papel no recrea el grupo del cielo. */
  const next: ThemeOverrides = {};
  if (group === "poster") {
    if (Object.keys(target).length > 0) next.poster = target as PosterColorPatch;
    if (overrides?.sky) next.sky = overrides.sky;
  } else {
    if (overrides?.poster) next.poster = overrides.poster;
    if (Object.keys(target).length > 0) next.sky = target as SkyColorPatch;
  }
  return hasColorOverrides(next) ? next : null;
}

/**
 * Fusión preset + retoques. Sin cambios devuelve **la misma referencia** del
 * preset (estable como dependencia de efectos); con retoques devuelve un
 * objeto nuevo compuesto — nunca muta el original.
 */
export function resolveTheme(
  themeId: PosterThemeId,
  overrides: ThemeOverrides | null,
): PosterTheme {
  const base = THEMES[themeId];
  if (!hasColorOverrides(overrides)) return base;

  return {
    ...base,
    // Conserva la identidad de la mitad no retocada: evita recrear objetos
    // que no cambiaron (el motor compara una firma de los valores del cielo).
    poster: overrides?.poster ? { ...base.poster, ...overrides.poster } : base.poster,
    sky: overrides?.sky ? { ...base.sky, ...overrides.sky } : base.sky,
  };
}

/** Los pickers emiten `#rrggbb`; se descarta cualquier otra cosa. */
export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}
