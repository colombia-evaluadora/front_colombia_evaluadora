import { api } from "@/lib/api-client"

export interface RegisterMatriculaPersonaInput {
  documentTypeId: number
  documentNumber: string
  firstName: string
  secondName?: string
  lastName: string
  secondLastName?: string
  birthDate?: string
  genderId?: number
  phone?: string
  email?: string
}

export interface RegisterMatriculaPersonaResult {
  idUser: number
  pkTusuario: number
  pkFuncionario: number | null
  email: string
}

// Los inputs de nombre viajan en mayúscula sostenida ("JOSE") -- la
// contraseña temporal quiere Capitalizado ("Jose"), no el nombre tal cual.
function capitalizeFirstName(name: string): string {
  const trimmed = name.trim().toLowerCase()
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}

export function registerMatriculaPersona(
  input: RegisterMatriculaPersonaInput,
): Promise<RegisterMatriculaPersonaResult> {
  const fullName = [input.firstName, input.secondName, input.lastName, input.secondLastName]
    .filter(Boolean)
    .join(" ")

  return api.post("/auth/register/usuario", {
    email: input.email || undefined,
    fullName,
    password: `${capitalizeFirstName(input.firstName)}${input.documentNumber}.`,
    identificacion: input.documentNumber,
    primerNombre: input.firstName,
    segundoNombre: input.secondName || undefined,
    primerApellido: input.lastName,
    segundoApellido: input.secondLastName || undefined,
    fechaNacimiento: input.birthDate || undefined,
    fkTlvTipoDocumento: input.documentTypeId,
    fkTlvGenero: input.genderId,
    telefono: input.phone || undefined,
    correoElectronico: input.email || undefined,
  })
}
