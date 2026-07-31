import type { EstablishmentDetails } from "../api/types/establishment"
import type { Person } from "../api/types/person"

export interface EstablishmentFormValidationResult {
  errors: string[]
  invalidFields: string[]
}

/**
 * Confirmaciones de contraseña que el formulario mantiene como estado de UI,
 * indexadas por el `fieldPrefix` de cada persona validada.
 */
export interface EstablishmentFormConfirmPasswords {
  [fieldPrefix: string]: string
}

function isBlank(value: string | null | undefined): boolean {
  return value == null || value.trim() === ""
}

function addError(errors: string[], invalidFields: Set<string>, field: string, message: string) {
  errors.push(message)
  invalidFields.add(field)
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
 * Si el usuario tocó al menos un campo de la persona, exigimos los 4 mínimos.
 * Si además escribió una contraseña, debe coincidir con la confirmación.
 */
function validatePerson(
  person: Person | null,
  label: string,
  fieldPrefix: string,
  confirmPassword: string,
  errors: string[],
  invalidFields: Set<string>
) {
  if (!person || isPersonEmpty(person)) {
    return
  }

  if (isBlank(person.documentType?.name)) {
    addError(errors, invalidFields, `${fieldPrefix}.documentType`, `${label}: tipo de documento`)
  }

  if (isBlank(person.identification)) {
    addError(errors, invalidFields, `${fieldPrefix}.identification`, `${label}: número de documento`)
  }

  if (isBlank(person.firstName)) {
    addError(errors, invalidFields, `${fieldPrefix}.firstName`, `${label}: primer nombre`)
  }

  if (isBlank(person.lastName)) {
    addError(errors, invalidFields, `${fieldPrefix}.lastName`, `${label}: primer apellido`)
  }

  // Contraseña: sólo se valida si escribió algo (en cualquiera de los dos campos).
  const hasPassword = !isBlank(person.password)
  const hasConfirm = !isBlank(confirmPassword)

  if (hasPassword || hasConfirm) {
    if (isBlank(person.password)) {
      addError(errors, invalidFields, `${fieldPrefix}.password`, `${label}: contraseña`)
    }

    if (isBlank(confirmPassword)) {
      addError(errors, invalidFields, `${fieldPrefix}.confirmPassword`, `${label}: confirmación de contraseña`)
    }

    if (hasPassword && hasConfirm && person.password !== confirmPassword) {
      addError(errors, invalidFields, `${fieldPrefix}.confirmPassword`, `${label}: las contraseñas no coinciden`)
    }
  }
}

export function validateEstablishmentForm(
  values: EstablishmentDetails,
  confirmPasswords: EstablishmentFormConfirmPasswords = {}
): EstablishmentFormValidationResult {
  const errors: string[] = []
  const invalidFields = new Set<string>()

  // === Campos obligatorios del establecimiento (asterisco en el formulario) ===
  if (isBlank(values.basicInfo.name)) {
    addError(errors, invalidFields, "basicInfo.name", "Nombre del establecimiento")
  }

  if (isBlank(values.basicInfo.dane)) {
    addError(errors, invalidFields, "basicInfo.dane", "Código DANE")
  }

  if (isBlank(values.basicInfo.nit)) {
    addError(errors, invalidFields, "basicInfo.nit", "NIT")
  }

  if (isBlank(values.basicInfo.ownershipType?.name)) {
    addError(errors, invalidFields, "basicInfo.ownershipType", "Propiedad jurídica")
  }

  if (isBlank(values.address.municipality?.name)) {
    addError(errors, invalidFields, "address.municipality", "Municipio")
  }

  // El resto del establecimiento (contacto, información complementaria, etc.)
  // pasa a ser opcional.

  validatePerson(
    values.principal,
    "Rector",
    "principal",
    confirmPasswords["principal"] ?? "",
    errors,
    invalidFields
  )
  validatePerson(
    values.secretary,
    "Secretaria",
    "secretary",
    confirmPasswords["secretary"] ?? "",
    errors,
    invalidFields
  )

  return {
    errors,
    invalidFields: Array.from(invalidFields),
  }
}

