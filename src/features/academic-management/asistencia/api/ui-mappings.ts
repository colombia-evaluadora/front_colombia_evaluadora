import type { ComponentType } from "react"

import { CheckCircleFillIcon, CircleDashedIcon, XCircleIcon } from "@/components/ui/icons"

import type {
  EstadoSesion,
  SeguimientoFiltersValues,
  SesionCalendario,
  TipoAsistencia,
} from "@/features/academic-management/asistencia/api/types/asistencia"


export const ESTADO_SESION_ICON: Record<EstadoSesion, ComponentType<{ className?: string }>> = {
  REGISTRADA: CheckCircleFillIcon,
  RETRASADA: XCircleIcon,
  PENDIENTE: CircleDashedIcon,
}

export const ESTADO_SESION_COLOR: Record<EstadoSesion, string> = {
  REGISTRADA: "text-green",
  RETRASADA: "text-red",
  PENDIENTE: "text-blue",
}

export const ESTADO_SESION_LABELS: Record<EstadoSesion, { title: string; description: string }> = {
  REGISTRADA: { title: "Asistencia registrada", description: "Registro completo" },
  RETRASADA: { title: "Por registrar", description: "Fecha vencida sin registro" },
  PENDIENTE: { title: "Pendiente", description: "Fechas futuras" },
}

// RETRASADA gana sobre PENDIENTE, que gana sobre REGISTRADA -- el resumen de
// un conjunto de sesiones (un grado, un grupo, un día) tiene que avisar
// primero lo que falta, no lo que ya quedó en orden. Usado por la celda del
// calendario en modo Rector y por su popover de drill-down (grados → grupos
// → asignaturas).
const PRIORIDAD_ESTADO: Record<EstadoSesion, number> = {
  RETRASADA: 0,
  PENDIENTE: 1,
  REGISTRADA: 2,
}

export function peorEstado(estados: EstadoSesion[]): EstadoSesion {
  return estados.reduce<EstadoSesion>(
    (peor, estado) => (PRIORIDAD_ESTADO[estado] < PRIORIDAD_ESTADO[peor] ? estado : peor),
    "REGISTRADA",
  )
}

export interface BloqueContinuo {
  fecha: string
  fkGrupo: number
  grupo: string
  grado: string
  jornada: string
  fkAsignatura: number
  asignatura: string
  /** `null` = toma suelta sin bloque (`TASISTENCIA.BLOQUE` nulo), o sesión formativa (siempre sin bloque). */
  bloque: number | null
  /** Bloques reales de la corrida -- `[null]` si `bloque` es `null` (nunca se mezcla con numéricos). */
  bloques: (number | null)[]
  horasPorBloque: Record<number, { horaInicio: string | null; horaFin: string | null }>
  horaInicio: string | null
  horaFin: string | null
  estado: EstadoSesion
  /** Grupo de Preescolar: la sesión es esta ACTIVIDAD, no la asignatura de arriba. */
  esFormativa: boolean
  fkActividad: number | null
  actividad: string | null
}

export function agruparPorBloquesContinuos(sesiones: SesionCalendario[]): BloqueContinuo[] {
  const resultado: BloqueContinuo[] = []
  const porActividad = new Map<string, SesionCalendario[]>()
  const noFormativas: SesionCalendario[] = []
  for (const s of sesiones) {
    if (!s.es_formativa) {
      noFormativas.push(s)
      continue
    }
    const key = `${s.fecha}-${s.fk_grupo}-actividad-${s.fk_tactividad}`
    const grupo = porActividad.get(key) ?? []
    grupo.push(s)
    porActividad.set(key, grupo)
  }
  for (const grupo of porActividad.values()) {
    const primero = grupo[0]
    resultado.push({
      fecha: primero.fecha,
      fkGrupo: primero.fk_grupo,
      grupo: primero.grupo,
      grado: primero.grado,
      jornada: primero.jornada,
      fkAsignatura: primero.fk_asignatura,
      asignatura: primero.asignatura,
      bloque: null,
      bloques: [null],
      horasPorBloque: {},
      horaInicio: primero.hora_inicio,
      horaFin: primero.hora_fin,
      estado: peorEstado(grupo.map((s) => s.estado_sesion)),
      esFormativa: true,
      fkActividad: primero.fk_tactividad,
      actividad: primero.actividad,
    })
  }

  // No formativas: por (fecha, grupo, asignatura), para separar sueltas sin
  // bloque (cada una su propia entrada) de las corridas de bloques continuos.
  const porClave = new Map<string, SesionCalendario[]>()
  for (const s of noFormativas) {
    const key = `${s.fecha}-${s.fk_grupo}-${s.fk_asignatura}`
    const lista = porClave.get(key) ?? []
    lista.push(s)
    porClave.set(key, lista)
  }

  for (const lista of porClave.values()) {
    // Sueltas sin bloque (ej. una toma manual vieja): no hay por qué
    // fusionarlas, cada una es su propia entrada.
    for (const s of lista) {
      if (s.bloque !== null) continue
      resultado.push({
        fecha: s.fecha,
        fkGrupo: s.fk_grupo,
        grupo: s.grupo,
        grado: s.grado,
        jornada: s.jornada,
        fkAsignatura: s.fk_asignatura,
        asignatura: s.asignatura,
        bloque: null,
        bloques: [null],
        horasPorBloque: {},
        horaInicio: s.hora_inicio,
        horaFin: s.hora_fin,
        estado: s.estado_sesion,
        esFormativa: false,
        fkActividad: null,
        actividad: null,
      })
    }

    const conBloque = lista.filter((s): s is SesionCalendario & { bloque: number } => s.bloque !== null)
    const ordenado = [...conBloque].sort((a, b) => a.bloque - b.bloque)
    let corrida: (SesionCalendario & { bloque: number })[] = []

    const cerrarCorrida = () => {
      if (corrida.length === 0) return
      const primero = corrida[0]
      const ultimo = corrida[corrida.length - 1]
      resultado.push({
        fecha: primero.fecha,
        fkGrupo: primero.fk_grupo,
        grupo: primero.grupo,
        grado: primero.grado,
        jornada: primero.jornada,
        fkAsignatura: primero.fk_asignatura,
        asignatura: primero.asignatura,
        bloque: primero.bloque,
        bloques: corrida.map((s) => s.bloque),
        horasPorBloque: Object.fromEntries(
          corrida.map((s) => [s.bloque, { horaInicio: s.hora_inicio, horaFin: s.hora_fin }]),
        ),
        horaInicio: primero.hora_inicio,
        horaFin: ultimo.hora_fin,
        estado: peorEstado(corrida.map((s) => s.estado_sesion)),
        // Una sesión con bloque real (THORARIO) nunca es formativa -- ese
        // modelo (preescolar) no usa bloques en absoluto.
        esFormativa: false,
        fkActividad: null,
        actividad: null,
      })
      corrida = []
    }

    for (const sesion of ordenado) {
      const anterior = corrida[corrida.length - 1]
      if (anterior && sesion.bloque !== anterior.bloque + 1) cerrarCorrida()
      corrida.push(sesion)
    }
    cerrarCorrida()
  }
  return resultado
}


export const TIPO_ASISTENCIA_DOT: Record<TipoAsistencia, string> = {
  1: "bg-green",
  2: "bg-red",
  3: "bg-red",
  5: "bg-yellow",
  6: "bg-yellow",
}

/** "yyyy-MM-ddTHH:mm:ss" -- se lee la hora directo del string (sin pasar por
 * `Date`) para no arrastrar el huso horario del navegador. */
export function formatHora(timestamp: string): string {
  return timestamp.slice(11, 16)
}

/** "7:00 - 10:00" del bloque, o "" si falta alguna de las dos horas. */
export function formatHoraRango(horaInicio: string | null, horaFin: string | null): string {
  if (!horaInicio || !horaFin) return ""
  return `${formatHora(horaInicio)} - ${formatHora(horaFin)}`
}

export function gradoDeGrupo(grupo: string): string {
  return `${grupo.slice(0, -2) || grupo}°`
}

/** "6" -> "6°" para mostrar -- el `grado_valor` real llega sin el símbolo. */
export function formatGrado(grado: string): string {
  return grado.endsWith("°") ? grado : `${grado}°`
}

export interface GrupoCatalogEntry {
  value: number
  label: string
  grado: string
  gradoNombre: string
  jornada: string
  jornadaNombre: string
}

export interface AsignaturaCatalogEntry {
  value: number
  label: string
}

/** Actividad de un grupo formativo (preescolar) -- misma forma que `AsignaturaCatalogEntry`, entidad distinta (`TACTIVIDAD`, no `TASIGNATURA`). */
export type ActividadCatalogEntry = AsignaturaCatalogEntry

/** Opción de filtro con código (`value`, lo que se usa para filtrar/agrupar) y nombre completo (`label`, lo que se muestra). */
export interface CodigoNombreOption {
  value: string
  label: string
}

export function catalogosDeSesiones(sesiones: SesionCalendario[]): {
  grupos: GrupoCatalogEntry[]
  asignaturas: AsignaturaCatalogEntry[]
  asignaturasPorGrupo: Map<number, AsignaturaCatalogEntry[]>
  actividades: ActividadCatalogEntry[]
  actividadesPorGrupo: Map<number, ActividadCatalogEntry[]>
  jornadas: CodigoNombreOption[]
} {
  const grupos = new Map<number, GrupoCatalogEntry>()
  const asignaturas = new Map<number, AsignaturaCatalogEntry>()
  const asignaturasPorGrupo = new Map<number, Map<number, AsignaturaCatalogEntry>>()
  const actividades = new Map<number, ActividadCatalogEntry>()
  const actividadesPorGrupo = new Map<number, Map<number, ActividadCatalogEntry>>()
  const jornadas = new Map<string, string>()

  for (const s of sesiones) {
    if (!grupos.has(s.fk_grupo)) {
      grupos.set(s.fk_grupo, {
        value: s.fk_grupo,
        label: s.grupo,
        grado: s.grado,
        gradoNombre: s.grado_nombre,
        jornada: s.jornada,
        jornadaNombre: s.jornada_nombre,
      })
    }
    if (s.jornada) jornadas.set(s.jornada, s.jornada_nombre || s.jornada)

    // Formativo (preescolar): la sesión es la ACTIVIDAD, no `fk_asignatura`
    // (esa es la asignatura dueña -- filtrar por ella no encuentra estas
    // filas). Se cataloga aparte, sin mezclarse con `asignaturas`.
    if (s.es_formativa && s.fk_tactividad !== null) {
      if (!actividades.has(s.fk_tactividad)) {
        actividades.set(s.fk_tactividad, { value: s.fk_tactividad, label: s.actividad ?? "Actividad" })
      }
      const porGrupoAct = actividadesPorGrupo.get(s.fk_grupo) ?? new Map<number, ActividadCatalogEntry>()
      if (!porGrupoAct.has(s.fk_tactividad)) {
        porGrupoAct.set(s.fk_tactividad, { value: s.fk_tactividad, label: s.actividad ?? "Actividad" })
      }
      actividadesPorGrupo.set(s.fk_grupo, porGrupoAct)
      continue
    }

    if (!asignaturas.has(s.fk_asignatura)) {
      asignaturas.set(s.fk_asignatura, { value: s.fk_asignatura, label: s.asignatura })
    }
    const porGrupo = asignaturasPorGrupo.get(s.fk_grupo) ?? new Map<number, AsignaturaCatalogEntry>()
    if (!porGrupo.has(s.fk_asignatura)) {
      porGrupo.set(s.fk_asignatura, { value: s.fk_asignatura, label: s.asignatura })
    }
    asignaturasPorGrupo.set(s.fk_grupo, porGrupo)
  }

  return {
    grupos: [...grupos.values()].sort((a, b) => a.label.localeCompare(b.label)),
    asignaturas: [...asignaturas.values()].sort((a, b) => a.label.localeCompare(b.label)),
    asignaturasPorGrupo: new Map(
      [...asignaturasPorGrupo.entries()].map(([grupoId, mapa]) => [
        grupoId,
        [...mapa.values()].sort((a, b) => a.label.localeCompare(b.label)),
      ]),
    ),
    actividades: [...actividades.values()].sort((a, b) => a.label.localeCompare(b.label)),
    actividadesPorGrupo: new Map(
      [...actividadesPorGrupo.entries()].map(([grupoId, mapa]) => [
        grupoId,
        [...mapa.values()].sort((a, b) => a.label.localeCompare(b.label)),
      ]),
    ),
    jornadas: [...jornadas.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  }
}

/** Nombre a mostrar de una fila de Seguimiento -- actividad si es formativa, asignatura si no (mismo criterio que `nombreSesion` del calendario). */
export function nombreMateriaSeguimiento(
  row: Pick<SeguimientoRowLike, "es_formativa" | "actividad" | "asignatura">,
): string {
  return row.es_formativa ? (row.actividad ?? "Actividad") : row.asignatura
}

interface SeguimientoRowLike {
  es_formativa: boolean
  actividad: string | null
  asignatura: string
}

/** Grados de `jornada` (vacío = todas) -- código + nombre, distintos y ordenados por nombre. */
export function gradosDeJornada(catalog: GrupoCatalogEntry[], jornada: string): CodigoNombreOption[] {
  const porCodigo = new Map<string, string>()
  for (const g of catalog) {
    if (!jornada || g.jornada === jornada) porCodigo.set(g.grado, g.gradoNombre || g.grado)
  }
  return [...porCodigo.entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

/** Grupos de `(jornada, grado)` -- vacío en cualquiera de los dos = sin acotar por ese eje. */
export function gruposDeGradoJornada(catalog: GrupoCatalogEntry[], jornada: string, grado: string) {
  return catalog.filter((g) => (!jornada || g.jornada === jornada) && (!grado || g.grado === grado))
}

export const EMPTY_SEGUIMIENTO_FILTERS: SeguimientoFiltersValues = {
  fechaDesde: "",
  fechaHasta: "",
  jornada: "",
  grado: "",
  grupo: "",
  asignatura: "",
  tipoAsistencia: "",
}
