import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type {
  EspecialidadEnfasisRow,
  EspecialidadOption,
} from "../types/especialidad"

async function fetchEspecialidades(
  academicPeriodId?: number
): Promise<EspecialidadOption[]> {
  const qs =
    academicPeriodId != null ? `?academicPeriodId=${academicPeriodId}` : ""
  const rows = (await api.get(
    `/especialidades${qs}`
  )) as EspecialidadEnfasisRow[]
  // El front trabaja por nombre; conservamos `origen` por si el UI agrupa.
  return rows.map((row) => ({
    key: row.nombre,
    label: row.nombre,
    origen: row.origen,
  }))
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
