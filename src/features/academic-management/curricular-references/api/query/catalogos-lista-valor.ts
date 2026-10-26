import { useQuery } from "@tanstack/react-query"

import { selectCategoryQueryOptions, type SelectCategoryRow } from "@/features/establishment/academic-period/api/query/fetch-select-category"
import type { CatalogItem } from "@/features/establishment/employees/api/types/catalog"

const toCatalogItems = (rows: SelectCategoryRow[]): CatalogItem[] =>
  rows.map((row) => ({ id: row.pk_lista_valor, code: row.valor, name: row.nombre, predeterminado: row.predeterminado === true }))

export function useEvaluationTypesQuery() {
  return useQuery({ ...selectCategoryQueryOptions("TIPO_EVALUACION"), select: toCatalogItems })
}

export function usePedagogicalApproachesQuery() {
  return useQuery({ ...selectCategoryQueryOptions("ENFOQUE_PEDAGOGICO"), select: toCatalogItems })
}
