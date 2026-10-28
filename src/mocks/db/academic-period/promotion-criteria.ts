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
  REQUISITO_COMPLEMENTARIA?: "S" | "N"
  REQUISITOS_PROPIOS?: string[]
  REQUISITOS_NORMA?: string[] | null
}

// Registro único (Regla 38): el período nace con estos valores, así que leerlo
// sin haberlo guardado nunca devuelve vacío.
export function defaultPromotionCriteria(): PromotionCriteriaWriteBody {
  return {
    FK_GRADO: null,
    NODO_CURRICULAR: "AS",
    CANTIDAD_NIVELAR: 2,
    ASIGNATURA_OBLIGATORIA: "N",
    APROBACION_PROMEDIO: "N",
    DESEMPENHO_MIN_GENERAL: 25,
    DESEMPENHO_MINIMO: 25,
    MAX_ASIG_PROMEDIO: 1,
    MINIMO_INASISTENCIAS: 25,
    MAX_ASIG_NIVELAR_PROM: 2,
    OBLIGATORIAS: [],
    REQUISITO_COMPLEMENTARIA: "N",
    REQUISITOS_PROPIOS: [],
  }
}

// Clave = periodo + grado (`undefined` = criterio por defecto del periodo,
// mismo patrón que `fn_criterio_prom_guardar`/`fn_criterio_prom_obtener`
// reales: `FK_GRADO IS NULL` es la fila del periodo).
function criteriaKey(academicPeriodId: number, gradeId?: number): string {
  return `${academicPeriodId}:${gradeId ?? "period"}`
}

export const promotionCriteriaDb: Record<string, PromotionCriteriaWriteBody> = {
  // El período 1 trae un requisito propio para que la sección no arranque vacía.
  [criteriaKey(1)]: {
    ...defaultPromotionCriteria(),
    REQUISITOS_PROPIOS: ["Presentó la prueba Saber 11"],
  },
}
export { criteriaKey as promotionCriteriaKey }
