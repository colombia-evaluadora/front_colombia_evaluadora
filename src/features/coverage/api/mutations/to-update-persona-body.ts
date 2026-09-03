function toIntOrNull(value: string | undefined | null): number | null {
  if (!value) return null
  const parsed = Number(value)
  return Number.isNaN(parsed) ? null : parsed
}

function toTextOrNull(value: string | undefined | null): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

export interface UpdatePersonaBodyInput {
  documentTypeId?: string
  documentNumber?: string
  firstName?: string
  secondName?: string
  lastName?: string
  secondLastName?: string
  birthDate?: string
  genderId?: string
  phone?: string
  email?: string
}


export function toUpdatePersonaBody(input: UpdatePersonaBodyInput) {
  return {
    TIPO_DE_DOCUMENTO: toIntOrNull(input.documentTypeId),
    NUMERO_DE_DOCUMENTO: toTextOrNull(input.documentNumber),
    PRIMER_NOMBRE: toTextOrNull(input.firstName),
    SEGUNDO_NOMBRE: toTextOrNull(input.secondName),
    PRIMER_APELLIDO: toTextOrNull(input.lastName),
    SEGUNDO_APELLIDO: toTextOrNull(input.secondLastName),
    FECHA_DE_NACIMIENTO: toTextOrNull(input.birthDate),
    GENERO: toIntOrNull(input.genderId),
    TELEFONO: toTextOrNull(input.phone),
    CORREO_ELECTRONICO: toTextOrNull(input.email),
  }
}
