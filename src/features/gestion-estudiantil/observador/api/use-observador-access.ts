import { useAuth } from "@/features/auth/hooks/use-auth"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"

/** Anular (Regla 3): Supervisor de sede y Administrador del establecimiento (role_query de V545.7). */
const ANULAR_ROLES = ["CEVAL-COORDINADOR", "CEVAL-RECTOR", "CEVAL-JEFE_SISTEMA_ESTABLECIMIENTO", "CEVAL-SUPER_ADMINISTRADOR"]
/** Imprimir observador (Regla 37): además el director de grupo, que entra como DOCENTE. */
const IMPRIMIR_ROLES = ["CEVAL-DOCENTE", "CEVAL-COORDINADOR", "CEVAL-RECTOR", "CEVAL-JEFE_SISTEMA_ESTABLECIMIENTO"]

/** Qué botones ver; el backend vuelve a validar cada acción con su gate y alcance. */
export function useObservadorAccess() {
  const { user } = useAuth()
  const roles = user?.roles ?? []
  const permiso = useMenuPermission("OBSERVADOR")
  return {
    puedeCrear: permiso.puedeCrear,
    puedeEditar: permiso.puedeEditar,
    puedeAnular: permiso.puedeEditar && ANULAR_ROLES.some((r) => roles.includes(r)),
    puedeImprimir: IMPRIMIR_ROLES.some((r) => roles.includes(r)),
  }
}
