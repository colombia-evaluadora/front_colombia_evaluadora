import { z } from "zod"

import { maxLength, required } from "@/lib/forms/messages"

export const ACADEMIC_PERIOD_STATUSES = ["A", "C", "I", "P", "N"] as const

export function timeToMinutes(value: string): number {
  const [h, m] = value.split(":").map(Number)
  return (h || 0) * 60 + (m || 0)
}

/** "HH:mm" un minuto después de `value`; null si ya es el último minuto del día. */
export function addOneMinute(value: string): string | null {
  const total = timeToMinutes(value) + 1
  if (total >= 24 * 60) return null
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`
}

/** Ciclos por modalidad de matrícula (Regla 14). */
export const ENROLLMENT_MODALITIES = [
  { value: "ANUAL", label: "Anual", cycles: 1 },
  { value: "SEMESTRAL", label: "Semestral", cycles: 2 },
  { value: "TRIMESTRAL", label: "Trimestral", cycles: 4 },
  { value: "BIMESTRAL", label: "Bimestral", cycles: 6 },
] as const

export function getModalityCycles(modality: string): number {
  return ENROLLMENT_MODALITIES.find((m) => m.value === modality)?.cycles ?? 1
}

export const recesoSchema = z.object({
  label: z
    .string()
    .trim()
    .min(4, "La etiqueta debe tener al menos 4 caracteres")
    .max(50, maxLength(50, "La etiqueta")),
  location: z.string().min(1, required("La ubicación", { femenino: true })),
  durationMinutes: z
    .number({ error: required("La duración", { femenino: true }) })
    .int()
    .min(1, "La duración debe ser de al menos 1 minuto")
    .nullable()
    .refine((v): v is number => v !== null, {
      message: required("La duración", { femenino: true }),
    }),
})

// Horario de la jornada o del grado (Reglas 28 y 87): Hora final posterior a la
// inicial y recesos bien ubicados. La comparten el período y el grado.
export function validateJornadaSchedule(
  data: {
    scheduleStartTime: string
    scheduleEndTime: string
    defaultBlocksCount: number | null
    breaks: { label: string; location: string; durationMinutes: number | null }[]
  },
  ctx: z.RefinementCtx,
) {
  const start = data.scheduleStartTime ? timeToMinutes(data.scheduleStartTime) : null
  const end = data.scheduleEndTime ? timeToMinutes(data.scheduleEndTime) : null
  if (start != null && end != null && end <= start) {
    ctx.addIssue({
      code: "custom",
      message: "La Hora final debe ser posterior a la Hora inicio.",
      path: ["scheduleEndTime"],
    })
  }
  // Recesos (Regla 28): ubicación única, que exista el bloque y que dejen
  // tiempo para las clases. El mensaje va en la fila del receso.
  const blocks = data.defaultBlocksCount
  const nameOf = (i: number) => data.breaks[i].label.trim() || `${i + 1}`
  data.breaks.forEach((b, i) => {
    if (!b.location) return
    const after = Number(b.location)
    if (blocks && Number.isInteger(after) && after > blocks) {
      ctx.addIssue({
        code: "custom",
        message: `El receso ${nameOf(i)} va después del bloque ${after}, pero la jornada tiene ${blocks} bloques. Corrija su ubicación.`,
        path: ["breaks", i, "location"],
      })
      return
    }
    const j = data.breaks.findIndex((o, k) => k < i && o.location === b.location)
    if (j !== -1) {
      ctx.addIssue({
        code: "custom",
        message: `Los recesos ${nameOf(j)} y ${nameOf(i)} tienen la misma ubicación.`,
        path: ["breaks", i, "location"],
      })
    }
  })
  const total = data.breaks.reduce((sum, b) => sum + (b.durationMinutes ?? 0), 0)
  if (start != null && end != null && end > start && total > 0 && total >= end - start) {
    ctx.addIssue({
      code: "custom",
      message: `Los recesos suman ${total} minutos y no dejan tiempo para los bloques de la jornada.`,
      path: ["breaks", data.breaks.length - 1, "durationMinutes"],
    })
  }
}

export const academicPeriodFormSchema = z
  .object({
    startDate: z.string().min(1, "La fecha de inicio es obligatoria"),
    endDate: z.string().min(1, "La fecha de finalización es obligatoria"),
    enrollmentDeadline: z.string().min(1, "La fecha límite de matrícula es obligatoria"),
    sedeId: z.string().min(1, "La sede es obligatoria"),
    previousPeriodId: z.number().int().positive().nullable(),
    // Lo calcula el sistema con las fechas (Regla 15); se conserva para el body.
    statusId: z.number().int(),
    jornadaId: z.number().int().positive("La jornada es obligatoria"),
    enrollmentModality: z.enum(["ANUAL", "SEMESTRAL", "TRIMESTRAL", "BIMESTRAL"]),
    cycle: z.number().int().positive("El ciclo es obligatorio"),
    reservationEnabled: z.boolean(),
    defaultBlocksCount: z
      .number()
      .int()
      .positive("El número de bloques es obligatorio")
      .max(20, "El número de bloques no puede superar 20")
      .nullable()
      .refine((v): v is number => v !== null, {
        message: "El número de bloques es obligatorio",
      }),
    scheduleStartTime: z.string().min(1, "La hora de inicio es obligatoria"),
    scheduleEndTime: z.string().min(1, "La hora final es obligatoria"),
    breaks: z.array(recesoSchema),
  })
  .superRefine((data, ctx) => {
    if (data.startDate && data.endDate && data.startDate >= data.endDate) {
      ctx.addIssue({
        code: "custom",
        message: "El Fin del período académico debe ser posterior al Inicio.",
        path: ["endDate"],
      })
    }
    if (data.endDate && data.enrollmentDeadline && data.enrollmentDeadline > data.endDate) {
      ctx.addIssue({
        code: "custom",
        message:
          "La Fecha límite de matrícula no puede ser posterior al Fin del período académico.",
        path: ["enrollmentDeadline"],
      })
    }
    if (data.cycle > getModalityCycles(data.enrollmentModality)) {
      ctx.addIssue({
        code: "custom",
        message: `La modalidad tiene ${getModalityCycles(data.enrollmentModality)} ciclo(s).`,
        path: ["cycle"],
      })
    }
    validateJornadaSchedule(data, ctx)
  })
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
  // Pestaña abierta de la configuración del período (p. ej. "grados" al volver de un grado).
  tab: z.string().optional().catch(undefined),
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
// Grupo del grado (Sección 5.3, Reglas 55, 56 y 108).
export const gradeGroupFormSchema = z.object({
  codigo: z.string().trim().min(1, required("El grupo")).max(20, maxLength(20, "El grupo")),
  directorId: z.number().nullable(),
  // Solo cuenta con un Responsable de grupo elegido.
  dictaTodas: z.boolean(),
  metodologia: z.string().min(1, required("La metodología", { femenino: true })),
  cupo: z
    .number({ error: "El Cupo debe ser de 1 a 99." })
    .int("El Cupo debe ser de 1 a 99.")
    .min(1, "El Cupo debe ser de 1 a 99.")
    .max(99, "El Cupo debe ser de 1 a 99."),
})
export type GradeGroupFormValues = z.infer<typeof gradeGroupFormSchema>

// Plan de estudio
// Asignatura del plan de estudio (Sección 5.3, Reglas 61, 64 a 66 y 76).
export const studyPlanFormSchema = z
  .object({
    asignaturaId: z.number().int().positive(required("La asignatura", { femenino: true })),
    intensidadHoraria: z
      .number({ error: "La intensidad horaria debe ser de 1 a 40." })
      .int("La intensidad horaria debe ser de 1 a 40.")
      .min(1, "La intensidad horaria debe ser de 1 a 40.")
      .max(40, "La intensidad horaria debe ser de 1 a 40."),
    influenciaArea: z
      .number({ error: "El porcentaje debe ser de 0 a 100." })
      .min(0, "El porcentaje debe ser de 0 a 100.")
      .max(100, "El porcentaje debe ser de 0 a 100."),
    numeroCreditos: z.number().min(0),
    influyeDesempeno: z.boolean(),
    matriculaObligatoria: z.boolean(),
    aprobacionObligatoria: z.boolean(),
    formatoCalificacion: z.string(),
    criterioNota: z.string(),
  })
  .superRefine((data, ctx) => {
    // Regla 66: sin Aprobación obligatoria no influye en el rendimiento.
    if (data.influyeDesempeno && !data.aprobacionObligatoria) {
      ctx.addIssue({
        code: "custom",
        message: "Con Aprobación obligatoria en No, Influye en el rendimiento académico queda en No.",
        path: ["influyeDesempeno"],
      })
    }
  })
export type StudyPlanFormValues = z.infer<typeof studyPlanFormSchema>

// Periodos de evaluación
export const evaluationPeriodFormSchema = z
  .object({
    // Sin campo de código: la abreviación hace de código del período (Sección 5.1).
    nombre: z
      .string()
      .trim()
      .min(1, required("El nombre"))
      .min(5, "El nombre debe tener entre 5 y 100 caracteres.")
      .max(100, maxLength(100, "El nombre"))
      .refine((value) => value.trim().toLowerCase() !== "final", {
        message: '"Final" es un nombre reservado; usa otro para este período.',
      }),
    abreviacion: z
      .string()
      .trim()
      .min(1, required("La abreviación", { femenino: true }))
      .min(3, "La abreviación debe tener entre 3 y 10 caracteres.")
      .max(10, maxLength(10, "La abreviación")),
    startDate: z.string().min(1, required("La fecha de inicio", { femenino: true })),
    endDate: z.string().min(1, required("La fecha de fin", { femenino: true })),
    peso: z
      .number({
        error: "El peso porcentual es obligatorio.",
      })
      .min(0, "El peso porcentual no puede ser negativo.")
      .max(100, "El peso porcentual no puede superar el 100 %."),
    // El estado no se elige: lo calcula el back con las fechas (Regla 37).
  })
  .refine((data) => !data.startDate || !data.endDate || data.startDate < data.endDate, {
    message: "La Fecha fin debe ser posterior a la Fecha inicio.",
    path: ["endDate"],
  })
export type EvaluationPeriodFormValues = z.infer<typeof evaluationPeriodFormSchema>

// Criterios de evaluación
// Criterios de evaluación (Sección 5.6, Reglas 45 y 48). Los rangos de notas
// dependen del Formato de calificación, así que se validan con `makeEvaluationCriteriaSchema`.
export const evaluationCriteriaSchema = z.object({
  gradingFormat: z.string().min(1, required("El formato de calificación")),
  gradingScale: z.string().optional(),
  periodCalculationElements: z.string().min(1, "Requerido"),
  subjectGradeCriteria: z.string().min(1, "Requerido"),
  finalGradeCriteria: z.string().min(1, "Requerido"),
  areaGradeCriteria: z.string().min(1, "Requerido"),
  studentWithoutGradesPerformance: z.string().min(1, "Requerido"),
  maxRecoveryGrade: z.number({
    error: required("La nota máxima de recuperación", { femenino: true }),
  }),
  roundingMode: z.string().min(1, required("La regla de redondeo", { femenino: true })),
  initialGrade: z.number({ error: required("La nota inicial", { femenino: true }) }),
  ratingScaleMode: z.string().min(1, required("La escala de valoración", { femenino: true })),
  recoveryMode: z.string().min(1, required("El modo de cálculo de recuperación")),
  recoveryPercentage: z.number().nullable(),
})

export function makeEvaluationCriteriaSchema(
  rangeOf: (gradingFormat: string) => { min: number; max: number },
  isWeighted: (recoveryMode: string) => boolean,
) {
  const fmt = (n: number) => n.toLocaleString("es-CO", { minimumFractionDigits: 1 })
  return evaluationCriteriaSchema.superRefine((data, ctx) => {
    const range = rangeOf(data.gradingFormat)
    const inRange = (n: number) => n >= range.min && n <= range.max
    const outOfRange = (nota: string) =>
      `La ${nota} debe estar entre ${fmt(range.min)} y ${fmt(range.max)} del Formato de calificación.`
    if (Number.isFinite(data.initialGrade) && !inRange(data.initialGrade)) {
      ctx.addIssue({ code: "custom", message: outOfRange("Nota inicial"), path: ["initialGrade"] })
    }
    if (Number.isFinite(data.maxRecoveryGrade)) {
      if (!inRange(data.maxRecoveryGrade)) {
        ctx.addIssue({
          code: "custom",
          message: outOfRange("Nota máxima de recuperación"),
          path: ["maxRecoveryGrade"],
        })
      } else if (data.maxRecoveryGrade < data.initialGrade) {
        ctx.addIssue({
          code: "custom",
          message: "La Nota máxima de recuperación no puede ser menor que la Nota inicial.",
          path: ["maxRecoveryGrade"],
        })
      }
    }
    if (isWeighted(data.recoveryMode)) {
      const p = data.recoveryPercentage
      if (p == null || !Number.isFinite(p)) {
        ctx.addIssue({
          code: "custom",
          message: required("El % de recuperación"),
          path: ["recoveryPercentage"],
        })
      } else if (p < 1 || p > 100) {
        ctx.addIssue({
          code: "custom",
          message: "El % de recuperación debe estar entre 1 y 100.",
          path: ["recoveryPercentage"],
        })
      }
    }
  })
}
export type EvaluationCriteriaValues = z.infer<typeof evaluationCriteriaSchema>

// Criterios de promoción
const percentSchema = z
  .number({ error: "El porcentaje es obligatorio" })
  .min(0, "El valor debe ser mayor o igual a 0")
  .max(100, "El valor no puede superar 100")

export const PROMOTION_REQUIREMENTS_MAX = 10

// Criterios de promoción (Sección 5.5, Reglas 38 a 41 y 105).
export const promotionApprovalSchema = z.object({
  curriculumNode: z.string().min(1, required("El nodo curricular")),
  maxFailedRecovery: z
    .number({ error: "La cantidad es obligatoria" })
    .int()
    .min(0, "El valor debe ser mayor o igual a 0")
    .max(20, "El valor no puede superar 20"),
  absencePercentage: percentSchema,
  maxLeveledSubjects: z.number(),
  applyAverageApproval: z.boolean(),
  basePercentage: percentSchema,
  minimumSubjectPercentage: percentSchema,
  maxFailedForAverage: z.number(),
  requiredSubjects: z.array(z.number()),
  complementaryRequired: z.boolean(),
  normRequirements: z.array(z.string()),
  ownRequirements: z
    .array(z.string().trim().min(3, "Mínimo 3 caracteres").max(80, maxLength(80, "El requisito")))
    .max(PROMOTION_REQUIREMENTS_MAX, `Máximo ${PROMOTION_REQUIREMENTS_MAX} requisitos`),
})

// Requisitos de grado de la norma (Regla 105). "Aprobar la formación de la
// matrícula complementaria" va aparte (REQUISITO_COMPLEMENTARIA).
export const NORM_REQUIREMENTS = [
  { code: "APROBAR_GRADO", label: "Aprobar el grado" },
  { code: "SERVICIO_SOCIAL", label: "Servicio social estudiantil obligatorio" },
  { code: "ESTUDIOS_CONSTITUCIONALES", label: "Estudios constitucionales" },
  { code: "SIN_AREAS_PENDIENTES", label: "Sin áreas pendientes de nivelación" },
] as const

export type PromotionApprovalValues = z.infer<typeof promotionApprovalSchema>

// Formulario del grado (Sección 5.3, Reglas 53, 54, 87 y 88). Con Personalizar
// horario en Sí se validan sus campos igual que el horario de la jornada.
export const gradeFormSchema = z
  .object({
    teachingLevelId: z.number().int().positive(required("El nivel de enseñanza")),
    nombre: z.string().min(1, required("El nombre")),
    tieneGradoSiguiente: z.boolean(),
    gradoSiguiente: z.string(),
    jornadasContinuidad: z.array(z.number()),
    personalizarHorario: z.boolean(),
    scheduleStartTime: z.string(),
    scheduleEndTime: z.string(),
    defaultBlocksCount: z.number().nullable(),
    breaks: z.array(recesoSchema),
  })
  .superRefine((data, ctx) => {
    if (data.tieneGradoSiguiente) {
      if (!data.gradoSiguiente) {
        ctx.addIssue({ code: "custom", message: required("El grado siguiente"), path: ["gradoSiguiente"] })
      } else if (data.gradoSiguiente === data.nombre) {
        ctx.addIssue({
          code: "custom",
          message: "El Grado siguiente no puede ser el mismo grado.",
          path: ["gradoSiguiente"],
        })
      }
      if (data.jornadasContinuidad.length === 0) {
        ctx.addIssue({
          code: "custom",
          message: "Elija al menos una jornada de continuidad.",
          path: ["jornadasContinuidad"],
        })
      }
    }
    if (!data.personalizarHorario) return
    if (!data.scheduleStartTime) {
      ctx.addIssue({ code: "custom", message: required("La hora inicio", { femenino: true }), path: ["scheduleStartTime"] })
    }
    if (!data.scheduleEndTime) {
      ctx.addIssue({ code: "custom", message: required("La hora final", { femenino: true }), path: ["scheduleEndTime"] })
    }
    const blocks = data.defaultBlocksCount
    if (blocks == null || !Number.isFinite(blocks) || blocks < 1 || blocks > 20) {
      ctx.addIssue({
        code: "custom",
        message: "El número de bloques debe ser de 1 a 20.",
        path: ["defaultBlocksCount"],
      })
    }
    validateJornadaSchedule(data, ctx)
  })
export type GradeFormValues = z.infer<typeof gradeFormSchema>
export type GradeFormInput = z.input<typeof gradeFormSchema>
