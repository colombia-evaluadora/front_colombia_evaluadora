/**
 * Única fuente de las query keys de `establishment/academic-period`
 * (periodos, periodos de evaluación, criterios, escalas, grados, grupos, plan
 * de estudio, áreas/asignaturas, especialidades, horario, asignaciones…).
 * Lecturas e invalidaciones se arman desde acá; nada en el feature debería
 * escribir un array literal de key.
 *
 * A diferencia de `planeadorKeys`, estas keys NO cuelgan de una raíz común:
 * nacieron planas (`["grades", params]`, `["subjects", periodoId]`…) y otros
 * features leen o invalidan algunas por su valor (p. ej. funcionarios
 * invalida `assignmentTeachers.all`). Se conservan los valores tal cual y la
 * jerarquía es por entidad: `x.all` es SIEMPRE el prefijo de todas las
 * lecturas de `x` (`x.list(params)`, `x.byPeriod(id)`…), así que invalidar
 * `x.all` refresca cualquier variante cacheada.
 *
 * Los listados que reciben `{ ...filtros, enabled }` sacan `enabled` de la
 * key: es una opción de `useQuery`, no un filtro.
 */

type WithEnabled = { enabled?: boolean }

const withoutEnabled = <P extends WithEnabled>(params: P) => {
  const { enabled: _enabled, ...key } = params
  return key
}

const academicPeriodsAll = ["academic-periods"] as const
const academicPeriodAll = ["academic-period"] as const
const areaSubjectsAll = ["area-subjects"] as const
const assignmentSubjectsAll = ["assignment-subjects"] as const
const assignmentTeachersAll = ["assignment-teachers"] as const
const studyPlanAvailableAll = ["study-plan-available"] as const
const especialidadesAll = ["especialidades"] as const
const evaluationCriteriaAll = ["evaluation-criteria"] as const
const evaluationPeriodsAll = ["evaluation-periods"] as const
const gradeGroupsAll = ["grade-groups"] as const
const gradesAll = ["grades"] as const
const horarioAll = ["horario"] as const
const periodAreasAll = ["period-areas"] as const
const promotionCriteriaAll = ["promotion-criteria"] as const
const ratingScalesAll = ["rating-scales"] as const
const studyPlansAll = ["study-plans"] as const
const subjectDetailsAll = ["subject-details"] as const
const subjectsAll = ["subjects"] as const
const teacherAssignmentsAll = ["teacher-assignments"] as const

export const academicPeriodKeys = {
  academicPeriods: {
    /** Prefijo de la lista, los años lectivos y los periodos previos por sede. */
    all: academicPeriodsAll,
    list: <P>(params: P) => [...academicPeriodsAll, params] as const,
    schoolYears: () => [...academicPeriodsAll, "school-years"] as const,
    previousBySede: (sedeId: string, excludeId?: number) =>
      [...academicPeriodsAll, "previous", sedeId, excludeId ?? null] as const,
  },
  academicPeriod: {
    all: academicPeriodAll,
    detail: (id: number) => [...academicPeriodAll, id] as const,
  },
  areaSubjects: {
    all: areaSubjectsAll,
    list: <P extends WithEnabled>(params: P) => [...areaSubjectsAll, withoutEnabled(params)] as const,
  },
  assignmentSubjects: {
    all: assignmentSubjectsAll,
    byPeriod: (academicPeriodId: number) => [...assignmentSubjectsAll, academicPeriodId] as const,
  },
  assignmentTeachers: {
    all: assignmentTeachersAll,
    list: <P>(params: P) => [...assignmentTeachersAll, params] as const,
  },
  /** Asignaturas disponibles para agregar al plan de estudio de un grado. */
  studyPlanAvailable: {
    all: studyPlanAvailableAll,
    byGrade: (gradeId?: number, academicPeriodId?: number) =>
      [...studyPlanAvailableAll, gradeId, academicPeriodId] as const,
  },
  especialidades: {
    all: especialidadesAll,
    byPeriod: (academicPeriodId?: number) => [...especialidadesAll, academicPeriodId] as const,
  },
  evaluationCriteria: {
    all: evaluationCriteriaAll,
    byPeriod: (academicPeriodId: number) => [...evaluationCriteriaAll, academicPeriodId] as const,
  },
  evaluationPeriods: {
    all: evaluationPeriodsAll,
    list: <P extends WithEnabled>(params: P) =>
      [...evaluationPeriodsAll, withoutEnabled(params)] as const,
  },
  gradeGroups: {
    all: gradeGroupsAll,
    list: <P extends WithEnabled>(params: P) => [...gradeGroupsAll, withoutEnabled(params)] as const,
  },
  grades: {
    all: gradesAll,
    list: <P>(params: P) => [...gradesAll, params] as const,
  },
  horario: {
    all: horarioAll,
    byGrade: (gradeId?: number) => [...horarioAll, gradeId] as const,
  },
  periodAreas: {
    all: periodAreasAll,
    byPeriod: (academicPeriodId?: number) => [...periodAreasAll, academicPeriodId] as const,
  },
  promotionCriteria: {
    all: promotionCriteriaAll,
    byPeriod: (academicPeriodId: number, gradeId?: number) =>
      [...promotionCriteriaAll, academicPeriodId, gradeId] as const,
  },
  ratingScales: {
    all: ratingScalesAll,
    list: <P>(params: P) => [...ratingScalesAll, params] as const,
  },
  studyPlans: {
    all: studyPlansAll,
    list: <P extends WithEnabled>(params: P) => [...studyPlansAll, withoutEnabled(params)] as const,
  },
  subjectDetails: {
    all: subjectDetailsAll,
    byPeriod: (academicPeriodId?: number) => [...subjectDetailsAll, academicPeriodId] as const,
  },
  subjects: {
    all: subjectsAll,
    byPeriod: (academicPeriodId?: number) => [...subjectsAll, academicPeriodId] as const,
  },
  teacherAssignments: {
    all: teacherAssignmentsAll,
    detail: (academicPeriodId: number, funcionarioId: string) =>
      [...teacherAssignmentsAll, academicPeriodId, funcionarioId] as const,
  },

  // Catálogos (una sola key, `staleTime` largo; `generalAreas` sí se invalida
  // al borrar un área/asignatura).
  academicPeriodStatuses: () => ["academic-period-statuses"] as const,
  curriculumNodes: () => ["curriculum-nodes"] as const,
  evaluationCriteriaOptions: () => ["evaluation-criteria-options"] as const,
  evaluationPeriodStatuses: () => ["evaluation-period-statuses"] as const,
  generalAreas: () => ["general-areas"] as const,
  gradosCatalog: () => ["grados-catalog"] as const,
  jornadas: () => ["jornadas"] as const,
  metodologias: () => ["metodologias"] as const,
  ratingScaleTypes: () => ["rating-scale-types"] as const,
  ratingSymbols: () => ["rating-symbols"] as const,
  sedeOptions: () => ["sedes", "options"] as const,
  teachingLevels: () => ["teaching-levels"] as const,
} as const
