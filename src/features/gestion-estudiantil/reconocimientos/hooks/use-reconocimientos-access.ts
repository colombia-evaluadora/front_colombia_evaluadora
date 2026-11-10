import { useAuth } from "@/features/auth/hooks/use-auth"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"

import {
  ROLES_ESCRIBEN_RECONOCIMIENTO,
  ROLES_SUPERVISAN_RECONOCIMIENTO,
} from "@/features/gestion-estudiantil/reconocimientos/api/ui-mappings"

/**
 * Permisos del menú RECONOCIMIENTOS más el rol: «Nuevo reconocimiento» se deshabilita (no se oculta)
 * para quien solo consulta, y las sugerencias solo se piden a RECTOR y COORDINADOR. El backend vuelve a
 * validar cada acción con su gate y alcance.
 */
export function useReconocimientosAccess() {
  const { user } = useAuth()
  const roles = user?.roles ?? []
  const { puedeCrear, puedeEditar, puedeVer } = useMenuPermission("RECONOCIMIENTOS")
  const escribe = ROLES_ESCRIBEN_RECONOCIMIENTO.some((r) => roles.includes(r))
  return {
    puedeVer,
    puedeCrear: puedeCrear && escribe,
    puedeEditar: puedeEditar && escribe,
    veSugerencias: ROLES_SUPERVISAN_RECONOCIMIENTO.some((r) => roles.includes(r)),
  }
}
