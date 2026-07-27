import type { EstablishmentDetails } from "../api/types/establishment"
import type { Person } from "../api/types/person"

export interface EstablishmentFormValidationResult {
  errors: string[]
  invalidFields: string[]
}

function isBlank(value: string | null | undefined): boolean {
  return value == null || value.trim() === ""
}

function addError(errors: string[], invalidFields: Set<string>, field: string, message: string) {
  errors.push(message)
  invalidFields.add(field)
}

function validatePerson(
  person: Person | null,
  label: string,
  fieldPrefix: string,
  errors: string[],
  invalidFields: Set<string>
) {
  if (!person) {
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

  if (isBlank(person.birthDate)) {
    addError(errors, invalidFields, `${fieldPrefix}.birthDate`, `${label}: fecha de nacimiento`)
  }

  if (isBlank(person.gender?.name)) {
    addError(errors, invalidFields, `${fieldPrefix}.gender`, `${label}: género`)
  }

  if (isBlank(person.email)) {
    addError(errors, invalidFields, `${fieldPrefix}.email`, `${label}: correo electrónico`)
  }

  if (isBlank(person.phone)) {
    addError(errors, invalidFields, `${fieldPrefix}.phone`, `${label}: teléfono`)
  }

  if (isBlank(person.password)) {
    addError(errors, invalidFields, `${fieldPrefix}.password`, `${label}: contraseña`)
  }

  if (isBlank(person.confirmPassword)) {
    addError(errors, invalidFields, `${fieldPrefix}.confirmPassword`, "Confirmación de contraseña")
  }

  if (!isBlank(person.password) && !isBlank(person.confirmPassword) && person.password !== person.confirmPassword) {
    addError(errors, invalidFields, `${fieldPrefix}.confirmPassword`, "Confirmación de contraseña")
  }
}

export function validateEstablishmentForm(values: EstablishmentDetails): EstablishmentFormValidationResult {
  const errors: string[] = []
  const invalidFields = new Set<string>()

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

  if (isBlank(values.contact.email)) {
    addError(errors, invalidFields, "contact.email", "Correo electrónico")
  }

  if (isBlank(values.contact.phone)) {
    addError(errors, invalidFields, "contact.phone", "Teléfono")
  }

  if (isBlank(values.additionalInfo.approvalResolution)) {
    addError(errors, invalidFields, "additionalInfo.approvalResolution", "Resolución de aprobación")
  }

  if (isBlank(values.additionalInfo.teachingLanguage?.name)) {
    addError(errors, invalidFields, "additionalInfo.teachingLanguage", "Idioma de enseñanza")
  }

  if (isBlank(values.additionalInfo.calendar?.name)) {
    addError(errors, invalidFields, "additionalInfo.calendar", "Calendario")
  }

  if (isBlank(values.additionalInfo.costRegime?.name)) {
    addError(errors, invalidFields, "additionalInfo.costRegime", "Régimen de costo")
  }

  if (isBlank(values.additionalInfo.populationGender?.name)) {
    addError(errors, invalidFields, "additionalInfo.populationGender", "Género de población")
  }

  if (isBlank(values.additionalInfo.tuitionRange?.name)) {
    addError(errors, invalidFields, "additionalInfo.tuitionRange", "Rango de tarifa")
  }

  if (isBlank(values.additionalInfo.disabilityType?.name)) {
    addError(errors, invalidFields, "additionalInfo.disabilityType", "Tipo de discapacidad")
  }

  if (isBlank(values.additionalInfo.licenseStatus?.name)) {
    addError(errors, invalidFields, "additionalInfo.licenseStatus", "Estado del permiso")
  }

  validatePerson(values.principal, "Rector", "principal", errors, invalidFields)
  validatePerson(values.secretary, "Secretaria", "secretary", errors, invalidFields)

  return {
    errors,
    invalidFields: Array.from(invalidFields),
  }
}
