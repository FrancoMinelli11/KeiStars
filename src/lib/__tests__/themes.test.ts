import { describe, expect, it } from "vitest";
import {
  DEFAULT_THEME_ID,
  hasColorOverrides,
  isHexColor,
  resolveTheme,
  THEME_IDS,
  THEMES,
  withColorOverride,
} from "../themes";

describe("THEMES", () => {
  it("hay cuatro presets con etiqueta y pistas propias", () => {
    expect(THEME_IDS).toHaveLength(4);
    expect(new Set(THEME_IDS.map((id) => THEMES[id].label)).size).toBe(4);
    for (const id of THEME_IDS) {
      const theme = THEMES[id];
      expect(theme.id).toBe(id);
      expect(theme.hint.length).toBeGreaterThan(20);
      expect(theme.paperLabel.length).toBeGreaterThan(0);
    }
  });

  it("el preset por defecto existe", () => {
    expect(THEME_IDS).toContain(DEFAULT_THEME_ID);
  });

  it("cada tipografía declara familia, peso y fallback", () => {
    for (const id of THEME_IDS) {
      const fonts = THEMES[id].fonts;
      for (const font of [fonts.title, fonts.subtitle, fonts.meta]) {
        expect(font.family.length).toBeGreaterThan(0);
        expect(font.weight).toBeGreaterThanOrEqual(100);
        expect(["serif", "sans", "mono"]).toContain(font.fallback);
      }
    }
  });

  it("todos los colores son hex de 6 dígitos", () => {
    for (const id of THEME_IDS) {
      const { poster, sky } = THEMES[id];
      for (const color of [
        poster.bg,
        poster.text,
        poster.muted,
        poster.accent,
        poster.frame,
        poster.ring,
        sky.bg,
        sky.star,
        sky.constellationLine,
        sky.constellationName,
        sky.graticule,
        sky.milkyWay,
      ]) {
        expect(isHexColor(color)).toBe(true);
      }
    }
  });
});

describe("resolveTheme", () => {
  it("sin retoques devuelve la MISMA referencia del preset", () => {
    expect(resolveTheme("midnight", null)).toBe(THEMES.midnight);
    expect(resolveTheme("obsidian", {})).toBe(THEMES.obsidian);
  });

  it("fusiona solo los colores retocados", () => {
    const theme = resolveTheme("midnight", {
      poster: { bg: "#112233" },
      sky: { star: "#ff0000" },
    });
    expect(theme.poster.bg).toBe("#112233");
    expect(theme.sky.star).toBe("#ff0000");
    // El resto se conserva del preset.
    expect(theme.poster.text).toBe(THEMES.midnight.poster.text);
    expect(theme.sky.bg).toBe(THEMES.midnight.sky.bg);
    expect(theme.fonts).toBe(THEMES.midnight.fonts);
    // El preset original no se muta.
    expect(THEMES.midnight.poster.bg).toBe("#0b132b");
  });

  it("hasColorOverrides distingue vacío de personalizado", () => {
    expect(hasColorOverrides(null)).toBe(false);
    expect(hasColorOverrides({})).toBe(false);
    expect(hasColorOverrides({ poster: {} })).toBe(false);
    expect(hasColorOverrides({ poster: { bg: "#112233" } })).toBe(true);
    expect(hasColorOverrides({ sky: { star: "#ffffff" } })).toBe(true);
  });
});

describe("withColorOverride", () => {
  it("añade un retoque sin mutar la entrada", () => {
    const overrides = { poster: { bg: "#112233" } };
    const next = withColorOverride(overrides, "midnight", "sky", "star", "#abcdef");

    expect(next).toEqual({ poster: { bg: "#112233" }, sky: { star: "#abcdef" } });
    expect(overrides).toEqual({ poster: { bg: "#112233" } });
  });

  it("volver al color del preset elimina el retoque y deja null si no queda nada", () => {
    expect(
      withColorOverride({ poster: { bg: "#112233" } }, "midnight", "poster", "bg", "#0b132b"),
    ).toBeNull();
  });

  it("compara con el preset sin distinguir mayúsculas", () => {
    expect(
      withColorOverride({ poster: { bg: "#112233" } }, "midnight", "poster", "bg", "#0B132B"),
    ).toBeNull();
  });

  it("conserva el resto de claves y el otro grupo", () => {
    const overrides = {
      poster: { bg: "#112233", text: "#ffffff" },
      sky: { star: "#dddddd" },
    };
    const next = withColorOverride(overrides, "midnight", "poster", "bg", "#0b132b");

    expect(next).toEqual({ poster: { text: "#ffffff" }, sky: { star: "#dddddd" } });
  });

  it("ignora valores que no son #rrggbb", () => {
    const overrides = { poster: { bg: "#112233" } };
    expect(withColorOverride(overrides, "midnight", "poster", "bg", "red")).toBe(overrides);
  });
});

describe("isHexColor", () => {
  it("solo admite #rrggbb", () => {
    expect(isHexColor("#a1b2c3")).toBe(true);
    expect(isHexColor("#A1B2C3")).toBe(true);
    expect(isHexColor("#abc")).toBe(false);
    expect(isHexColor("red")).toBe(false);
    expect(isHexColor(123)).toBe(false);
  });
});
