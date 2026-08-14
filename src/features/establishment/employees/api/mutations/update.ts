import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import { apiPath } from "@/lib/api-routes"

import type { Employee } from "@/features/establishment/employees/api/types/employee"

/**
 * Adapta `Employee` al contrato del binding SQL real (`fn_fun_actualizar`,
 * PATCH parcial — ver postgres/pending/step4_funcionarios_listar_y_baja.sql,
 * item 5, todavía sin aplicar). El único ajuste real: `person.password`
 * NUNCA viaja — la contraseña definitiva la pone el usuario por correo al
 * registrarse (mismo criterio que en el alta), reenviar lo que haya en el
 * form pisaría el hash real con basura. El resto de campos (person,
 * employeeClass, educationLevel, grade, highestEducationLevel,
 * fundingSource, functionalPosition, employmentType, address, status) ya
 * viajan con la forma que la query espera — solo lee `.id` de cada
 * `CatalogItem` anidado, el resto del objeto se ignora sin problema.
 * `permissions` tampoco lo usa esta query (los permisos van aparte, ver
 * PUT /funcionario/:ID/permisos): viaja igual porque no molesta, el
 * binding solo toma las rutas `:BODY.X.Y` que necesita.
 */
function toRealBackendPayload(values: Employee) {
  const { password: _password, ...personRest } = values.person
  return { ...values, person: personRest }
}

function toOutgoingPayload(values: Employee) {
  return env.ENABLE_API_MOCKING ? values : toRealBackendPayload(values)
}

/**
 * PATCH, no PUT: `PUT /establecimientos/funcionarios/:ID` ya es la baja
 * lógica (`fn_fun_baja_establecimiento`, ver use-delete.ts) — el PATCH es
 * el update integral de campos.
 */
export function update(
  employeeId: number,
  values: Employee,
): Promise<{ status: "ok" | "error"; message: string; employee: Employee }> {
  const url = apiPath(`/establishments/employees/${employeeId}`, `/establecimientos/funcionarios/${employeeId}`)
  return env.ENABLE_API_MOCKING
    ? api.put(url, toOutgoingPayload(values))
    : api.patch(url, toOutgoingPayload(values))
}
