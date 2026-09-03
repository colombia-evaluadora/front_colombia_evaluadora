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


export const TIPO_ASISTENCIA_DOT: Record<TipoAsistencia, string> = {
  1: "bg-green",
  2: "bg-red",
  3: "bg-red",
  5: "bg-yellow",
  6: "bg-yellow",
}

export function gradoDeGrupo(grupo: string): string {
  return `${grupo.slice(0, -2) || grupo}°`
}

export interface GrupoCatalogEntry {
  value: number
  label: string
  grado: string
}

export interface AsignaturaCatalogEntry {
  value: number
  label: string
}

export function catalogosDeSesiones(sesiones: SesionCalendario[]): {
  grupos: GrupoCatalogEntry[]
  asignaturas: AsignaturaCatalogEntry[]
  asignaturasPorGrupo: Map<number, AsignaturaCatalogEntry[]>
} {
  const grupos = new Map<number, GrupoCatalogEntry>()
  const asignaturas = new Map<number, AsignaturaCatalogEntry>()
  const asignaturasPorGrupo = new Map<number, Map<number, AsignaturaCatalogEntry>>()

  for (const s of sesiones) {
    if (!grupos.has(s.fk_grupo)) {
      grupos.set(s.fk_grupo, { value: s.fk_grupo, label: s.grupo, grado: gradoDeGrupo(s.grupo) })
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
  }
}

/** Grados presentes en el catálogo (distintos, ordenados). */
export function gradosDelCatalogo(catalog: GrupoCatalogEntry[]): string[] {
  return [...new Set(catalog.map((g) => g.grado))].sort()
}

/** Grupos de `grado` (vacío = todos). */
export function gruposDeGrado(catalog: GrupoCatalogEntry[], grado: string) {
  return catalog.filter((g) => !grado || g.grado === grado)
}

export const TIPO_ASISTENCIA_OPTIONS = [
  { value: 1, label: "Asistió" },
  { value: 2, label: "No asistió" },
  { value: 3, label: "No asistió (justificado)" },
  { value: 5, label: "Llegó tarde" },
  { value: 6, label: "Llegó tarde (justificado)" },
] as const

export const EMPTY_SEGUIMIENTO_FILTERS: SeguimientoFiltersValues = {
  jornada: "",
  grado: "",
  grupo: "",
  asignatura: "",
  tipoAsistencia: "",
}
