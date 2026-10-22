/**
 * Huella rápida de un texto (cyrb53, 53 bits en hex). La usa el persister
 * para saber si una query cambió respecto de lo que ya está guardado en el
 * equipo SIN descifrar la fila: se compara la huella del JSON nuevo con la de
 * la última escritura.
 *
 * No es criptográfica (no protege nada): solo detecta cambios. Una colisión
 * dejaría sin reescribir un dato que sí cambió hasta la próxima preparación
 * con cambios o "Forzar todo"; con 53 bits por query es despreciable.
 */
export function hashString(text: string, seed = 0): string {
  let h1 = 0xdeadbeef ^ seed
  let h2 = 0x41c6ce57 ^ seed
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507)
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507)
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  const value = 4294967296 * (2097151 & h2) + (h1 >>> 0)
  return value.toString(16).padStart(14, "0") + text.length.toString(36)
}
