import { useCallback, useEffect, useRef } from "react";

/**
 * Coalesce una ráfaga de llamadas en un solo commit por frame.
 *
 * Los selectores de color nativos pueden emitir decenas de eventos `input`
 * por segundo (y varios dentro del mismo frame). Actualizar el estado global
 * en cada uno multiplica renders, `Celestial.apply()` y repintados del
 * lienzo. Aquí solo se conserva el último valor y se entrega en el siguiente
 * `requestAnimationFrame`; `flush()` fuerza el valor pendiente (p. ej. al
 * cerrar el selector o al perder el foco).
 */
export function useRafCallback<T>(callback: (value: T) => void): {
  schedule: (value: T) => void;
  flush: () => void;
} {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const pending = useRef<T | null>(null);
  const hasPending = useRef(false);
  const frame = useRef<number | null>(null);

  const flush = useCallback(() => {
    if (frame.current !== null) {
      window.cancelAnimationFrame(frame.current);
      frame.current = null;
    }
    if (!hasPending.current) return;

    hasPending.current = false;
    const value = pending.current as T;
    pending.current = null;
    callbackRef.current(value);
  }, []);

  const schedule = useCallback(
    (value: T) => {
      pending.current = value;
      hasPending.current = true;
      if (frame.current === null) {
        frame.current = window.requestAnimationFrame(flush);
      }
    },
    [flush],
  );

  useEffect(
    () => () => {
      if (frame.current !== null) {
        window.cancelAnimationFrame(frame.current);
        frame.current = null;
      }
    },
    [],
  );

  return { schedule, flush };
}
