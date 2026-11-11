import { useAuth } from "@/features/auth/hooks/use-auth"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"

import { ROLES_REGISTRAN_OBSERVACION } from "@/features/gestion-estudiantil/observaciones/api/ui-mappings"

/**
 * Permisos del menú OBSERVACIONES_SUGERENCIAS más el rol: «Nueva observación» se deshabilita (no se
 * oculta) para quien solo consulta. Que el usuario dirija un grupo lo decide el backend: el selector
 * Grado/Grupo solo trae los de su designación y el gate vuelve a validar.
 */
export function useObservacionesAccess() {
  const { user } = useAuth()
  const roles = user?.roles ?? []
  const { puedeCrear, puedeVer } = useMenuPermission("OBSERVACIONES_SUGERENCIAS")
  return {
    puedeVer,
    puedeCrear: puedeCrear && ROLES_REGISTRAN_OBSERVACION.some((r) => roles.includes(r)),
  }
}
