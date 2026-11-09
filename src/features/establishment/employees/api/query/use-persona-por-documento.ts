import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { employeeKeys } from "@/features/establishment/employees/api/query-keys"

import type { PersonaPorDocumento } from "@/features/establishment/employees/api/types/funcionario"

/** Fila de `fn_fun_por_documento` (V579.5): correo y teléfono ya enmascarados (Regla 11). */
interface PersonaRow {
  pk_tusuario: number
  pk_funcionario: number | null
  fk_tlv_tipo_documento: number
  identificacion: string
  primer_nombre: string
  segundo_nombre: string | null
  primer_apellido: string
  segundo_apellido: string | null
  fecha_nacimiento: string | null
  fk_tlv_genero: number | null
  genero_nombre: string | null
  correo_protegido: string | null
  telefono_protegido: string | null
  /** Correo real de una cuenta sin perfil de funcionario (V579.4), para registrarla; `null` si ya es funcionario. */
  correo_cuenta: string | null
  fk_tarchivo_foto: number | null
  vinculado: boolean
}

const toPersona = (row: PersonaRow): PersonaPorDocumento => ({
  userId: row.pk_tusuario,
  funcionarioId: row.pk_funcionario,
  documentTypeId: row.fk_tlv_tipo_documento,
  identification: row.identificacion,
  firstName: row.primer_nombre,
  middleName: row.segundo_nombre ?? "",
  lastName: row.primer_apellido,
  secondLastName: row.segundo_apellido ?? "",
  birthDate: row.fecha_nacimiento?.slice(0, 10) ?? "",
  genderId: row.fk_tlv_genero,
  genderName: row.genero_nombre ?? "",
  emailProtected: row.correo_protegido ?? "",
  phoneProtected: row.telefono_protegido ?? "",
  accountEmail: row.correo_cuenta || null,
  photoArchivoId: row.fk_tarchivo_foto,
  linked: row.vinculado === true,
})

async function fetchPersonaPorDocumento(
  establishmentId: number,
  documentTypeId: number,
  identification: string,
): Promise<PersonaPorDocumento | null> {
  const query = new URLSearchParams({
    establecimiento: String(establishmentId),
    tipoDocumento: String(documentTypeId),
    identificacion: identification,
  })
  const [row] = await evalCol.getRows<PersonaRow>(`/establecimientos/funcionarios/por-documento?${query}`)
  return row ? toPersona(row) : null
}

/**
 * Al agregar un funcionario se busca a la persona por Tipo + Número (Regla 11): si ya
 * existe, sus datos quedan protegidos. Solo con un número que ya cumple el mínimo.
 */
export function usePersonaPorDocumentoQuery(
  establishmentId: number | null,
  documentTypeId: number | null,
  identification: string,
  enabled: boolean,
) {
  const numero = identification.trim()
  return useQuery({
    queryKey: employeeKeys.porDocumento(establishmentId, documentTypeId, numero),
    queryFn: () => fetchPersonaPorDocumento(establishmentId as number, documentTypeId as number, numero),
    enabled: enabled && establishmentId != null && documentTypeId != null && numero.length >= 5,
    staleTime: 30_000,
  })
}
