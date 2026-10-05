import { useAuth } from "@/features/auth/hooks/use-auth"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"

const COORDINADOR_ROLE = "CEVAL-COORDINADOR"
/** Roles que sí planean actividades: con cualquiera de estos, el permiso del
 *  menú decide como siempre. */
const ROLES_QUE_PLANEAN = ["CEVAL-DOCENTE", "CEVAL-SUPER_ADMINISTRADOR"]

/**
 * Permisos EFECTIVOS del usuario sobre el Planeador. Todo el feature los lee
 * de acá y no de `useMenuPermission("PLANEADOR")` directo: en solo lectura
 * crear/editar/eliminar quedan en `false` aunque el menú los conceda, y las
 * acciones que modifican (lápiz, papelera, agregar, calificar…) directamente
 * no se renderizan.
 *
 * ¿Cuándo es solo lectura?
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
  const soloLectura = !permiso.puedeEditar || soloCoordina
  return {
    puedeVer: permiso.puedeVer || (soloCoordina && permiso.puedeEditar),
    puedeCrear: permiso.puedeCrear && !soloCoordina,
    puedeEditar: permiso.puedeEditar && !soloCoordina,
    puedeEliminar: permiso.puedeEliminar && !soloCoordina,
    isLoading: permiso.isLoading,
    soloLectura,
  }
}
