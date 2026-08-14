import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { EspecialidadEnfasisRow, EspecialidadOption } from "@/features/establishment/academic-period/api/types/especialidad"

interface EspecialidadesResponse {
  rows: EspecialidadEnfasisRow[]
}

// `GET /eval-col/areas/:ID/especialidades` (`fn_especialidad_enfasis_listar`,
// id_query 41). Pese al nombre del path, el `:ID` es el período académico —
// el backend resuelve el establecimiento a partir de él (confirmado).
async function fetchEspecialidades(
  academicPeriodId?: number
): Promise<EspecialidadOption[]> {
  if (academicPeriodId == null) return []
  const raw: EspecialidadesResponse = await api.get(
    `/eval-col/areas/${academicPeriodId}/especialidades`
  )
  // El front trabaja por nombre; `id`/`origen` habilitan editar/borrar énfasis.
  return (raw.rows ?? []).map((row) => ({
    id: row.id,
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
