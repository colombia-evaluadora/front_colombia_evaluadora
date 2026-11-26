/**
 * ¿El formulario cambió respecto a lo cargado? Compara por valor; las listas (grados, condiciones, causas)
 * sin importar el orden, porque marcar y desmarcar lo mismo no es un cambio.
 */
export function hayCambios(actual: unknown, inicial: unknown): boolean {
  return clave(actual) !== clave(inicial)
}

function clave(valor: unknown): string {
  return JSON.stringify(valor, (_k, v) => (Array.isArray(v) ? [...v].map((x) => JSON.stringify(x)).sort() : v))
}
