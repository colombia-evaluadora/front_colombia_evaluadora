import { z } from "zod"

import type { EstablishmentDetails } from "@/features/establishment/institution/api/types/establishment"
import type { Person } from "@/features/establishment/employees/api/types/person"

export interface EstablishmentFormValidationResult {
  /** Etiquetas de los campos que fallaron, en el orden en que se validan. */
  errors: string[]
  /** Rutas de los campos que fallaron (`basicInfo.name`, `principal.password`, …). */
  invalidFields: string[]
  /**
   * Mensaje a mostrar debajo de cada campo, indexado por su ruta. Es lo que
   * consumen los formularios; `errors` e `invalidFields` se derivan de acá.
   */
  fieldErrors: Record<string, string>
}

/**
 * Confirmaciones de contraseña que el formulario mantiene como estado de UI,
 * indexadas por el `fieldPrefix` de cada persona validada.
 */
export interface EstablishmentFormConfirmPasswords {
  [fieldPrefix: string]: string
}

/** Texto obligatorio: se ignora el relleno de espacios. */
function requiredText(message: string) {
  return z
    .string()
    .transform((value) => value?.trim() ?? "")
    .refine((value) => value !== "", { message })
}

/**
 * Ítem de catálogo obligatorio. El `select` guarda el objeto completo, así que
 * lo que se exige es que tenga nombre; el issue queda en la ruta del ítem
 * (`basicInfo.ownershipType`) y no en `…ownershipType.name`, que es la ruta que
 * el formulario usa para marcar el campo.
 */
function requiredCatalogItem(message: string) {
  return z
    .object({ name: z.string().nullish() })
    .nullish()
    .refine((item) => (item?.name ?? "").trim() !== "", { message })
}

const establishmentSchema = z.object({
  basicInfo: z.object({
    name: requiredText("Ingresa el nombre del establecimiento."),
    dane: requiredText("Ingresa el código DANE."),
    nit: requiredText("Ingresa el NIT."),
    ownershipType: requiredCatalogItem("Selecciona la propiedad jurídica."),
  }),
  address: z.object({
    municipality: requiredCatalogItem("Selecciona el municipio."),
  }),
})

/** Etiqueta para el resumen, por ruta de campo del establecimiento. */
const ESTABLISHMENT_LABELS: Record<string, string> = {
  "basicInfo.name": "Nombre del establecimiento",
  "basicInfo.dane": "Código DANE",
  "basicInfo.nit": "NIT",
  "basicInfo.ownershipType": "Propiedad jurídica",
  "address.municipality": "Municipio",
}

/** Etiqueta para el resumen, por campo de persona (se prefija con el rol). */
const PERSON_LABELS: Record<string, string> = {
  documentType: "tipo de documento",
  identification: "número de documento",
  firstName: "primer nombre",
  lastName: "primer apellido",
  password: "contraseña",
  confirmPassword: "confirmación de contraseña",
}

function isBlank(value: string | null | undefined): boolean {
  return value == null || value.trim() === ""
}

/**
 * Una `Person` se considera "vacía" cuando los 4 campos mínimos están vacíos.
 * En ese caso no se exige nada (la persona puede no existir).
 */
function isPersonEmpty(person: Person | null): boolean {
  if (!person) {
    return true
  }

  return (
    isBlank(person.documentType?.name) &&
    isBlank(person.identification) &&
    isBlank(person.firstName) &&
    isBlank(person.lastName)
  )
}

/**
 * Persona con reglas condicionales, por eso va en un `superRefine` y no en un
 * `object` plano: los 4 mínimos solo se exigen si la persona fue tocada, y la
 * contraseña solo si se escribió en alguno de los dos campos.
 */
const personSchema = z
  .object({
    person: z.custom<Person | null>(),
    confirmPassword: z.string(),
  })
  .superRefine(({ person, confirmPassword }, ctx) => {
    if (!person || isPersonEmpty(person)) {
      return
    }

    const require = (path: string, value: string | null | undefined, message: string) => {
      if (isBlank(value)) {
        ctx.addIssue({ code: "custom", path: [path], message })
      }
    }

    require("documentType", person.documentType?.name, "Selecciona el tipo de documento.")
    require("identification", person.identification, "Ingresa el número de documento.")
    require("firstName", person.firstName, "Ingresa el primer nombre.")
    require("lastName", person.lastName, "Ingresa el primer apellido.")

    // Contraseña: sólo se valida si escribió algo (en cualquiera de los dos campos).
    const hasPassword = !isBlank(person.password)
    const hasConfirm = !isBlank(confirmPassword)

    if (!hasPassword && !hasConfirm) {
      return
    }

    require("password", person.password, "Ingresa la contraseña.")
    require("confirmPassword", confirmPassword, "Repite la contraseña.")

    if (hasPassword && hasConfirm && person.password !== confirmPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Las contraseñas no coinciden.",
      })
    }
  })

export function validateEstablishmentForm(
  values: EstablishmentDetails,
  confirmPasswords: EstablishmentFormConfirmPasswords = {}
): EstablishmentFormValidationResult {
  const errors: string[] = []
  const fieldErrors: Record<string, string> = {}

  // Primer mensaje por campo: el resto se descarta porque debajo del input solo
  // cabe una línea, y la primera regla que falla es la más específica.
  const collect = (path: string, message: string, label: string) => {
    if (fieldErrors[path] != null) {
      return
    }

    fieldErrors[path] = message
    errors.push(label)
  }

  const establishment = establishmentSchema.safeParse(values)
  if (!establishment.success) {
    // Se recorren las rutas conocidas y no `error.issues` para que el resumen
    // conserve el orden del formulario, sin depender del de Zod.
    for (const [path, label] of Object.entries(ESTABLISHMENT_LABELS)) {
      const issue = establishment.error.issues.find((item) => item.path.join(".") === path)
      if (issue) {
        collect(path, issue.message, label)
      }
    }
  }

  for (const [fieldPrefix, label] of [
    ["principal", "Rector"],
    ["secretary", "Secretaria"],
  ] as const) {
    const person = values[fieldPrefix]
    const result = personSchema.safeParse({
      person,
      confirmPassword: confirmPasswords[fieldPrefix] ?? "",
    })

    if (result.success) {
      continue
    }

    for (const [field, fieldLabel] of Object.entries(PERSON_LABELS)) {
      const issue = result.error.issues.find((item) => item.path.join(".") === field)
      if (issue) {
        collect(`${fieldPrefix}.${field}`, issue.message, `${label}: ${fieldLabel}`)
      }
    }

    // "No coinciden" reemplaza al mensaje de campo vacío cuando ambos tienen
    // contenido, así que se busca aparte para que el resumen lo refleje.
    const mismatch = result.error.issues.find(
      (item) => item.path.join(".") === "confirmPassword" && item.message.includes("no coinciden")
    )
    if (mismatch && !errors.includes(`${label}: las contraseñas no coinciden`)) {
      fieldErrors[`${fieldPrefix}.confirmPassword`] = mismatch.message
      errors.push(`${label}: las contraseñas no coinciden`)
    }
  }

  return {
    errors,
    invalidFields: Object.keys(fieldErrors),
    fieldErrors,
  }
}
