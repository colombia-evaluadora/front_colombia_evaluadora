import { z } from "zod"

export const ACADEMIC_PERIOD_STATUSES = ["ACTIVO", "INACTIVO"] as const


export const academicPeriodFormSchema = z
  .object({
    startDate: z.string().min(1, "La fecha de inicio es obligatoria"),
    endDate: z.string().min(1, "La fecha de finalización es obligatoria"),
    enrollmentDeadline: z.string().min(1, "La fecha límite de matrícula es obligatoria"),
    sedeId: z.number().int().positive("La sede es obligatoria"),
    // Derivado: el periodo anterior se resuelve por sede, no lo captura el
    // usuario. Puede ser null cuando la sede no tiene periodos previos.
    previousPeriodId: z.number().int().positive().nullable(),
    status: z.enum(ACADEMIC_PERIOD_STATUSES),
    jornadaId: z.number().int().positive("La jornada es obligatoria"),
    reservationEnabled: z.boolean(),
    defaultBlocksCount: z
      .number()
      .int()
      .positive("El número de bloques es obligatorio")
      .nullable()
      .refine((v): v is number => v !== null, {
        message: "El número de bloques es obligatorio",
      }),
    scheduleStartTime: z.string().min(1, "La hora de inicio es obligatoria"),
    scheduleEndTime: z.string().min(1, "La hora final es obligatoria"),
    breaks: z.array(
      z.object({
        startTime: z.string().min(1),
        endTime: z.string().min(1),
      })
    ),
  })
  .refine(
    (data) =>
      !data.startDate || !data.endDate || data.startDate < data.endDate,
    {
      message: "La fecha de inicio es posterior o igual a la fecha de finalización",
      path: ["startDate"],
    }
  )
export type AcademicPeriodFormInput = z.input<typeof academicPeriodFormSchema>
export type AcademicPeriodFormValues = z.infer<typeof academicPeriodFormSchema>

export const academicPeriodsFiltersFormSchema = z.object({
  sedeName: z.string(),
  schoolYearId: z.string(),
  status: z.string(),
  startFrom: z.string(),
  startTo: z.string(),
})
export type AcademicPeriodsFiltersFormInput = z.input<
  typeof academicPeriodsFiltersFormSchema
>
export type AcademicPeriodsFiltersFormValues = z.infer<
  typeof academicPeriodsFiltersFormSchema
>

export const academicPeriodsSearchSchema = z.object({
  page: z.coerce.number().int().nonnegative().catch(0).default(0),
  pageSize: z.coerce.number().int().positive().catch(10).default(10),
  sortBy: z.string().optional().catch(undefined),
  sortDir: z.enum(["asc", "desc"]).optional().catch(undefined),
  sedeName: z.string().optional().catch(undefined),
  schoolYearId: z.coerce.number().optional().catch(undefined),
  status: z.enum(ACADEMIC_PERIOD_STATUSES).optional().catch(undefined),
  startFrom: z.string().optional().catch(undefined),
  startTo: z.string().optional().catch(undefined),
})
export type AcademicPeriodsSearch = z.infer<typeof academicPeriodsSearchSchema>

// ───────────────────────────────────────────────────────────────────────────
// Schemas de forms de los tabs de configuración.
// (rating-scales queda en `rating-scales/grading-range.ts`: es una factory
//  atada al rango dinámico del periodo.)
// ───────────────────────────────────────────────────────────────────────────

// Área / Asignaturas
export const areaSubjectFormSchema = z.object({
  areaGeneral: z.string().min(1, "El área general es obligatoria"),
  nombreInterno: z.string().min(1, "El nombre interno es obligatorio"),
  abreviacion: z.string().min(1, "La abreviación es obligatoria"),
  ordenReportes: z.number().int().nonnegative(),
})
export type AreaSubjectFormValues = z.infer<typeof areaSubjectFormSchema>

// Grupos (grade-group)
export const gradeGroupFormSchema = z.object({
  codigo: z.string().min(1, "El grupo es obligatorio"),
  director: z.string(),
  metodologia: z.string(),
  cupo: z.number().min(0),
})
export type GradeGroupFormValues = z.infer<typeof gradeGroupFormSchema>

// Plan de estudio
export const studyPlanFormSchema = z.object({
  asignatura: z.string().min(1, "La asignatura es obligatoria"),
  intensidadHoraria: z.number().min(0),
  influenciaArea: z.number().min(0).max(100),
  numeroCreditos: z.number().min(0),
  influyeDesempeno: z.boolean(),
  matriculaObligatoria: z.boolean(),
  aprobacionObligatoria: z.boolean(),
  formatoCalificacion: z.string(),
  criterioNota: z.string(),
})
export type StudyPlanFormValues = z.infer<typeof studyPlanFormSchema>

// Periodos de evaluación
export const evaluationPeriodFormSchema = z
  .object({
    codigo: z
      .number()
      .int()
      .min(1, "El código debe ser mayor a 0"),
    nombre: z.string().min(1, "El nombre es obligatorio"),
    abreviacion: z.string().min(1, "La abreviación es obligatoria"),
    startDate: z.string().min(1, "La fecha de inicio es obligatoria"),
    endDate: z.string().min(1, "La fecha de fin es obligatoria"),
    peso: z
      .number({
        error: "El peso porcentual es obligatorio.",
      })
      .min(0)
      .max(100),
    estado: z.string().min(1, "El estado es obligatorio"),
  })
  .refine(
    (data) => !data.startDate || !data.endDate || data.startDate < data.endDate,
    {
      message:
        "La fecha de inicio es posterior o igual a la fecha de finalización",
      path: ["startDate"],
    }
  )
export type EvaluationPeriodFormValues = z.infer<
  typeof evaluationPeriodFormSchema
>

// Criterios de evaluación
export const evaluationCriteriaSchema = z.object({
  gradingFormat: z.string().min(1, "Requerido"),
  gradingScale: z.string().optional(),
  periodCalculationElements: z.string().min(1, "Requerido"),
  subjectGradeCriteria: z.string().min(1, "Requerido"),
  finalGradeCriteria: z.string().min(1, "Requerido"),
  areaGradeCriteria: z.string().min(1, "Requerido"),
  studentWithoutGradesPerformance: z.string().min(1, "Requerido"),
  maxRecoveryGrade: z.string().min(1, "Requerido"),
  roundingMode: z.string().min(1, "Requerido"),
  initialGrade: z.string().min(1, "Requerido"),
})
export type EvaluationCriteriaValues = z.infer<typeof evaluationCriteriaSchema>

// Criterios de promoción
export const promotionApprovalSchema = z.object({
  curriculumNode: z.string().min(1, "Requerido"),

  maxFailedRecovery: z.number().min(0, "El valor debe ser mayor o igual a 0"),
  absencePercentage: z.number().min(0, "El valor debe ser mayor o igual a 0"),
  maxLeveledSubjects: z.number().min(0, "El valor debe ser mayor o igual a 0"),
  maxFailedSubjects: z.number().min(0, "El valor debe ser mayor o igual a 0"),

  applyAverageApproval: z.boolean(),

  basePercentage: z.number().min(0, "El valor debe ser mayor o igual a 0"),
  minimumSubjectPercentage: z
    .number()
    .min(0, "El valor debe ser mayor o igual a 0"),
  maxFailedForAverage: z.number().min(0, "El valor debe ser mayor o igual a 0"),

  requiredSubjects: z.array(z.string()),
})
export type PromotionApprovalValues = z.infer<typeof promotionApprovalSchema>