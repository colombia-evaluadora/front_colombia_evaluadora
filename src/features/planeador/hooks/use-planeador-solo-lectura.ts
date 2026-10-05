import { useAuth } from "@/features/auth/hooks/use-auth"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"

const COORDINADOR_ROLE = "CEVAL-COORDINADOR"
/** Roles que sí planean actividades: con cualquiera de estos, el permiso del
 *  menú decide como siempre. */
const ROLES_QUE_PLANEAN = ["CEVAL-DOCENTE", "CEVAL-SUPER_ADMINISTRADOR"]

/**
 * ¿El usuario ve las actividades del Planeador en solo lectura?
 *
 * Dos caminos, porque el primero solo no alcanzó en testv2:
 * 1. Sin `puedeEditar` sobre el menú PLANEADOR (rol con "Solo lectura").
 * 2. Coordinador que no es también docente: aunque `permisos-menu` le dé
 *    editar (así llegó en testv2, con el formulario entero editable), el
 *    Coordinador solo ve y valida la planeación de sus docentes, no la
 *    edita. Un coordinador que además dicta (CEVAL-DOCENTE) sigue editando
 *    sus propias actividades.
 */
export function usePlaneadorSoloLectura() {
  const permiso = useMenuPermission("PLANEADOR")
  const { user } = useAuth()
  const roles = user?.roles ?? []
  const soloCoordina =
    roles.includes(COORDINADOR_ROLE) && !ROLES_QUE_PLANEAN.some((rol) => roles.includes(rol))
  return {
    ...permiso,
    soloLectura: !permiso.puedeEditar || soloCoordina,
  }
}
