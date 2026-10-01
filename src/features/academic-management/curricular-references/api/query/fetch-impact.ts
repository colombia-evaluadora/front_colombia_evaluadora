import { api } from "@/lib/api-client"
import { apiPath } from "@/lib/api-routes"
import { env } from "@/config/env"
import { unwrapRow, type RowsEnvelope } from "@/lib/response-envelope"

export interface CurricularReferenceImpact {
  units: number
  activities: number
  /** Actividades con calificaciones (Tipo de evaluación). */
  gradedActivities: number
  /** Unidades/actividades que citan enunciados o evidencias (Rótulos de Nivel 1/2). */
  contentUnits: number
  contentActivities: number
  /** Uso en los grados de los niveles retirados. */
  levelUnits: number
  levelActivities: number
  levelComponents: number
  /** Uso de las áreas retiradas. */
  areaUnits: number
  areaActivities: number
  areaComponents: number
}

export interface ImpactScope {
  removedLevelIds?: number[]
  removedAreaIds?: number[]
}

interface ImpactRow {
  unidades: number
  actividades: number
  actividades_calificadas?: number
  unidades_contenido?: number
  actividades_contenido?: number
  unidades_nivel?: number
  actividades_nivel?: number
  componentes_nivel?: number
  unidades_area?: number
  actividades_area?: number
  componentes_area?: number
}

const EMPTY_IMPACT: CurricularReferenceImpact = {
  units: 0,
  activities: 0,
  gradedActivities: 0,
  contentUnits: 0,
  contentActivities: 0,
  levelUnits: 0,
  levelActivities: 0,
  levelComponents: 0,
  areaUnits: 0,
  areaActivities: 0,
  areaComponents: 0,
}

function toNumber(value: number | undefined, fallback = 0) {
  return value == null ? fallback : Number(value)
}

/** Conteos para los modales de alto impacto. */
export async function fetchCurricularReferenceImpact(
  id: number,
  scope: ImpactScope = {},
): Promise<CurricularReferenceImpact> {
  // Sin handler MSW: en mock nunca hay impacto.
  if (env.ENABLE_API_MOCKING) return EMPTY_IMPACT

  const url = apiPath(
    `/academic-management/curricular-references/${id}/impact`,
    `/referentes-curriculares/${id}/impacto`,
  )
  const params = {
    ...(scope.removedLevelIds?.length ? { niveles: scope.removedLevelIds.join(",") } : {}),
    ...(scope.removedAreaIds?.length ? { areas: scope.removedAreaIds.join(",") } : {}),
  }
  const raw = (await api.get(url, { params })) as unknown as ImpactRow | RowsEnvelope<ImpactRow>
  const row = unwrapRow(raw)
  const units = toNumber(row?.unidades)
  const activities = toNumber(row?.actividades)
  return {
    units,
    activities,
    gradedActivities: toNumber(row?.actividades_calificadas),
    // Si el backend aún no los envía, se usa el total como aproximación.
    contentUnits: toNumber(row?.unidades_contenido, units),
    contentActivities: toNumber(row?.actividades_contenido, activities),
    levelUnits: toNumber(row?.unidades_nivel),
    levelActivities: toNumber(row?.actividades_nivel),
    levelComponents: toNumber(row?.componentes_nivel),
    areaUnits: toNumber(row?.unidades_area),
    areaActivities: toNumber(row?.actividades_area),
    areaComponents: toNumber(row?.componentes_area),
  }
}
