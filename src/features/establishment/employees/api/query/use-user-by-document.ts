import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import { unwrapRows } from "@/lib/response-envelope"

import type { Person } from "@/features/establishment/employees/api/types/person"

/** Fila cruda de TUSUARIO tal como la devuelve `fn_usu_buscar_por_documento`
 * (GET /usuarios/buscar-por-documento, SELECT * — sin alias). */
interface RealTusuarioRow {
  pk_tusuario: number
  identificacion: string
  primer_nombre: string
  segundo_nombre: string | null
  primer_apellido: string
  segundo_apellido: string | null
  fecha_nacimiento: string | null
  telefono: string | null
  correo_electronico: string | null
}

/**
 * Autocompletado del form de persona (rector/secretaria de establecimiento,
 * alta de funcionario): busca un TUSUARIO existente por (tipo de documento,
 * identificación) y devuelve un patch para volcar sobre `Person` — todo
 * menos `documentType`/`identification` (esos ya los escribió el usuario
 * para poder buscar) ni `password` (nunca viaja de vuelta, ni existe en
 * TUSUARIO).
 *
 * OJO: que la persona ya exista como TUSUARIO no la hace automáticamente
 * "creable" vía /register/funcionario con cualquier correo — ese endpoint
 * crea un `public.users` nuevo y falla con 409 si el correo ya está tomado
 * ahí (chequeo en Java, ver use-register-funcionario.ts). Si el correo que
 * se manda es distinto al que ya tiene, sí funciona de punta a punta:
 * `fn_fun_crear` (SQL) reusa el TUSUARIO por documento y solo crea el
 * TFUNCIONARIO nuevo. Este autocompletado es sobre todo para evitar
 * retipear datos ya conocidos.
 *
 * Solo corre contra el backend real: no hay endpoint de mock equivalente.
 */
export async function findPersonByDocument(
  documentTypeId: number,
  identification: string,
): Promise<Partial<Person> | null> {
  if (env.ENABLE_API_MOCKING) return null
  if (!documentTypeId || !identification.trim()) return null

  // El response interceptor de `api` ya desenvuelve `response.data` en
  // runtime (ver api-client.ts); el tipo de Axios no lo refleja, así que
  // se castea igual que en el resto de la app (p. ej. use-bulk-delete.ts).
  const response = (await api.get(
    "/eval-col/usuarios/buscar-por-documento",
    { params: { fkTlvTipoDocumento: documentTypeId, identificacion: identification } },
  )) as unknown as RealTusuarioRow[] | { rows: RealTusuarioRow[] }
  const rows = unwrapRows<RealTusuarioRow>(response)
  const row = rows[0]
  if (!row) return null

  return {
    firstName: row.primer_nombre,
    middleName: row.segundo_nombre ?? undefined,
    lastName: row.primer_apellido,
    secondLastName: row.segundo_apellido ?? undefined,
    birthDate: row.fecha_nacimiento ?? "",
    phone: row.telefono ?? "",
    email: row.correo_electronico ?? "",
  }
}
