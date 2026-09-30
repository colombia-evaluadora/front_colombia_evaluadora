import { api } from "@/lib/api-client"
import { apiPath } from "@/lib/api-routes"
import { env } from "@/config/env"
import { unwrapRow, type RowsEnvelope } from "@/lib/response-envelope"

export interface CurricularReferenceImpact {
  units: number
  activities: number
}

interface ImpactRow {
  unidades: number
  actividades: number
}

/** Unidades y actividades vivas bajo el referente (modales de alto impacto). */
export async function fetchCurricularReferenceImpact(id: number): Promise<CurricularReferenceImpact> {
  // Sin handler MSW: en mock nunca hay impacto.
  if (env.ENABLE_API_MOCKING) return { units: 0, activities: 0 }

  const url = apiPath(
    `/academic-management/curricular-references/${id}/impact`,
    `/referentes-curriculares/${id}/impacto`,
  )
  const raw = (await api.get(url)) as unknown as ImpactRow | RowsEnvelope<ImpactRow>
  const row = unwrapRow(raw)
  return { units: Number(row?.unidades ?? 0), activities: Number(row?.actividades ?? 0) }
}
