// Body PLANO (UPPER_SNAKE) tal como lo manda `update-promotion-criteria.ts`
// (`fn_criterio_prom_guardar`) — se guarda tal cual, sin traducir a
// `PromotionCriteria`, porque `OBLIGATORIAS` ya viene resuelta a ids y hace
// falta reconstruir los nombres al leer.
export interface PromotionCriteriaWriteBody {
  FK_GRADO: number | null
  NODO_CURRICULAR: string
  CANTIDAD_NIVELAR: number
  ASIGNATURA_OBLIGATORIA: "S" | "N"
  APROBACION_PROMEDIO: "S" | "N"
  DESEMPENHO_MIN_GENERAL: number
  DESEMPENHO_MINIMO: number
  MAX_ASIG_PROMEDIO: number
  MINIMO_INASISTENCIAS: number
  MAX_ASIG_NIVELAR_PROM: number
  // V73 — array plano de ids (BIGINT[]), no JSONB de {asignaturaId|areaId}:
  // `NODO_CURRICULAR` ("AS"|"AR") ya dice de qué tabla son los ids.
  OBLIGATORIAS: number[]
}

// Clave = periodo + grado (`undefined` = criterio por defecto del periodo,
// mismo patrón que `fn_criterio_prom_guardar`/`fn_criterio_prom_obtener`
// reales: `FK_GRADO IS NULL` es la fila del periodo).
function criteriaKey(academicPeriodId: number, gradeId?: number): string {
  return `${academicPeriodId}:${gradeId ?? "period"}`
}

export const promotionCriteriaDb: Record<string, PromotionCriteriaWriteBody> = {}
export { criteriaKey as promotionCriteriaKey }
