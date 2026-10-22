/** Une clases condicionales descartando falsy (`clsx` mínimo, sin dependencia). */
export function cx(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}
