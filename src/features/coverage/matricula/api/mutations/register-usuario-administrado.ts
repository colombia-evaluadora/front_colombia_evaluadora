import { api } from "@/lib/api-client"
import { unwrapRow } from "@/lib/response-envelope"

export interface RegisterUsuarioAdministradoInput {
  documentTypeId: number
  documentNumber: string
  gradoId: number
  firstName: string
  secondName?: string
  lastName: string
  secondLastName?: string
  genderId: number
  birthDate?: string
}

export interface RegisterUsuarioAdministradoResult {
  pkTusuario: number
}

export async function registerUsuarioAdministrado(
  input: RegisterUsuarioAdministradoInput,
): Promise<RegisterUsuarioAdministradoResult> {
  const raw = await api.post<{ rows: { pk_tusuario: number }[] } | { pk_tusuario: number }>(
    "/eval-col/cobertura-academica/usuario-administrado",
    {
      TIPO_DE_DOCUMENTO_DEL_ESTUDIANTE: input.documentTypeId,
      DOCUMENTO_ESTUDIANTE: input.documentNumber,
      GRADO: input.gradoId,
      NOMBRE_DEL_ESTUDIANTE: input.firstName,
      SEGUNDO_NOMBRE_DEL_ESTUDIANTE: input.secondName || undefined,
      PRIMER_APELLIDO_DEL_ESTUDIANTE: input.lastName,
      SEGUNDO_APELLIDO_DEL_ESTUDIANTE: input.secondLastName || undefined,
      GENERO_DEL_ESTUDIANTE: input.genderId,
      FECHA_DE_NACIMIENTO: input.birthDate || undefined,
    },
  )
  return { pkTusuario: unwrapRow(raw).pk_tusuario }
}
