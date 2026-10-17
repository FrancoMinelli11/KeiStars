import { useEffect, useState } from "react";

/**
 * Retrasa la propagación de un valor para limitar la frecuencia de efectos
 * costosos (red de Nominatim, repintado del motor astronómico).
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
