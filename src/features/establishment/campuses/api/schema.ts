import { z } from "zod"

import { maxLength, minLength, required } from "@/lib/forms/messages"
import { TELEFONO, MENSAJES } from "@/features/establishment/shared/person-field-rules"
import {
  validarDireccion,
  validarLugar,
  validarNombreEstablecimiento,
} from "@/features/establishment/shared/text-field-rules"

export const campusFiltersFormSchema = z.object({
  search: z.string(),
  establishments: z.array(z.string()),
  zones: z.array(z.string()),
  workSchedules: z.array(z.string()),
  statuses: z.array(z.string()),
})

export type CampusFiltersFormInput = z.input<typeof campusFiltersFormSchema>

export type CampusFiltersFormValues = z.infer<typeof campusFiltersFormSchema>

export const campusesSearchSchema = z.object({
  page: z.coerce.number().int().nonnegative().catch(0).default(0),
  pageSize: z.coerce.number().int().positive().catch(10).default(10),
  sortBy: z.string().optional().catch(undefined),
  sortDir: z.enum(["asc", "desc"]).optional().catch(undefined),
  search: z.string().optional().catch(undefined),
  /** PK de los establecimientos, como texto (la URL no distingue). */
  establishments: z.array(z.string()).optional().catch(undefined),
  /** `VALOR` de la lista ZONA. */
  zones: z.array(z.string()).optional().catch(undefined),
  /** `VALOR` de la lista JORNADA. */
  workSchedules: z.array(z.string()).optional().catch(undefined),
  /** A / I. */
  statuses: z.array(z.string()).optional().catch(undefined),
})

export type CampusesSearch = z.infer<typeof campusesSearchSchema>

/** Regla de `text-field-rules` (mensaje o `null`) sobre un opcional: vacío no se valida. */
function regla(check: (value: string) => string | null) {
  return z.string().superRefine((value, ctx) => {
    if (!value.trim()) return
    const message = check(value)
    if (message) ctx.addIssue({ code: "custom", message })
  })
}

/** Rango de largo de un opcional (informe de diseño, 3.1). */
function largo(min: number, max: number, subject: string) {
  return z.string().superRefine((value, ctx) => {
    const length = value.trim().length
    if (length === 0) return
    if (length < min) ctx.addIssue({ code: "custom", message: minLength(min, subject) })
    else if (length > max) ctx.addIssue({ code: "custom", message: maxLength(max, subject) })
  })
}

type TextoSede = "name" | "dane" | "neighborhood" | "commune" | "address" | "phone"

/**
 * Al editar, un dato que no cambió no se vuelve a validar: las sedes viejas
 * pueden tener un DANE de 8 dígitos o un teléfono con espacios, y se
 * conservan hasta que alguien los edite (igual que el SSO, que valida solo
 * lo que cambia). Se valida con `schema`, pero solo si difiere de `original`.
 */
function siCambia(schema: z.ZodType<string>, original: string | undefined) {
  return z.string().superRefine((value, ctx) => {
    if (original !== undefined && value.trim() === original.trim()) return
    const result = schema.safeParse(value)
    if (!result.success) ctx.addIssue({ code: "custom", message: result.error.issues[0].message })
  })
}

/**
 * Formulario de la sede. En la principal, nombre, DANE y domicilio vienen
 * del establecimiento y no se validan acá (`principal`); el consecutivo es 1.
 * `original` son los valores guardados (al editar).
 */
export function buildCampusFormSchema({
  principal,
  original,
}: {
  principal: boolean
  original?: Partial<Record<TextoSede, string>>
}) {
  const texto = (key: TextoSede, schema: z.ZodType<string>) => (principal ? z.string() : siCambia(schema, original?.[key]))
  return z.object({
    establishmentId: z.number({ message: required("El establecimiento") }).nullable().refine((v) => v != null, {
      message: required("El establecimiento"),
    }),
    consecutive: principal
      ? z.string()
      : z
          .string()
          .trim()
          .min(1, { message: required("El consecutivo"), abort: true })
          .refine((v) => /^\d{1,2}$/.test(v) && Number(v) >= 2 && Number(v) <= 99, {
            message: "El consecutivo debe ser un número entre 2 y 99; el 1 es de la sede principal.",
          }),
    name: texto(
      "name",
      z
        .string()
        .trim()
        .min(1, { message: required("El nombre de la sede"), abort: true })
        .min(3, minLength(3, "El nombre de la sede"))
        .max(150, maxLength(150, "El nombre de la sede"))
        .superRefine((value, ctx) => {
          const message = validarNombreEstablecimiento(value)
          if (message) ctx.addIssue({ code: "custom", message })
        }),
    ),
    dane: texto(
      "dane",
      z
        .string()
        .trim()
        .min(1, { message: required("El código DANE antiguo"), abort: true })
        .regex(/^\d{12}$/, "El código DANE antiguo debe tener exactamente 12 dígitos."),
    ),
    zoneId: z.number().nullable().refine((v) => v != null, { message: required("La zona", { femenino: true }) }),
    neighborhood: texto("neighborhood", largo(5, 100, "El barrio").pipe(regla((v) => validarLugar(v, "El barrio")))),
    commune: texto("commune", largo(1, 50, "La comuna").pipe(regla((v) => validarLugar(v, "La comuna")))),
    address: texto("address", largo(8, 150, "La dirección").pipe(regla(validarDireccion))),
    phone: texto(
      "phone",
      z.string().refine((v) => !v.trim() || TELEFONO.test(v.trim()), { message: MENSAJES.telefono }),
    ),
    workScheduleIds: z.array(z.number()).min(1, "Seleccione al menos una jornada."),
  })
}

/** Nombre de una sede comparable: sin espacios de más ni diferencias de mayúsculas. */
export function normalizeCampusName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase("es")
}

/** Si otra sede del establecimiento ya se llama igual (Regla 52: se advierte, no se bloquea). */
export function hasRepeatedName(
  name: string,
  campuses: { id: number; name: string }[],
  ownId: number | null,
): boolean {
  const target = normalizeCampusName(name)
  return target.length > 0 && campuses.some((c) => c.id !== ownId && normalizeCampusName(c.name) === target)
}

export const campusSpecialtySchema = z
  .object({
    characterId: z.number().nullable().refine((v) => v != null, { message: required("El carácter") }),
    specialtyId: z.number().nullable().refine((v) => v != null, { message: required("La especialidad", { femenino: true }) }),
    ownName: z.string(),
    status: z.enum(["A", "I"]),
    /** Solo para validar: si la especialidad elegida es "Otra". */
    isOther: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if (!value.isOther) return
    const length = value.ownName.trim().length
    if (length === 0) ctx.addIssue({ code: "custom", path: ["ownName"], message: required("El nombre propio") })
    else if (length < 3) ctx.addIssue({ code: "custom", path: ["ownName"], message: minLength(3, "El nombre propio") })
    else if (length > 100) ctx.addIssue({ code: "custom", path: ["ownName"], message: maxLength(100, "El nombre propio") })
  })
