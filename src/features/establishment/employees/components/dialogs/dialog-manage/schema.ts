import { z } from "zod"

import { optionalImageFile } from "@/lib/image-file"
import type { PermissionStatus } from "@/features/establishment/institution/api/types/permission"
import type { Person } from "@/features/establishment/employees/api/types/person"
import { validarFormatoPersona } from "@/features/establishment/shared/person-field-rules"

export interface PermissionDraft {
  order: string
  roleId: number | null
  campusId: number | null
  workScheduleId: number | null
  status: PermissionStatus | ""
}

// El orden se valida como texto: un `number` vacío llega como NaN y daría el mensaje de tipo.
export const permissionDraftSchema = z.object({
  order: z
    .string()
    .trim()
    .min(1, "Ingresa el orden.")
    .refine((value) => Number.isInteger(Number(value)) && Number(value) > 0, {
      message: "El orden debe ser un número entero mayor que cero.",
    }),
  // `custom` deja el resultado tipado sin castear.
  roleId: z.custom<number>((value) => typeof value === "number", {
    message: "Selecciona el rol.",
  }),
  campusId: z.custom<number>((value) => typeof value === "number", {
    message: "Selecciona la sede educativa.",
  }),
  workScheduleId: z.custom<number>((value) => typeof value === "number", {
    message: "Selecciona la jornada.",
  }),
  status: z.custom<PermissionStatus>((value) => typeof value === "string" && value !== "", {
    message: "Selecciona el estado.",
  }),
})

export const EMPLOYEE_FIELD_PREFIX = "employee"

export function createPermissionDraft(nextOrder = 1): PermissionDraft {
  return {
    order: String(nextOrder),
    roleId: null,
    campusId: null,
    workScheduleId: null,
    status: "",
  }
}

function isBlankValue(value: string | null | undefined): boolean {
  return value == null || value.trim() === ""
}

// Correo y género son obligatorios al crear: el backend los exige aunque el form no lleve asterisco.
const employeePersonSchema = z
  .object({
    person: z.custom<Person>(),
  })
  .superRefine(({ person }, ctx) => {
    const require = (path: string, value: string | null | undefined, message: string) => {
      if (isBlankValue(value)) {
        ctx.addIssue({ code: "custom", path: [path], message })
      }
    }

    if (!person.documentType?.id) {
      ctx.addIssue({ code: "custom", path: ["documentType"], message: "Selecciona el tipo de documento." })
    }
    require("identification", person.identification, "Ingresa el número de documento.")
    require("firstName", person.firstName, "Ingresa el primer nombre.")
    require("lastName", person.lastName, "Ingresa el primer apellido.")

    // Reglas compartidas con rector/secretaria.
    validarFormatoPersona(person, ctx)

    // Solo al crear (POST); el PUT tolera vacíos.
    if (!person.id) {
      require("email", person.email, "Ingresa el correo electrónico.")
      require("gender", person.gender?.name, "Selecciona el género.")
    }
  })

export function computePersonErrors(
  person: Person | null,
  photo?: File | null
): Record<string, string> {
  const nextErrors: Record<string, string> = {}

  const parsedPhoto = optionalImageFile.safeParse(photo)
  if (!parsedPhoto.success) {
    nextErrors[`${EMPLOYEE_FIELD_PREFIX}.photo`] =
      parsedPhoto.error.issues[0]?.message ?? "Archivo no válido."
  }

  if (!person) {
    return nextErrors
  }

  const parsed = employeePersonSchema.safeParse({ person })
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      nextErrors[`${EMPLOYEE_FIELD_PREFIX}.${issue.path.join(".")}`] ??= issue.message
    }
  }

  return nextErrors
}
