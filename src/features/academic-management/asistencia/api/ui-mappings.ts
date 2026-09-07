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
  /** `null` = toma suelta sin bloque (`TASISTENCIA.BLOQUE` nulo). */
  bloque: number | null
  /** Bloques reales de la corrida -- `[null]` si `bloque` es `null` (nunca se mezcla con numéricos). */
  bloques: (number | null)[]
  horasPorBloque: Record<number, { horaInicio: string | null; horaFin: string | null }>
  horaInicio: string | null
  horaFin: string | null
  estado: EstadoSesion
}

export function agruparPorBloquesContinuos(sesiones: SesionCalendario[]): BloqueContinuo[] {
  const porClave = new Map<string, SesionCalendario[]>()
  for (const s of sesiones) {
    const key = `${s.fecha}-${s.fk_grupo}-${s.fk_asignatura}`
    const lista = porClave.get(key) ?? []
    lista.push(s)
    porClave.set(key, lista)
  }

  const resultado: BloqueContinuo[] = []
  for (const lista of porClave.values()) {
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

/** Opción de filtro con código (`value`, lo que se usa para filtrar/agrupar) y nombre completo (`label`, lo que se muestra). */
export interface CodigoNombreOption {
  value: string
  label: string
}

export function catalogosDeSesiones(sesiones: SesionCalendario[]): {
  grupos: GrupoCatalogEntry[]
  asignaturas: AsignaturaCatalogEntry[]
  asignaturasPorGrupo: Map<number, AsignaturaCatalogEntry[]>
  jornadas: CodigoNombreOption[]
} {
  const grupos = new Map<number, GrupoCatalogEntry>()
  const asignaturas = new Map<number, AsignaturaCatalogEntry>()
  const asignaturasPorGrupo = new Map<number, Map<number, AsignaturaCatalogEntry>>()
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
    if (!asignaturas.has(s.fk_asignatura)) {
      asignaturas.set(s.fk_asignatura, { value: s.fk_asignatura, label: s.asignatura })
    }
    if (s.jornada) jornadas.set(s.jornada, s.jornada_nombre || s.jornada)

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
    jornadas: [...jornadas.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  }
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
