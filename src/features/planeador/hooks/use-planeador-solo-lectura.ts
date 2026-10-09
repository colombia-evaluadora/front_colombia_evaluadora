import * as React from "react"

import { useAuth } from "@/features/auth/hooks/use-auth"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"
import { usePlaneadorDocenteScope } from "@/features/planeador/hooks/use-planeador-docente-scope"

const COORDINADOR_ROLE = "CEVAL-COORDINADOR"
/** El rector sigue las mismas reglas que el coordinador (solo mira y valida). */
const RECTOR_ROLE = "CEVAL-RECTOR"
/** Roles que sí planean actividades: con cualquiera de estos, el permiso del
 *  menú decide como siempre. */
const ROLES_QUE_PLANEAN = ["CEVAL-DOCENTE", "CEVAL-SUPER_ADMINISTRADOR"]

/**
 * Fuerza solo lectura en un subárbol: la card y el panel de detalle de una
 * actividad/unidad AJENA (la de otro docente, vista por un Coordinador que
 * mira toda su sede). Contexto y no prop porque los botones que modifican
 * viven muy abajo (diálogos de eliminar/calificar, secciones del detalle) y
 * todos ya leen sus permisos de `usePlaneadorSoloLectura`.
 */
const SoloLecturaForzadaContext = React.createContext(false)

/** `.ts` y no `.tsx` para no renombrar el módulo (lo importa medio feature):
 *  por eso `createElement` en vez de JSX. */
export function PlaneadorSoloLecturaScope({
  activo,
  children,
}: {
  activo: boolean
  children: React.ReactNode
}) {
  const heredado = React.useContext(SoloLecturaForzadaContext)
  return React.createElement(
    SoloLecturaForzadaContext.Provider,
    { value: heredado || activo },
    children,
  )
}

/**
 * Permisos EFECTIVOS del usuario sobre el Planeador. Todo el feature los lee
 * de acá y no de `useMenuPermission("PLANEADOR")` directo: en solo lectura
 * crear/editar/eliminar quedan en `false` aunque el menú los conceda, y las
 * acciones que modifican (lápiz, papelera, agregar, calificar…) directamente
 * no se renderizan.
 *
 * ¿Cuándo es solo lectura?
 *
 * 1. Sin `puedeEditar` sobre el menú PLANEADOR (rol con "Solo lectura").
 * 2. Coordinador que no es también docente: aunque `permisos-menu` le dé
 *    editar (así llegó en testv2, con el formulario entero editable), el
 *    Coordinador solo ve y valida la planeación de sus docentes, no la
 *    edita. Un coordinador que además dicta (CEVAL-DOCENTE) sigue editando
 *    sus propias actividades. El Rector (CEVAL-RECTOR) sigue exactamente
 *    las mismas reglas, con alcance de todo el establecimiento.
 * 3. Super Admin/Coordinador mirando el planeador de OTRO docente
 *    (`?docente=` en Actividades/Unidades, ver `usePlaneadorDocenteScope`):
 *    ver es solo ver. `viendoOtroDocente` además le avisa a la UI que oculte
 *    los atajos a la pantalla de edición (que no conoce el `?docente=`).
 * 4. Dentro de un `PlaneadorSoloLecturaScope` activo (fila ajena en la vista
 *    "Todos los docentes de mi sede" del Coordinador).
 */
export function usePlaneadorSoloLectura() {
  const permiso = useMenuPermission("PLANEADOR")
  const { user } = useAuth()
  const { funcionario } = usePlaneadorDocenteScope()
  const forzada = React.useContext(SoloLecturaForzadaContext)
  const roles = user?.roles ?? []
  const soloCoordina =
    (roles.includes(COORDINADOR_ROLE) || roles.includes(RECTOR_ROLE)) &&
    !ROLES_QUE_PLANEAN.some((rol) => roles.includes(rol))
  const viendoOtroDocente = funcionario != null || forzada
  const bloqueado = soloCoordina || viendoOtroDocente
  const soloLectura = !permiso.puedeEditar || bloqueado
  return {
    puedeVer: permiso.puedeVer || (soloCoordina && permiso.puedeEditar) || viendoOtroDocente,
    puedeCrear: permiso.puedeCrear && !bloqueado,
    puedeEditar: permiso.puedeEditar && !bloqueado,
    puedeEliminar: permiso.puedeEliminar && !bloqueado,
    isLoading: permiso.isLoading,
    soloLectura,
    viendoOtroDocente,
  }
}
