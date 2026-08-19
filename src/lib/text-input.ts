/**
 * Filtra `value` dejando solo dígitos, y lo recorta a `maxLength` si se
 * pasa. Pensado para `onChange` de inputs que en la base son VARCHAR
 * numéricos puros (identificación, NIT, DANE, …) — nunca alfanuméricos,
 * aunque el `<input>` sea `type="text"` (un `type="number"` no sirve para
 * estos campos: pierde ceros a la izquierda y acepta notación como `1e5`).
 *
 * Se aplica sobre el valor YA escrito (no intercepta la tecla), así que
 * cubre pegado/autocompletado igual que tipeo normal.
 */
export function toDigitsOnly(value: string, maxLength?: number): string {
  const digits = value.replace(/\D/g, "")
  return maxLength ? digits.slice(0, maxLength) : digits
}
