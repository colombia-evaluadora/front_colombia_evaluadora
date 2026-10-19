import type { ContextoUi } from "@/features/assistant/api/types"

/** El modelo solo lee los primeros 4000 caracteres de `contextoUi` (guía §8). */
export const MAX_CONTEXTO = 4000

const tamano = (contexto: ContextoUi) => JSON.stringify(contexto).length

/**
 * Recorta el contexto hasta que quepa, en orden de menor a mayor valor:
 * opciones de selects, parámetros y campos opcionales.
 */
export function recortarContexto(contexto: ContextoUi, max = MAX_CONTEXTO): ContextoUi {
  if (tamano(contexto) <= max) return contexto

  let actual: ContextoUi = {
    ...contexto,
    formularios: contexto.formularios?.map((f) => ({
      ...f,
      campos: f.campos.map(({ opciones: _, ...campo }) => campo),
    })),
  }
  if (tamano(actual) <= max) return actual

  const { parametros: _, ...sinParametros } = actual
  actual = sinParametros
  if (tamano(actual) <= max) return actual

  return {
    ...actual,
    formularios: actual.formularios?.map((f) => ({
      ...f,
      campos: f.campos.filter((c) => c.obligatorio),
    })),
  }
}
