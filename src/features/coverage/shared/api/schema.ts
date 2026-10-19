import { z } from "zod"

export const EDUCATION_LEVELS = [
  "PREESCOLAR",
  "BASICA_PRIMARIA",
  "BASICA_SECUNDARIA",
  "MEDIA",
] as const

export const SHIFTS = ["MANANA", "TARDE", "UNICA", "COMPLETA", "NOCTURNA"] as const

export const RESERVATION_STATUSES = ["confirmada", "pendiente", "vencida"] as const

export const ENROLLMENT_STATUSES = ["sin_asignar_cupo", "cupo_asignado"] as const

export const RESERVATION_GROUP_BY = [
  "institution",
  "campus",
  "grade",
  "group",
  "shift",
  "educationLevel",
] as const

// Filtros del sheet. Todo string/array para que el form y la URL serialicen
// igual (mismo criterio que `auditFiltersFormSchema`); `grade` y `groupBy`
// se convierten a su tipo real recién en `useReservationFilters`.
const baseFiltersFormShape = {
  firstName: z.string(),
  lastName: z.string(),
  documentNumber: z.string(),
  institution: z.string(),
  campus: z.string(),
  grade: z.string(),
  group: z.string(),
  shifts: z.array(z.enum(SHIFTS)),
  levels: z.array(z.enum(EDUCATION_LEVELS)),
  // yyyy-MM-dd o yyyy-MM-dd'T'HH:mm — lo que emita el DatePicker.
  reservedFrom: z.string(),
  reservedTo: z.string(),
  groupBy: z.string(),
}

/*
 * Los filtros no tienen campos obligatorios —filtrar por nada es válido—, así
 * que lo único que se valida es la coherencia del rango. La comparación es de
 * strings porque los dos formatos que emite el DatePicker (`yyyy-MM-dd` y
 * `yyyy-MM-dd'T'HH:mm`) son ISO, y ahí el orden lexicográfico coincide con el
 * cronológico. El issue se ancla en "hasta", que es el campo a mover.
 */
function validateDateRange(value: { reservedFrom: string; reservedTo: string }, ctx: z.RefinementCtx) {
  if (value.reservedFrom && value.reservedTo && value.reservedTo < value.reservedFrom) {
    ctx.addIssue({
      code: "custom",
      path: ["reservedTo"],
      message: "La fecha final no puede ser anterior a la inicial.",
    })
  }
}

export const reservationFiltersFormSchema = z
  .object({ ...baseFiltersFormShape, statuses: z.array(z.enum(RESERVATION_STATUSES)) })
  .superRefine(validateDateRange)
export type ReservationFiltersFormInput = z.input<typeof reservationFiltersFormSchema>
export type ReservationFiltersFormValues = z.infer<typeof reservationFiltersFormSchema>

export const reservationsSearchSchema = z.object({
  page: z.coerce.number().int().nonnegative().catch(0).default(0),
  pageSize: z.coerce.number().int().positive().catch(10).default(10),
  sortBy: z.string().optional().catch(undefined),
  sortDir: z.enum(["asc", "desc"]).optional().catch(undefined),
  firstName: z.string().optional().catch(undefined),
  lastName: z.string().optional().catch(undefined),
  documentNumber: z.string().optional().catch(undefined),
  institution: z.string().optional().catch(undefined),
  campus: z.string().optional().catch(undefined),
  grade: z.coerce.number().int().min(0).max(11).optional().catch(undefined),
  group: z.string().optional().catch(undefined),
  shifts: z.array(z.enum(SHIFTS)).optional().catch(undefined),
  levels: z.array(z.enum(EDUCATION_LEVELS)).optional().catch(undefined),
  statuses: z.array(z.enum(RESERVATION_STATUSES)).optional().catch(undefined),
  reservedFrom: z.string().optional().catch(undefined),
  reservedTo: z.string().optional().catch(undefined),
  groupBy: z.enum(RESERVATION_GROUP_BY).optional().catch(undefined),
})
export type ReservationsSearch = z.infer<typeof reservationsSearchSchema>

// Pre-matrícula: mismos filtros que reservaciones (misma lógica de búsqueda).
export const preMatriculaSearchSchema = reservationsSearchSchema
export type PreMatriculaSearch = ReservationsSearch

// Inscripciones: misma forma que reservaciones, pero con su propio catálogo
// de estados -- el "estado" de una inscripción es el del estudiante (sin
// asignar cupo / cupo asignado), no el de una reserva.
export const enrollmentFiltersFormSchema = z
  .object({ ...baseFiltersFormShape, statuses: z.array(z.enum(ENROLLMENT_STATUSES)) })
  .superRefine(validateDateRange)
export type EnrollmentFiltersFormInput = z.input<typeof enrollmentFiltersFormSchema>
export type EnrollmentFiltersFormValues = z.infer<typeof enrollmentFiltersFormSchema>

export const enrollmentsSearchSchema = reservationsSearchSchema.extend({
  statuses: z.array(z.enum(ENROLLMENT_STATUSES)).optional().catch(undefined),
})
export type EnrollmentsSearch = z.infer<typeof enrollmentsSearchSchema>

// Alta de reserva ("Realizar reserva"). Acá sí validamos de verdad: el
// formulario lo usa como `onSubmit` validator de TanStack Form.
export const createReservationFormSchema = z.object({
  documentNumber: z
    .string()
    .min(6, "Mínimo 6 dígitos.")
    .max(12, "Máximo 12 dígitos.")
    .regex(/^\d+$/, "Solo números."),
  firstName: z.string().trim().min(1, "Requerido."),
  lastName: z.string().trim().min(1, "Requerido."),
  institution: z.string().trim().min(1, "Requerido."),
  campus: z.string().trim().min(1, "Requerido."),
  grade: z.string().min(1, "Requerido."),
  group: z.string().trim().min(1, "Requerido."),
  shift: z.enum(SHIFTS, { message: "Requerido." }),
  educationLevel: z.enum(EDUCATION_LEVELS, { message: "Requerido." }),
})
export type CreateReservationFormInput = z.input<typeof createReservationFormSchema>
export type CreateReservationFormValues = z.infer<typeof createReservationFormSchema>

// ── Matrícula ────────────────────────────────────────────────────────────────

// Filtros del buscador: mismo criterio que `establishmentFiltersFormSchema`
// (texto libre + estado, todo string/array para que el form y la URL
// serialicen igual). El valor de `statuses` es el `code` (`valor` de
// TLISTA_VALOR ESTADO_MATRICULA, ver `use-matricula-status-options.ts`), no
// un enum fijo -- así el filtro no se desincroniza si el catálogo real suma
// un estado nuevo. Sede/Jornada/Grado/Grupo son la misma cascada que
// "Modificar" (ver `dialog-modificar-matricula.tsx`): strings vacíos cuando
// no se eligió, para que el form y la URL serialicen igual que el resto.
export const matriculaFiltersFormSchema = z.object({
  search: z.string(),
  statuses: z.array(z.string()),
  campus: z.string(),
  // No es el `Shift` de reservas — la Jornada de matrícula sale del catálogo
  // de `TLISTA_VALOR` (ver `types/matricula.ts`), sin un conjunto fijo.
  shift: z.string(),
  grade: z.string(),
  group: z.string(),
})
export type MatriculaFiltersFormInput = z.input<typeof matriculaFiltersFormSchema>
export type MatriculaFiltersFormValues = z.infer<typeof matriculaFiltersFormSchema>

export const matriculaSearchSchema = z.object({
  page: z.coerce.number().int().nonnegative().catch(0).default(0),
  pageSize: z.coerce.number().int().positive().catch(10).default(10),
  sortBy: z.string().optional().catch(undefined),
  sortDir: z.enum(["asc", "desc"]).optional().catch(undefined),
  search: z.string().optional().catch(undefined),
  statuses: z.array(z.string()).optional().catch(undefined),
  campus: z.string().optional().catch(undefined),
  shift: z.string().optional().catch(undefined),
  grade: z.coerce.number().optional().catch(undefined),
  group: z.string().optional().catch(undefined),
})
export type MatriculaSearch = z.infer<typeof matriculaSearchSchema>

// El alta de estudiante ("Agregar estudiante") no usa este schema: son
// demasiados campos (~70) para validar uno a uno con Zod/TanStack Form, así
// que sigue el mismo criterio que el detalle de pre-matrícula (estado plano
// + validación mínima a mano). Ver `add-matricula-page.tsx`.
