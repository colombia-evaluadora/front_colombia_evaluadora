import { z } from "zod"

export const ACADEMIC_PERIOD_STATUSES = ["A", "C", "I", "P", "N"] as const

export function timeToMinutes(value: string): number {
  const [h, m] = value.split(":").map(Number)
  return (h || 0) * 60 + (m || 0)
}

export const academicPeriodFormSchema = z
  .object({
    startDate: z.string().min(1, "La fecha de inicio es obligatoria"),
    endDate: z.string().min(1, "La fecha de finalización es obligatoria"),
    enrollmentDeadline: z.string().min(1, "La fecha límite de matrícula es obligatoria"),
    sedeId: z.string().min(1, "La sede es obligatoria"),
    previousPeriodId: z.number().int().positive().nullable(),
    statusId: z.number().int().positive("El estado es obligatorio"),
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
      z
        .object({
          startTime: z.string().min(1),
          endTime: z.string().min(1),
        })
        .refine((b) => !b.startTime || !b.endTime || timeToMinutes(b.startTime) < timeToMinutes(b.endTime), {
          message: "La hora de inicio del descanso es posterior o igual a la hora final",
          path: ["startTime"],
        }),
    ),
  })
  .refine((data) => !data.startDate || !data.endDate || data.startDate < data.endDate, {
    message: "La fecha de inicio es posterior o igual a la fecha de finalización",
    path: ["startDate"],
  })
  .refine(
    (data) =>
      !data.startDate || !data.enrollmentDeadline || data.enrollmentDeadline >= data.startDate,
    {
      message: "La fecha límite de matrícula debe ser posterior o igual a la fecha de inicio",
      path: ["enrollmentDeadline"],
    },
  )
  .refine(
    (data) => !data.endDate || !data.enrollmentDeadline || data.enrollmentDeadline <= data.endDate,
    {
      message: "La fecha límite de matrícula debe ser anterior o igual a la fecha de fin",
      path: ["enrollmentDeadline"],
    },
  )
  .refine(
    (data) =>
      !data.scheduleStartTime ||
      !data.scheduleEndTime ||
      timeToMinutes(data.scheduleStartTime) < timeToMinutes(data.scheduleEndTime),
    {
      message: "La hora de inicio es posterior o igual a la hora final",
      path: ["scheduleStartTime"],
    },
  )
  .refine(
    (data) =>
      data.breaks.every(
        (b) =>
          !b.startTime ||
          !data.scheduleStartTime ||
          timeToMinutes(b.startTime) >= timeToMinutes(data.scheduleStartTime),
      ),
    {
      message:
        "La hora de inicio del descanso debe ser posterior o igual a la hora de inicio de la jornada",
      path: ["breaks"],
    },
  )
  .refine(
    (data) =>
      data.breaks.every(
        (b) =>
          !b.endTime ||
          !data.scheduleEndTime ||
          timeToMinutes(b.endTime) <= timeToMinutes(data.scheduleEndTime),
      ),
    {
      message: "La hora final del descanso debe ser anterior o igual a la hora final de la jornada",
      path: ["breaks"],
    },
  )
  .refine(
    (data) =>
      data.breaks.every((b, i) => {
        if (!b.startTime || !b.endTime) return true
        return data.breaks.every((other, j) => {
          if (j >= i || !other.startTime || !other.endTime) return true
          return (
            timeToMinutes(b.startTime) >= timeToMinutes(other.endTime) ||
            timeToMinutes(b.endTime) <= timeToMinutes(other.startTime)
          )
        })
      }),
    {
      message: "Los descansos no pueden traslaparse entre sí",
      path: ["breaks"],
    },
  )
export type AcademicPeriodFormInput = z.input<typeof academicPeriodFormSchema>
export type AcademicPeriodFormValues = z.infer<typeof academicPeriodFormSchema>

export const academicPeriodsFiltersFormSchema = z.object({
  sedeName: z.string(),
  schoolYearId: z.string(),
  statusId: z.string(),
  startFrom: z.string(),
  startTo: z.string(),
})
export type AcademicPeriodsFiltersFormInput = z.input<typeof academicPeriodsFiltersFormSchema>
export type AcademicPeriodsFiltersFormValues = z.infer<typeof academicPeriodsFiltersFormSchema>

export const academicPeriodsSearchSchema = z.object({
  page: z.coerce.number().int().nonnegative().catch(0).default(0),
  pageSize: z.coerce.number().int().positive().catch(10).default(10),
  sortBy: z.string().optional().catch(undefined),
  sortDir: z.enum(["asc", "desc"]).optional().catch(undefined),
  sedeName: z.string().optional().catch(undefined),
  schoolYearId: z.coerce.number().optional().catch(undefined),
  statusId: z.coerce.number().optional().catch(undefined),
  startFrom: z.string().optional().catch(undefined),
  startTo: z.string().optional().catch(undefined),
})
export type AcademicPeriodsSearch = z.infer<typeof academicPeriodsSearchSchema>

// Área / Asignaturas
export const areaSubjectFormSchema = z.object({
  areaGeneral: z.string().min(1, "El área general es obligatoria"),
  nombreInterno: z
    .string()
    .min(1, "El nombre interno es obligatorio")
    .max(130, "El nombre no puede superar los 130 caracteres"),
  abreviacion: z
    .string()
    .min(1, "La abreviación es obligatoria")
    .max(30, "La abreviación no puede superar los 30 caracteres"),
  ordenReportes: z.number().int().nonnegative().max(9999, "No puede superar 9999"),
})
export type AreaSubjectFormValues = z.infer<typeof areaSubjectFormSchema>

// Grupos (grade-group)
// `codigo` viaja como NOMBRE del grupo (ver create/update-grade-group.ts) — el
// límite se restringe a 2 caracteres por requerimiento de negocio.
export const gradeGroupFormSchema = z.object({
  codigo: z
    .string()
    .min(1, "El grupo es obligatorio")
    .max(2, "El nombre del grupo no puede superar los 2 caracteres"),
  director: z.string(),
  metodologia: z.string(),
  cupo: z
    .number()
    .min(1, "El cupo debe ser mayor a 0")
    .max(99, "El cupo no puede superar 99"),
})
export type GradeGroupFormValues = z.infer<typeof gradeGroupFormSchema>

// Plan de estudio
export const studyPlanFormSchema = z.object({
  asignaturaId: z.number().min(1, "La asignatura es obligatoria"),
  intensidadHoraria: z
    .number()
    .min(1, "La intensidad horaria debe ser mayor a 0")
    .max(99, "La intensidad horaria no puede superar 99"),
  influenciaArea: z
    .number()
    .min(0, "La influencia en el área no puede ser negativa.")
    .max(100, "La influencia en el área no puede superar el 100%."),
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
      .string()
      .min(1, "El código es obligatorio")
      .max(30, "El código no puede superar los 30 caracteres"),
    nombre: z
      .string()
      .min(1, "El nombre es obligatorio")
      .max(130, "El nombre no puede superar los 130 caracteres")
      .refine((value) => value.trim().toLowerCase() !== "final", {
        message: "\"Final\" es un nombre reservado; usa otro para este período.",
      }),
    abreviacion: z
      .string()
      .min(1, "La abreviación es obligatoria")
      .max(30, "La abreviación no puede superar los 30 caracteres"),
    startDate: z.string().min(1, "La fecha de inicio es obligatoria"),
    endDate: z.string().min(1, "La fecha de fin es obligatoria"),
    peso: z
      .number({
        error: "El peso porcentual es obligatorio.",
      })
      .min(0, "El peso porcentual no puede ser negativo.")
      .max(100, "El peso porcentual no puede superar el 100%."),
    // Id del estado (PK_LISTA_VALOR); el código/etiqueta se resuelven por catálogo.
    estadoId: z.number().int().positive("El estado es obligatorio"),
  })
  .refine((data) => !data.startDate || !data.endDate || data.startDate < data.endDate, {
    message: "La fecha de inicio es posterior o igual a la fecha de finalización",
    path: ["startDate"],
  })
export type EvaluationPeriodFormValues = z.infer<typeof evaluationPeriodFormSchema>

// Criterios de evaluación
export const evaluationCriteriaSchema = z.object({
  gradingFormat: z.string().min(1, "Requerido"),
  gradingScale: z.string().optional(),
  periodCalculationElements: z.string().min(1, "Requerido"),
  subjectGradeCriteria: z.string().min(1, "Requerido"),
  finalGradeCriteria: z.string().min(1, "Requerido"),
  areaGradeCriteria: z.string().min(1, "Requerido"),
  studentWithoutGradesPerformance: z.string().min(1, "Requerido"),
  maxRecoveryGrade: z.number().min(0, "Debe ser mayor o igual a 0"),
  roundingMode: z.string().min(1, "Requerido"),
  initialGrade: z.number().min(0, "Debe ser mayor o igual a 0"),
})
export type EvaluationCriteriaValues = z.infer<typeof evaluationCriteriaSchema>

// Criterios de promoción
export const promotionApprovalSchema = z.object({
  curriculumNode: z.string().min(1, "Requerido"),

  maxFailedRecovery: z
    .number()
    .min(0, "El valor debe ser mayor o igual a 0")
    .max(99, "El valor no puede superar 99"),
  absencePercentage: z
    .number()
    .min(0, "El valor debe ser mayor o igual a 0")
    .max(100, "El valor no puede superar 100"),
  maxLeveledSubjects: z
    .number()
    .min(0, "El valor debe ser mayor o igual a 0")
    .max(999, "El valor no puede superar 999"),

  applyAverageApproval: z.boolean(),

  basePercentage: z.number().min(0, "El valor debe ser mayor o igual a 0"),
  minimumSubjectPercentage: z.number().min(0, "El valor debe ser mayor o igual a 0"),
  maxFailedForAverage: z
    .number()
    .min(0, "El valor debe ser mayor o igual a 0")
    .max(99, "El valor no puede superar 99"),

  requiredSubjects: z.array(z.number()),
})
export type PromotionApprovalValues = z.infer<typeof promotionApprovalSchema>
