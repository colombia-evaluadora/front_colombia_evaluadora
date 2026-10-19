import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import { unwrapRows } from "@/lib/response-envelope"

// Misma fila cruda que ya usa "Permisos de funcionario"
// (`fn_usu_autocompletar_por_documento`, ver `use-user-by-document.ts`).
interface MatriculaUsuarioRow {
  pk_tusuario: number
  primer_nombre: string
  segundo_nombre: string | null
  primer_apellido: string
  segundo_apellido: string | null
  fecha_nacimiento: string | null
  fk_tlv_genero: number | null
  telefono: string | null
  correo_electronico: string | null
}

export interface MatriculaUsuarioAutocompletado {
  pkTusuario: number
  firstName: string
  secondName: string
  lastName: string
  secondLastName: string
  birthDate: string
  gender: string
  phone: string
  email: string
}

export async function findMatriculaUsuarioPorDocumento(
  documentTypeId: number,
  identification: string,
): Promise<MatriculaUsuarioAutocompletado | null> {
  if (env.ENABLE_API_MOCKING) return null
  if (!documentTypeId || !identification.trim()) return null

  const response = (await api.get("/eval-col/usuarios/autocompletar-por-documento", {
    params: { fkTlvTipoDocumento: documentTypeId, identificacion: identification },
  })) as unknown as MatriculaUsuarioRow[] | { rows: MatriculaUsuarioRow[] }
  const rows = unwrapRows<MatriculaUsuarioRow>(response)
  const row = rows[0]
  if (!row) return null

  return {
    pkTusuario: row.pk_tusuario,
    firstName: row.primer_nombre,
    secondName: row.segundo_nombre ?? "",
    lastName: row.primer_apellido,
    secondLastName: row.segundo_apellido ?? "",
    birthDate: row.fecha_nacimiento ?? "",
    gender: row.fk_tlv_genero != null ? String(row.fk_tlv_genero) : "",
    phone: row.telefono ?? "",
    email: row.correo_electronico ?? "",
  }
}
