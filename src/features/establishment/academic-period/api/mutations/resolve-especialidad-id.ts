import { api } from "@/lib/api-client"

interface EspecialidadRow {
  id: number
  nombre: string
}
interface EspecialidadesResponse {
  rows: EspecialidadRow[]
}

// La UI maneja la especialidad/énfasis por nombre (freeform); el backend
// espera `FK_ENFASIS` como id del catálogo `GET /eval-col/areas/:periodoId/especialidades`.
export async function resolveEspecialidadId(
  academicPeriodId: number
): Promise<Map<string, number>> {
  const raw: EspecialidadesResponse = await api.get(
    `/eval-col/areas/${academicPeriodId}/especialidades`
  )
  return new Map((raw.rows ?? []).map((row) => [row.nombre, row.id]))
}
