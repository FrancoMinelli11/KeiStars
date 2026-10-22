/**
 * Límites de los canvas 2D según el dispositivo.
 *
 * Un póster 50×70 a 300 DPI son 5906×8268 px ≈ 48,8 Mpx (~195 MB por buffer);
 * Safari/iOS históricamente limita el área a ~16,7 Mpx y el fallo se manifiesta
 * como un `toDataURL` que devuelve "data:," sin mensaje útil. La comprobación
 * se hace **antes** de asignar el lienzo para dar un consejo accionable.
 */

export interface CanvasCapacity {
  ok: boolean;
  message?: string;
}

/** Límite de área en móviles (iOS Safari y presupuestos de memoria Android). */
const MOBILE_AREA_LIMIT = 16_777_216;
/** Máximo por dimensión que aceptan los motores desktop (Chromium/Firefox). */
const MAX_DIMENSION = 32767;
/** Límite de área desktop conservador (Chromium: ~2^28 px). */
const DESKTOP_AREA_LIMIT = 268_435_456;

function detectMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent ?? "";
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  return isIOS || /Android/.test(ua);
}

/** ¿El dispositivo puede manejar un lienzo de `width`×`height`? */
export function checkCanvasCapacity(width: number, height: number): CanvasCapacity {
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    return {
      ok: false,
      message:
        "El formato excede el tamaño máximo de lienzo de este navegador. Elige un formato más pequeño.",
    };
  }

  const area = width * height;
  const megapixels = (area / 1_000_000).toFixed(1);

  if (detectMobile() && area > MOBILE_AREA_LIMIT) {
    return {
      ok: false,
      message:
        `Este dispositivo no puede generar ${width} × ${height} px (${megapixels} Mpx) a 300 DPI. ` +
        "Elige 21×30 o 30×40, o exporta desde un ordenador.",
    };
  }

  if (area > DESKTOP_AREA_LIMIT) {
    return {
      ok: false,
      message: `El lienzo de ${width} × ${height} px (${megapixels} Mpx) excede la memoria disponible. Elige un formato más pequeño.`,
    };
  }

  return { ok: true };
}
