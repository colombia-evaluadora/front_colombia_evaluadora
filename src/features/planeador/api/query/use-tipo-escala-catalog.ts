import { fetchSelectCategory } from "@/features/establishment/academic-period/api/query/fetch-select-category"
import type { EscalaValoracionTipo } from "@/features/planeador/api/types/actividad"

/**
 * Catálogo `TIPO_ESCALA` de `TLISTA_VALOR` — resuelve el `tipoEscala` que
 * pide `PUT /planeador/actividades/:id/instrumento` cuando el instrumento es
 * "Escala de valoración" (confirmado real, colección Postman
 * `planeador-instrumentos-tipos-completo`, 3.3/4.2: NUMERICA vs CUALITATIVA).
 * Mismo criterio de match por substring en `nombre` que
 * `use-calculo-definitiva-catalog.ts`.
 */
function toEscalaTipo(nombre: string): EscalaValoracionTipo | undefined {
  const lower = nombre.toLowerCase()
  if (lower.includes("numér") || lower.includes("numer")) return "Numérica"
  if (lower.includes("cualitativ")) return "Cualitativa"
  return undefined
}

export interface TipoEscalaOption {
  id: number
  tipo: EscalaValoracionTipo
}

/** No es un hook: se llama al armar el body de `PUT .../instrumento`. */
export async function fetchTipoEscalaOptions(): Promise<TipoEscalaOption[]> {
  const rows = await fetchSelectCategory("TIPO_ESCALA")
  return rows
    .map((row) => {
      const tipo = toEscalaTipo(row.nombre)
      return tipo ? { id: row.pk_lista_valor, tipo } : undefined
    })
    .filter((option): option is TipoEscalaOption => option != null)
}

export async function resolveTipoEscalaId(tipo: EscalaValoracionTipo): Promise<number | undefined> {
  const options = await fetchTipoEscalaOptions()
  return options.find((o) => o.tipo === tipo)?.id
}
