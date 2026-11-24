import { isAxiosError } from "axios"

import { getAuthToken } from "@/lib/api-client"
import { toAuthUserFromToken } from "@/lib/auth-mapper"

/**
 * Funcionario que inicia sesión sin ningún rol asignado (QA: «Algo salió mal» sin poder cerrar
 * sesión). Los roles del token salen de sus asignaciones en `TSEDE_USUARIO` (V57 → `role_users`),
 * y el query-service autoriza cruzando esos roles con `role_query`: sin roles, `/my-menus` y
 * `/usuarios/permisos-menu` responden 403 y el guard de `/app` caía al `ErrorPage`.
 *
 * Con el token decodificado y `roles: []` ni se llama: el menú es vacío y el guard lleva a
 * «Sin acceso», dentro del layout (con Cerrar sesión). Sin token en memoria (modo sin conexión)
 * no se decide nada acá.
 */
export function tokenSinRoles(): boolean {
  const token = getAuthToken()
  if (!token) return false
  const user = toAuthUserFromToken(token)
  return user != null && user.roles.length === 0
}

/** 403 del menú o de los permisos: ningún rol del usuario tiene el endpoint, así que no tiene módulos. */
export function esSinPermiso(error: unknown): boolean {
  return isAxiosError(error) && error.response?.status === 403
}
