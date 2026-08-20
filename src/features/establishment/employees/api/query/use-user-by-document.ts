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
 * REV: el patch trae `accountExists: true` — es la señal que usa
 * `UserDetailsForm` para bloquear el campo de contraseña (con puntitos, sin
 * poder tocarlo) en vez de seguir pidiéndola como si la persona fuera
 * nueva. Antes esto no se distinguía de un alta genuina, así que el form
 * exigía una contraseña igual, aunque el backend (`FuncionarioRegistration
 * Service`, REV V71) ya reconoce y reutiliza la cuenta existente por
 * documento/correo sin necesitar ninguna contraseña nueva — el usuario
 * queda ligado siendo el mismo, no se le cambia el login.
 *
 * `fn_fun_crear` (SQL) reusa el TUSUARIO por documento (o por correo) y
 * solo crea el TFUNCIONARIO nuevo, así que ya no hace falta preocuparse
 * por el 409 de correo duplicado que existía antes de V71.
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
    accountExists: true,
  }
}
