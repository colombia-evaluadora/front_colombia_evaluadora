import { useRouterState, useSearch } from "@tanstack/react-router"

import { paths } from "@/config/paths"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { useEsCoordinador } from "@/features/academic-management/asistencia/api/use-es-docente"
import {
  jornadaKey,
  usePlaneadorFiltroPeriodosQuery,
} from "@/features/planeador/api/query/use-planeador-filtros-query"

/** Mismo criterio de detección que `useEsCoordinador` (claim `roles` del
 *  token). Hay un rector por establecimiento y su alcance es el EE entero
 *  (todas sus sedes); el backend lo resuelve del token. */
const RECTOR_ROLE = "CEVAL-RECTOR"

/** Pantallas del Planeador que aceptan `?sede=&ano=&jornada=&docente=`: solo
 *  Actividades y Unidades (la planilla y los formularios de alta/edición
 *  quedan fuera, siempre trabajan sobre el usuario autenticado). */
const RUTAS_CON_SELECTOR = new Set([
  paths.app.planeadorActividades.getHref(),
  paths.app.planeadorUnidades.getHref(),
])

function toPk(value: unknown, min = 1): number | undefined {
  if (typeof value !== "string" && typeof value !== "number") return undefined
  const n = Number(value)
  return Number.isInteger(n) && n >= min ? n : undefined
}

export interface PlaneadorDocenteScope {
  /** Estamos en Actividades o Unidades (las únicas con selector). */
  enVistaConSelector: boolean
  esSuperAdmin: boolean
  /** Coordinador que NO es Super Admin (si tiene los dos roles, manda el
   *  de Super Admin: tiene que elegir al menos la sede). */
  esCoordinador: boolean
  /** Rector que NO es Super Admin. Mismas reglas que el Coordinador, pero su
   *  alcance es todo el establecimiento en vez de su(s) sede(s). */
  esRector: boolean
  /** Rector o Coordinador: la sede es opcional (sin ella ve todo su
   *  alcance) y "Todos los docentes…" está disponible desde el principio. */
  eligeSoloDocente: boolean
  /** Ve los campos Sede/Año/Jornada/Docente del filtro avanzado (Super
   *  Admin, Rector o Coordinador). */
  puedeElegirDocente: boolean
  /** `PK_TSEDE` elegida (`?sede=`). */
  sedeId?: number
  /** Año lectivo elegido (`?ano=`). */
  anio?: number
  /** Jornada elegida (`?jornada=`, `0` = periodo sin jornada). */
  jornadaId?: number
  /** `PK_TPERIODO_ACADEMICO` que resuelven sede + año + jornada — lo que
   *  viaja como `?periodo=` a los endpoints del planeador. */
  periodoId?: number
  /** `PK_TFUNCIONARIO` del docente elegido — lo que viaja como
   *  `?funcionario=` a los endpoints del planeador. `undefined` = el
   *  comportamiento de siempre (el backend resuelve el alcance del token). */
  funcionario?: number
  /** Super Admin sin sede elegida: la pantalla muestra el estado vacío y
   *  no dispara ninguna consulta (no tiene planeador propio). */
  requiereSeleccion: boolean
  /** `false` mientras `requiereSeleccion` o mientras se resuelve el periodo
   *  académico de la jornada elegida: las consultas dependientes del
   *  docente se apagan con esto (así no se pide dos veces). */
  consultasHabilitadas: boolean
}

/**
 * Alcance del Planeador según el rol y lo elegido en el filtro avanzado
 * (`?sede=&ano=&jornada=&docente=`, en la URL para que la vista sea
 * enlazable). Lo leen tanto las páginas como los hooks de consulta, así los
 * componentes profundos (pestañas, rótulos, detalle) no necesitan recibir el
 * docente por props.
 *
 * Fuera de Actividades/Unidades devuelve siempre el alcance del usuario
 * autenticado: abrir el alta de una actividad no debe heredar un `?docente=`.
 */
export function usePlaneadorDocenteScope(): PlaneadorDocenteScope {
  const { user } = useAuth()
  const esCoordinadorRol = useEsCoordinador()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const search = useSearch({ strict: false }) as {
    sede?: number | string
    ano?: number | string
    jornada?: number | string
    docente?: number | string
  }

  const enVistaConSelector = RUTAS_CON_SELECTOR.has(pathname.replace(/\/+$/, ""))
  const esSuperAdmin = user?.isSuperAdmin ?? false
  const esCoordinador = !esSuperAdmin && esCoordinadorRol
  const esRector = !esSuperAdmin && (user?.roles.includes(RECTOR_ROLE) ?? false)
  const eligeSoloDocente = esCoordinador || esRector
  const puedeElegirDocente = esSuperAdmin || eligeSoloDocente

  const activo = enVistaConSelector && puedeElegirDocente
  const sedeId = activo ? toPk(search.sede) : undefined
  // Año y jornada cuelgan de la sede: sin sede no valen aunque la URL los traiga.
  const anio = sedeId != null ? toPk(search.ano) : undefined
  const jornadaId = anio != null ? toPk(search.jornada, 0) : undefined

  // El periodo académico sale de la lista de la sede (la misma query que usa
  // el filtro avanzado, así que casi siempre ya está en caché).
  const periodos = usePlaneadorFiltroPeriodosQuery(sedeId, jornadaId != null)
  const periodoId =
    jornadaId != null
      ? periodos.data?.find((p) => p.anio === anio && jornadaKey(p.jornadaId) === jornadaId)?.id
      : undefined
  const resolviendoPeriodo = jornadaId != null && periodos.isPending

  // Para el Super Admin el docente cuelga de la sede: sin sede no hay docente
  // válido aunque la URL traiga uno.
  const funcionario =
    activo && (!esSuperAdmin || sedeId != null) ? toPk(search.docente) : undefined
  const requiereSeleccion = enVistaConSelector && esSuperAdmin && sedeId == null

  return {
    enVistaConSelector,
    esSuperAdmin,
    esCoordinador,
    esRector,
    eligeSoloDocente,
    puedeElegirDocente,
    sedeId,
    anio,
    jornadaId,
    periodoId,
    funcionario,
    requiereSeleccion,
    consultasHabilitadas: !requiereSeleccion && !resolviendoPeriodo,
  }
}

/** Lo que el alcance agrega a los listados del tablero: `?funcionario=`,
 *  `?sede=` y `?periodo=` (sso V553). */
export interface PlaneadorAlcanceParams {
  funcionario?: number
  sede?: number
  periodo?: number
}

/** Completa `?funcionario=&sede=&periodo=` en los params de un listado; un
 *  `funcionario` explícito del llamador gana sobre el del alcance. */
export function conAlcance<P extends PlaneadorAlcanceParams>(
  params: P,
  scope: PlaneadorDocenteScope,
): P {
  return {
    ...params,
    funcionario: params.funcionario ?? scope.funcionario,
    sede: params.sede ?? scope.sedeId,
    periodo: params.periodo ?? scope.periodoId,
  }
}

/** Escribe `funcionario`/`sede`/`periodo` en la query string de un GET. */
export function setAlcanceQuery(query: URLSearchParams, params: PlaneadorAlcanceParams) {
  if (params.funcionario != null) query.set("funcionario", String(params.funcionario))
  if (params.sede != null) query.set("sede", String(params.sede))
  if (params.periodo != null) query.set("periodo", String(params.periodo))
}

/** `?sede=&ano=&jornada=&docente=` vigentes, para arrastrarlos al navegar
 *  entre Actividades y Unidades (seguir mirando el mismo alcance). */
export interface PlaneadorAlcanceSearch {
  sede?: number
  ano?: number
  jornada?: number
  docente?: number
}

export function alcanceSearchDe(scope: PlaneadorDocenteScope): PlaneadorAlcanceSearch {
  return { sede: scope.sedeId, ano: scope.anio, jornada: scope.jornadaId, docente: scope.funcionario }
}
