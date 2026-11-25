import { env } from "@/config/env"
import { evalCol } from "@/lib/eval-col-client"

import type { CatalogItem } from "@/features/establishment/employees/api/types/catalog"
import type { PersonaPorDocumento } from "@/features/establishment/employees/api/types/funcionario"
import type { Person } from "@/features/establishment/employees/api/types/person"
import { toPersona, type PersonaRow } from "@/features/establishment/employees/api/query/use-persona-por-documento"

/**
 * Rector o secretaria que ya existe en la plataforma (Regla 11), por Tipo + Número de documento.
 * `GET /establecimientos/directivos/por-documento` (sso V574/V576) pide el permiso de gestionar
 * establecimientos, no el de Funcionarios: en el alta el establecimiento todavía no existe. Devuelve la
 * identidad completa y el correo y el teléfono ya enmascarados.
 */
export async function fetchDirectivoPorDocumento(
  documentTypeId: number,
  identification: string,
  establishmentId: number | null,
): Promise<PersonaPorDocumento | null> {
  // Con mocks no hay personas protegidas: se llena a mano.
  if (env.ENABLE_API_MOCKING) return null
  const numero = identification.trim()
  if (!documentTypeId || numero.length < 5) return null
  const query = new URLSearchParams({ tipoDocumento: String(documentTypeId), identificacion: numero })
  if (establishmentId != null) query.set("establecimiento", String(establishmentId))
  const [row] = await evalCol.getRows<PersonaRow>(`/establecimientos/directivos/por-documento?${query}`)
  return row ? toPersona(row) : null
}

/**
 * La persona encontrada, como la muestra el panel: protegida y en solo lectura. El correo y el teléfono
 * son los enmascarados (solo para verla); al guardar no se envía nada de su ficha. `id` es su funcionario
 * si ya lo es; si solo tiene cuenta (p. ej. acudiente), `accountEmail` es el correo con el que se le crea
 * el perfil de funcionario.
 */
export function toPersonaProtegida(persona: PersonaPorDocumento, documentType: CatalogItem | null): Person {
  return {
    id: persona.funcionarioId ?? undefined,
    documentType,
    identification: persona.identification,
    firstName: persona.firstName,
    middleName: persona.middleName,
    lastName: persona.lastName,
    secondLastName: persona.secondLastName,
    birthDate: persona.birthDate,
    gender: persona.genderId != null ? { id: persona.genderId, code: "", name: persona.genderName } : null,
    email: persona.emailProtected,
    phone: persona.phoneProtected,
    photoArchivoId: persona.photoArchivoId,
    accountExists: true,
    protegida: true,
    accountEmail: persona.accountEmail,
    datosRestringidos: persona.dataRestricted,
  }
}
