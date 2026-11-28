import { useUser } from "@/lib/auth"

import { ROLES_ORIENTACIONES } from "@/features/establishment/institution/utils/orientaciones"

export interface AccesoOrientaciones {
  /** Ve la pestaña Orientaciones. */
  visible: boolean
  /** Consulta eligiendo el establecimiento; no responde. */
  esSuperAdmin: boolean
  /** Administrador o Gestor administrativo del establecimiento: responde las Enviadas. */
  puedeResponder: boolean
}

/**
 * Quién ve la pestaña Orientaciones (informe, 2.3): el Administrador y el Gestor administrativo del
 * establecimiento, que además responden, y el Superadministrador, que solo consulta. Los roles
 * territoriales las gestionan en Entidad territorial y aquí no ven la pestaña.
 */
export function useAccesoOrientaciones(): AccesoOrientaciones {
  const { data: user } = useUser()
  const roles = user?.roles ?? []
  const puedeResponder = ROLES_ORIENTACIONES.some((rol) => roles.includes(rol))
  const esSuperAdmin = user?.isSuperAdmin === true
  return { visible: puedeResponder || esSuperAdmin, esSuperAdmin, puedeResponder }
}
