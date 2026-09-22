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

/**
 * Como `toDigitsOnly`, pero además descarta los ceros a la izquierda: para
 * campos numéricos donde `0`/`00...` no es un valor válido (ej. "Duración
 * estimada" de una actividad — cero minutos no significa nada), así
 * que tipear un `0` a secas deja el campo vacío en vez de mostrar un cero
 * inválido. Los ceros se descartan ANTES de recortar a `maxLength`, para no
 * perder dígitos de más a la derecha (p. ej. "0007" con `maxLength: 3` debe
 * quedar en "007"... salvo que también empiece en cero: por eso se
 * descartan primero y da "7", no "000").
 */
export function toPositiveDigitsInput(value: string, maxLength?: number): string {
  const digits = toDigitsOnly(value).replace(/^0+/, "")
  return maxLength ? digits.slice(0, maxLength) : digits
}

/**
 * Formatea un NIT colombiano mientras se escribe: hasta 10 dígitos, con un
 * guión insertado automáticamente antes del último (el dígito de
 * verificación) — p. ej. escribiendo "9001234567" queda "900123456-7".
 * Cualquier carácter que no sea dígito se descarta primero (vía
 * `toDigitsOnly`), así que pegar un NIT ya formateado con guión también
 * funciona: el guión pegado se descarta y se vuelve a insertar en la
 * posición correcta.
 */
export function toNitInput(value: string): string {
  const digits = toDigitsOnly(value, 10)
  return digits.length <= 1 ? digits : `${digits.slice(0, -1)}-${digits.slice(-1)}`
}

/**
 * Filtra `value` dejando solo dígitos y, a lo sumo, un guión para expresar
 * un rango simple ("10-12"). Pensado para campos numéricos que además
 * admiten un rango (ej. "Semana del cronograma") — nunca letras ni una
 * lista separada por comas.
 *
 * Cualquier guión de más se descarta (junto con el primer dígito antes de
 * él no se toca, pero los que quedan después del primer guión se
 * concatenan como dígitos): "10--12" y "10-1-2" quedan en "10-112".
 */
export function toDigitsOrRangeInput(value: string): string {
  const cleaned = value.replace(/[^\d-]/g, "").replace(/^-+/, "")
  const [first = "", ...rest] = cleaned.split("-")
  const tail = rest.join("")
  return tail ? `${first}-${tail}` : first
}

export function toLettersOnly(value: string, maxLength?: number): string {
  const letters = value.replace(/[^\p{L}\s]/gu, "")
  return maxLength ? letters.slice(0, maxLength) : letters
}

export function toSafeTextInput(value: string, maxLength?: number): string {
  const cleaned = value.replace(/[^\p{L}\p{N}\s.,'()&#/-]/gu, "")
  return maxLength ? cleaned.slice(0, maxLength) : cleaned
}
