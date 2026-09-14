import { fetchSelectCategory } from "@/features/establishment/academic-period/api/query/fetch-select-category"
import type { Adaptacion } from "@/features/planeador/api/types/actividad"

/**
 * Catálogo `TIPO_ADAPTACION` de `TLISTA_VALOR` — resuelve el `tipoAdaptacion`
 * que pide `PUT /planeador/actividades/:id/adaptaciones` (confirmado real,
 * colección Postman `planeador-guia-completa`, 4.8; categoría confirmada por
 * la variable `tipoAdaptacionId`). Match por substring en `nombre` contra
 * las 7 opciones del `<Select>` de "¿Qué tipo de adaptación requiere esta
 * actividad?" (`AdaptacionItem`) — mismo criterio que el resto de catálogos
 * de este módulo sin `valor` confirmado.
 */
const TIPO_ADAPTACION_VALORES = [
  "Discapacidad visual",
  "Discapacidad auditiva",
  "Dificultades cognitivas",
  "Estilo de aprendizaje",
  "Modalidad",
  "Nivel de desempeño",
  "Otro",
] as const

function toTipoAdaptacion(nombre: string): Adaptacion["tipo"] | undefined {
  const lower = nombre.toLowerCase()
  return TIPO_ADAPTACION_VALORES.find((valor) => lower.includes(valor.toLowerCase()))
}

export interface TipoAdaptacionOption {
  id: number
  tipo: string
}

/** No es un hook: se llama al armar el body de `PUT .../adaptaciones`. */
export async function fetchTipoAdaptacionOptions(): Promise<TipoAdaptacionOption[]> {
  const rows = await fetchSelectCategory("TIPO_ADAPTACION")
  return rows
    .map((row) => {
      const tipo = toTipoAdaptacion(row.nombre)
      return tipo ? { id: row.pk_lista_valor, tipo } : undefined
    })
    .filter((option): option is TipoAdaptacionOption => option != null)
}

export async function resolveTipoAdaptacionId(tipo: string): Promise<number | undefined> {
  const options = await fetchTipoAdaptacionOptions()
  return options.find((o) => o.tipo === tipo)?.id
}
