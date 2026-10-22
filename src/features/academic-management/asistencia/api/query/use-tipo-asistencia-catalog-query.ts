import { useQuery } from "@tanstack/react-query"

import { selectCategoryQueryOptions, type SelectCategoryRow } from "@/features/establishment/academic-period/api/query/fetch-select-category"

import type { TipoAsistencia } from "@/features/academic-management/asistencia/api/types/asistencia"

export interface TipoAsistenciaOption {
  value: TipoAsistencia
  label: string
}

const VALORES_VALIDOS: TipoAsistencia[] = [1, 2, 3, 5, 6]

/** Los "trajo justificación": `es_justificado` en el backend (VALOR 3 y 6). */
export const TIPOS_JUSTIFICADOS: TipoAsistencia[] = [3, 6]

function toTipoAsistenciaOptions(rows: SelectCategoryRow[]): TipoAsistenciaOption[] {
  return rows
    .map((row) => ({ value: Number(row.valor) as TipoAsistencia, label: row.nombre }))
    .filter((opt): opt is TipoAsistenciaOption => VALORES_VALIDOS.includes(opt.value))
    .sort((a, b) => a.value - b.value)
}

export function useTipoAsistenciaCatalogQuery() {
  return useQuery({ ...selectCategoryQueryOptions("TIPO_ASISTENCIA"), select: toTipoAsistenciaOptions })
}
