/**
 * tz-lookup no publica tipos (`main: tz.js`, CJS minificado): se declara la
 * superficie mínima. Lanza `RangeError` con coordenadas fuera de rango, de
 * ahí el `try` en `resolveTimeZone`.
 */
declare module "tz-lookup" {
  function tzlookup(latitude: number, longitude: number): string;
  export default tzlookup;
}
