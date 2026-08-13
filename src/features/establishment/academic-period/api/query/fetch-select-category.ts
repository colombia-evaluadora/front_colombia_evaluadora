import { api } from "@/lib/api-client"

// Fila cruda tal como la devuelve el catálogo genérico de TLISTA_VALOR
// (`GET /eval-col/select/:CATEGORIA`), confirmado contra una respuesta real de
// ThunderClient (categoría ESTADOPERIODO).
export interface SelectCategoryRow {
  pk_lista_valor: number
  nombre: string
  valor: string
  accion: string | null
}

interface SelectCategoryResponse {
  rows: SelectCategoryRow[]
}

export async function fetchSelectCategory(
  categoria: string
): Promise<SelectCategoryRow[]> {
  const raw = await api.get<SelectCategoryResponse>(
    `/eval-col/select/${categoria}`
  )
  return raw.rows ?? []
}
