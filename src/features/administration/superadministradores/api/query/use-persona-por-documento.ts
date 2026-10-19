import { useQuery } from "@tanstack/react-query"

import { env } from "@/config/env"
import { evalCol } from "@/lib/eval-col-client"

import { superadministradorKeys } from "@/features/administration/superadministradores/api/query-keys"

// Misma consulta que el autocompletado de Funcionarios y Matrícula
// (`fn_usu_autocompletar_por_documento`, GET /usuarios/autocompletar-por-documento).
interface PersonaRow {
  pk_tusuario: number
  primer_nombre: string
  segundo_nombre: string | null
  primer_apellido: string
  segundo_apellido: string | null
  correo_electronico: string | null
}

export interface PersonaExistente {
  pkUsuario: number
  primerNombre: string
  segundoNombre: string
  primerApellido: string
  segundoApellido: string
  correo: string
}

async function fetchPersona(tipo: number, numero: string): Promise<PersonaExistente | null> {
  // Sin handler MSW: con mocks no hay personas previas que encontrar.
  if (env.ENABLE_API_MOCKING) return null
  const qs = new URLSearchParams({ fkTlvTipoDocumento: String(tipo), identificacion: numero })
  const [row] = await evalCol.getRows<PersonaRow>(`/usuarios/autocompletar-por-documento?${qs}`)
  if (!row) return null
  return {
    pkUsuario: row.pk_tusuario,
    primerNombre: row.primer_nombre ?? "",
    segundoNombre: row.segundo_nombre ?? "",
    primerApellido: row.primer_apellido ?? "",
    segundoApellido: row.segundo_apellido ?? "",
    correo: row.correo_electronico ?? "",
  }
}

/**
 * Persona que ya existe en la plataforma con ese documento (p. ej. un
 * funcionario): el alta le suma el rol con su cuenta (una cuenta por persona,
 * Regla 24), así que el formulario toma sus datos. `null` si no existe.
 */
export function usePersonaPorDocumentoQuery(tipo: number, numero: string, enabled: boolean) {
  return useQuery({
    queryKey: superadministradorKeys.persona(tipo, numero),
    queryFn: () => fetchPersona(tipo, numero),
    enabled: enabled && tipo > 0 && numero.length >= 5,
    staleTime: 30_000,
  })
}
