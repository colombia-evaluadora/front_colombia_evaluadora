import { fetchSelectCategory } from "@/features/establishment/academic-period/api/query/fetch-select-category"

/**
 * Catálogo `TIPO_EVIDENCIA_OTRO` de `TLISTA_VALOR` — resuelve el
 * `tipoEvidencia` que pide `PUT /planeador/actividades/:id/instrumento`
 * cuando el instrumento es "Otro" (confirmado real, colección Postman
 * `planeador-instrumentos-tipos-completo`, 5.3: ARCHIVO | ENLACE |
 * OBSERVACION_DIRECTA | REGISTRO_CAMPO). Los 4 valores del `<Select>` de
 * "Tipo de evidencia esperada" (`InstrumentoPersonalizadoSection`) matchean
 * 1:1 por substring de `nombre` — mismo criterio que el resto de catálogos
 * de este módulo sin `valor` confirmado.
 */
const TIPO_EVIDENCIA_OTRO_VALORES = ["Archivo", "Enlace", "Observación directa", "Registro en campo"] as const

export type TipoEvidenciaOtro = (typeof TIPO_EVIDENCIA_OTRO_VALORES)[number]

function toTipoEvidenciaOtro(nombre: string): TipoEvidenciaOtro | undefined {
  const lower = nombre.toLowerCase()
  return TIPO_EVIDENCIA_OTRO_VALORES.find((valor) => lower.includes(valor.toLowerCase()))
}

export interface TipoEvidenciaOtroOption {
  id: number
  tipo: TipoEvidenciaOtro
}

/** No es un hook: se llama al armar el body de `PUT .../instrumento`. */
export async function fetchTipoEvidenciaOtroOptions(): Promise<TipoEvidenciaOtroOption[]> {
  const rows = await fetchSelectCategory("TIPO_EVIDENCIA_OTRO")
  return rows
    .map((row) => {
      const tipo = toTipoEvidenciaOtro(row.nombre)
      return tipo ? { id: row.pk_lista_valor, tipo } : undefined
    })
    .filter((option): option is TipoEvidenciaOtroOption => option != null)
}

export async function resolveTipoEvidenciaOtroId(tipo: string): Promise<number | undefined> {
  const options = await fetchTipoEvidenciaOtroOptions()
  return options.find((o) => o.tipo === tipo)?.id
}
