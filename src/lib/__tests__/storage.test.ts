import { describe, expect, it } from "vitest";
import { createDefaultPoster } from "../../state/poster";
import {
  buildShareHref,
  decodeShareState,
  hydratePoster,
  SCHEMA_VERSION,
  serializePoster,
  SHARE_HASH_PREFIX,
} from "../storage";

const LOCATION = { origin: "https://example.com", pathname: "/KeiStars/" };

function customizedPoster() {
  const poster = createDefaultPoster();
  return {
    ...poster,
    title: "Año estelar 🚀",
    subtitle: "14 de febrero de 2024",
    theme: "obsidian" as const,
    themeOverrides: {
      poster: { bg: "#101020", frame: "#e5c07b" },
      sky: { star: "#ffffff", constellationLine: "#d4af37" },
    },
    sizeId: "50x70",
    timeZone: "Europe/Madrid",
    utcOffsetMinutes: 120,
    offsetTouched: true,
    placeLabel: "Madrid, España",
    subtitleTouched: true,
    coordinatesTouched: true,
  };
}

describe("serializePoster / hydratePoster", () => {
  it("hace roundtrip exacto del estado por defecto", () => {
    const poster = createDefaultPoster();
    const restored = hydratePoster(serializePoster(poster));
    expect(restored).toEqual(poster);
  });

  it("hace roundtrip de colores, formato y textos con Unicode", () => {
    const poster = customizedPoster();
    const restored = hydratePoster(JSON.parse(JSON.stringify(serializePoster(poster))));
    expect(restored).toEqual(poster);
    expect(restored?.title).toBe("Año estelar 🚀");
    expect(restored?.themeOverrides?.poster?.bg).toBe("#101020");
  });

  it("incluye la versión de esquema", () => {
    expect(serializePoster(createDefaultPoster()).v).toBe(SCHEMA_VERSION);
  });

  it("rechaza payloads corruptos o de otra versión", () => {
    expect(hydratePoster(null)).toBeNull();
    expect(hydratePoster("nope")).toBeNull();
    expect(hydratePoster({ v: 1 })).toBeNull();
    expect(hydratePoster({ ...serializePoster(createDefaultPoster()), v: 99 })).toBeNull();
  });

  it("sanea campos inválidos sin romper el resto", () => {
    const poster = createDefaultPoster();
    const restored = hydratePoster({
      ...serializePoster(poster),
      theme: "neon",
      projection: "gnomonic",
      sizeId: "100x200",
      utcOffsetMinutes: 5000,
      timeZone: "Marte/Olympus_Mons",
      flags: { lines: "yes", names: false },
      themeOverrides: { poster: { bg: "red", text: "#00ff00" } },
    });

    expect(restored).not.toBeNull();
    expect(restored?.theme).toBe(poster.theme);
    expect(restored?.projection).toBe(poster.projection);
    expect(restored?.sizeId).toBe(poster.sizeId);
    expect(restored?.utcOffsetMinutes).toBe(840);
    expect(restored?.timeZone).toBeNull();
    // Sólo sobreviven las flags y los colores válidos.
    expect(restored?.flags.names).toBe(false);
    expect(restored?.flags.lines).toBe(poster.flags.lines);
    expect(restored?.themeOverrides).toEqual({ poster: { text: "#00ff00" } });
  });
});

describe("buildShareHref / decodeShareState", () => {
  it("codifica el diseño en el fragmento #p= (base64url) y lo recupera", () => {
    const poster = customizedPoster();
    const href = buildShareHref(poster, LOCATION);

    expect(href.startsWith(`${LOCATION.origin}${LOCATION.pathname}${SHARE_HASH_PREFIX}`)).toBe(
      true,
    );
    // base64url: sin +, / ni relleno =
    const payload = href.split(SHARE_HASH_PREFIX)[1];
    expect(payload).toMatch(/^[A-Za-z0-9_-]+$/);

    const restored = decodeShareState(href.slice(href.indexOf("#")));
    expect(restored).toEqual(poster);
  });

  it("el enlace compartido no depende del host", () => {
    const poster = createDefaultPoster();
    const href = buildShareHref(poster, LOCATION);
    const restored = decodeShareState(new URL(href).hash);
    expect(restored).toEqual(poster);
  });

  it("hash ausente, corrupto o de otra versión → null", () => {
    expect(decodeShareState("")).toBeNull();
    expect(decodeShareState("#otra-cosa")).toBeNull();
    expect(decodeShareState("#p=!!!")).toBeNull();
    expect(decodeShareState("#p=bm90LWFqc29u")).toBeNull(); // "not-json"
  });
});
