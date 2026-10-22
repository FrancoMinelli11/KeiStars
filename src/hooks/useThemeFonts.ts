import { useEffect, useState } from "react";
import { ensurePosterFonts } from "../lib/fonts";
import type { PosterTheme } from "../lib/themes";

/**
 * Carga explícita de las tipografías del tema activo y una versión que
 * incrementa al terminar: enlazada al render del póster y a
 * `Celestial.apply()`, fuerza el redibujado con la fuente cargada
 * (sin depender de que el mapa vuelva a pintar por sí solo).
 */
export function useThemeFonts(theme: PosterTheme): number {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let alive = true;
    void ensurePosterFonts(theme).finally(() => {
      if (alive) setVersion((value) => value + 1);
    });
    return () => {
      alive = false;
    };
  }, [theme]);

  return version;
}
