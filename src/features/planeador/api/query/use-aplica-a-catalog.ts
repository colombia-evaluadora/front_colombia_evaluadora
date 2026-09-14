import { fetchSelectCategory } from "@/features/establishment/academic-period/api/query/fetch-select-category"

/**
 * Catálogo `APLICA_A` de `TLISTA_VALOR` — resuelve el `aplicaA` que pide
 * `PUT /planeador/actividades/:id/adaptaciones` (confirmado real, colección
 * Postman `planeador-guia-completa`, 4.8; categoría y variante
 * `TODO_EL_GRUPO` confirmadas por la variable `aplicaTodoElGrupoId`).
 * También la reusa `ASIGNAR_TODO_EL_GRUPO` de crear actividad, aunque ese
 * campo hoy queda fijo en `true` (ver `create-actividad.ts`).
 *
 * Match por substring en `nombre` contra las 2 opciones del `<Select>` de
 * "¿A quién se aplica esta adaptación?" (`AdaptacionItem`).
 */
const APLICA_A_VALORES = ["A todo el grupo", "Estudiantes específicos"] as const

function toAplicaA(nombre: string): string | undefined {
  const lower = nombre.toLowerCase()
  if (lower.includes("todo") && lower.includes("grupo")) return "A todo el grupo"
  if (lower.includes("específic") || lower.includes("seleccionad")) return "Estudiantes específicos"
  return undefined
}

export interface AplicaAOption {
  id: number
  valor: (typeof APLICA_A_VALORES)[number]
}

/** No es un hook: se llama al armar el body de `PUT .../adaptaciones`. */
export async function fetchAplicaAOptions(): Promise<AplicaAOption[]> {
  const rows = await fetchSelectCategory("APLICA_A")
  return rows
    .map((row) => {
      const valor = toAplicaA(row.nombre)
      return valor ? { id: row.pk_lista_valor, valor } : undefined
    })
    .filter((option): option is AplicaAOption => option != null)
}

export async function resolveAplicaAId(valor: string): Promise<number | undefined> {
  const options = await fetchAplicaAOptions()
  return options.find((o) => o.valor === valor)?.id
}
