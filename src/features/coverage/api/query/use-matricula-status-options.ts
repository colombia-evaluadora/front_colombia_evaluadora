import { useQuery } from "@tanstack/react-query"

import { fetchSelectCategory } from "@/features/establishment/academic-period/api/query/fetch-select-category"
import type { MatriculaStatus } from "@/features/coverage/api/types/matricula"

export interface MatriculaStatusOption {
  value: MatriculaStatus
  label: string
}

export async function fetchMatriculaStatusOptions(): Promise<MatriculaStatusOption[]> {
  const rows = await fetchSelectCategory("ESTADO_MATRICULA")
  return rows.map((row) => ({
    value: row.nombre as MatriculaStatus,
    label: row.nombre,
  }))
}

export const matriculaStatusOptionsQueryKey = () => ["matricula", "status-options"]

export function useMatriculaStatusOptionsQuery() {
  return useQuery({
    queryKey: matriculaStatusOptionsQueryKey(),
    queryFn: fetchMatriculaStatusOptions,
    staleTime: Infinity,
  })
}
