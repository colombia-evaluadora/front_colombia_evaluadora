import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

function fetchEspecialidades(academicPeriodId?: number): Promise<string[]> {
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
