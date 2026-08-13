import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { EspecialidadOption } from "@/features/establishment/academic-period/api/types/especialidad"

function fetchEspecialidades(
  academicPeriodId?: number
): Promise<EspecialidadOption[]> {
  const qs =
    academicPeriodId != null ? `?academicPeriodId=${academicPeriodId}` : ""
  return api.get(`/especialidades${qs}`)
}

export const especialidadesQueryKey = (academicPeriodId?: number) => [
  "especialidades",
  academicPeriodId,
]

export function useEspecialidadesQuery(academicPeriodId?: number) {
  return useQuery({
    queryKey: especialidadesQueryKey(academicPeriodId),
    queryFn: () => fetchEspecialidades(academicPeriodId),
  })
}
