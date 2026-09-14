import { api } from "@/lib/api-client"

interface PlanDeleteRestrictionsRow {
  puede_eliminar: boolean
  motivo: string | null
  grado_conflicto: string | null
}
interface PlanDeleteRestrictionsResponse {
  rows: PlanDeleteRestrictionsRow[]
}

export interface PlanDeleteRestrictions {
  puedeEliminar: boolean
  motivo: string | null
}

export async function checkPlanDeleteRestrictions(
  planItemId: number
): Promise<PlanDeleteRestrictions> {
  const raw: PlanDeleteRestrictionsResponse = await api.get(
    `/eval-col/plan-asignaturas/${planItemId}/restricciones-eliminar`
  )
  const row = raw.rows?.[0]
  if (!row) return { puedeEliminar: false, motivo: "No se pudo verificar si se puede eliminar." }
  return { puedeEliminar: row.puede_eliminar, motivo: row.motivo }
}
