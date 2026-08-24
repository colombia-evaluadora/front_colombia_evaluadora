import { z } from "zod"

export const EDUCATION_LEVELS = [
  "PREESCOLAR",
  "BASICA_PRIMARIA",
  "BASICA_SECUNDARIA",
  "MEDIA",
] as const

export const SHIFTS = ["MANANA", "TARDE", "UNICA", "COMPLETA", "NOCTURNA"] as const

export const RESERVATION_STATUSES = ["confirmada", "pendiente", "vencida"] as const

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
export const reservationFiltersFormSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  documentNumber: z.string(),
  institution: z.string(),
  campus: z.string(),
  grade: z.string(),
  group: z.string(),
  shifts: z.array(z.enum(SHIFTS)),
  levels: z.array(z.enum(EDUCATION_LEVELS)),
  statuses: z.array(z.enum(RESERVATION_STATUSES)),
  // yyyy-MM-dd o yyyy-MM-dd'T'HH:mm — lo que emita el DatePicker.
  reservedFrom: z.string(),
  reservedTo: z.string(),
  groupBy: z.string(),
})
  /*
   * Los filtros no tienen campos obligatorios —filtrar por nada es válido—, así
   * que lo único que se valida es la coherencia del rango. La comparación es de
   * strings porque los dos formatos que emite el DatePicker (`yyyy-MM-dd` y
   * `yyyy-MM-dd'T'HH:mm`) son ISO, y ahí el orden lexicográfico coincide con el
   * cronológico. El issue se ancla en "hasta", que es el campo a mover.
   */
  .superRefine((value, ctx) => {
    if (value.reservedFrom && value.reservedTo && value.reservedTo < value.reservedFrom) {
      ctx.addIssue({
        code: "custom",
        path: ["reservedTo"],
        message: "La fecha final no puede ser anterior a la inicial.",
      })
    }
  })
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

// Inscripciones: mismos filtros que reservaciones.
export const enrollmentsSearchSchema = reservationsSearchSchema
export type EnrollmentsSearch = ReservationsSearch

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
