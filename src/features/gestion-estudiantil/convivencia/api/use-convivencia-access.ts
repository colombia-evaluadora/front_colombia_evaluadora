import { useAuth } from "@/features/auth/hooks/use-auth"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"

/** role_query de V599: crear, modificar, registrar acciones y cerrar. */
const GESTION_ROLES = ["CEVAL-COORDINADOR", "CEVAL-DOCENTE", "CEVAL-RECTOR"]
/** Asignar gestor, cambiar tipo y anular: Supervisor de sede y Administrador del establecimiento. */
const SUPERVISION_ROLES = ["CEVAL-COORDINADOR", "CEVAL-RECTOR"]

/** Qué acciones ofrecer; el backend vuelve a validar cada una con su gate y alcance. */
export function useConvivenciaAccess() {
  const { user } = useAuth()
  const roles = user?.roles ?? []
  const permiso = useMenuPermission("CONVIVENCIA")
  const gestiona = GESTION_ROLES.some((r) => roles.includes(r))
  const supervisa = SUPERVISION_ROLES.some((r) => roles.includes(r))
  return {
    puedeCrear: permiso.puedeCrear && gestiona,
    puedeGestionar: permiso.puedeEditar && gestiona,
    puedeSupervisar: permiso.puedeEditar && supervisa,
  }
}

export type ConvivenciaAccess = ReturnType<typeof useConvivenciaAccess>
