import { useEffect, useState } from "react";
import { ensurePosterFonts } from "../lib/fonts";
import type { PosterThemeFonts } from "../lib/themes";

/**
 * Carga explícita de las tipografías del tema activo y una versión que
 * incrementa al terminar: enlazada al render del póster y a
 * `Celestial.apply()`, fuerza el redibujado con la fuente cargada
 * (sin depender de que el mapa vuelva a pintar por sí solo).
 *
 * Depende solo de `fonts`, no del tema resuelto: los colores personalizados
 * no cambian la tipografía y no deben relanzar la carga en cada arrastre.
 */
export function useThemeFonts(fonts: PosterThemeFonts): number {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let alive = true;
    void ensurePosterFonts(fonts).finally(() => {
      if (alive) setVersion((value) => value + 1);
    });
    return () => {
      alive = false;
    };
  }, [fonts]);

  return version;
}
