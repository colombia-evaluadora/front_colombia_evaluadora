import { useRouterState, useSearch } from "@tanstack/react-router"

import { paths } from "@/config/paths"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { useEsCoordinador } from "@/features/academic-management/asistencia/api/use-es-docente"

/** Pantallas del Planeador que aceptan `?establecimiento=&docente=`: solo
 *  Actividades y Unidades (la planilla y los formularios de alta/edición
 *  quedan fuera, siempre trabajan sobre el usuario autenticado). */
const RUTAS_CON_SELECTOR = new Set([
  paths.app.planeadorActividades.getHref(),
  paths.app.planeadorUnidades.getHref(),
])

function toPk(value: unknown): number | undefined {
  if (typeof value !== "string" && typeof value !== "number") return undefined
  const n = Number(value)
  return Number.isInteger(n) && n > 0 ? n : undefined
}

export interface PlaneadorDocenteScope {
  /** Estamos en Actividades o Unidades (las únicas con selector). */
  enVistaConSelector: boolean
  esSuperAdmin: boolean
  /** Coordinador que NO es Super Admin (si tiene los dos roles, manda el
   *  de Super Admin: elige establecimiento + docente). */
  esCoordinador: boolean
  /** Ve el selector de docente (Super Admin o Coordinador). */
  puedeElegirDocente: boolean
  /** `PK_TESTABLECIMIENTO` elegido (solo Super Admin). */
  establecimientoId?: number
  /** `PK_TFUNCIONARIO` del docente elegido — lo que viaja como
   *  `?funcionario=` a los endpoints del planeador. `undefined` = el
   *  comportamiento de siempre (el backend resuelve el alcance del token). */
  funcionario?: number
  /** Super Admin sin docente elegido: la pantalla muestra el estado vacío
   *  y no dispara ninguna consulta (no tiene planeador propio). */
  requiereSeleccion: boolean
  /** `false` mientras `requiereSeleccion`: las consultas dependientes del
   *  docente se apagan con esto. */
  consultasHabilitadas: boolean
}

/**
 * Alcance del Planeador según el rol y lo elegido en el selector de
 * establecimiento/docente (`?establecimiento=&docente=`, en la URL para que
 * la vista sea enlazable). Lo leen tanto las páginas como los hooks de
 * consulta, así los componentes profundos (pestañas, rótulos, detalle) no
 * necesitan recibir el docente por props.
 *
 * Fuera de Actividades/Unidades devuelve siempre el alcance del usuario
 * autenticado: abrir el alta de una actividad no debe heredar un `?docente=`.
 */
export function usePlaneadorDocenteScope(): PlaneadorDocenteScope {
  const { user } = useAuth()
  const esCoordinadorRol = useEsCoordinador()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const search = useSearch({ strict: false }) as {
    establecimiento?: number | string
    docente?: number | string
  }

  const enVistaConSelector = RUTAS_CON_SELECTOR.has(pathname.replace(/\/+$/, ""))
  const esSuperAdmin = user?.isSuperAdmin ?? false
  const esCoordinador = !esSuperAdmin && esCoordinadorRol
  const puedeElegirDocente = esSuperAdmin || esCoordinador

  const activo = enVistaConSelector && puedeElegirDocente
  const establecimientoId = activo && esSuperAdmin ? toPk(search.establecimiento) : undefined
  // Para el Super Admin el docente cuelga del establecimiento: sin EE no hay
  // docente válido aunque la URL traiga uno.
  const funcionario =
    activo && (!esSuperAdmin || establecimientoId != null) ? toPk(search.docente) : undefined
  const requiereSeleccion = enVistaConSelector && esSuperAdmin && funcionario == null

  return {
    enVistaConSelector,
    esSuperAdmin,
    esCoordinador,
    puedeElegirDocente,
    establecimientoId,
    funcionario,
    requiereSeleccion,
    consultasHabilitadas: !requiereSeleccion,
  }
}
