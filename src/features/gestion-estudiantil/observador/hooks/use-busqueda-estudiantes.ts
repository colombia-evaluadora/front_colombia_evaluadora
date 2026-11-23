import { useState } from "react"

import { useOpcionesCascada } from "@/features/gestion-estudiantil/commons/hooks/use-opciones-cascada"
import {
  useEstudiantesObservadorQuery,
  useGruposObservadorQuery,
  type PropositoEstudiantes,
} from "@/features/gestion-estudiantil/observador/api/query/use-opciones-observador-query"
import type { EstudianteObservador } from "@/features/gestion-estudiantil/observador/api/types"

export interface FiltroEstudiante {
  establecimiento: string
  sede: string
  jornada: string
  grupo: string
}

export const FILTRO_ESTUDIANTE_VACIO: FiltroEstudiante = { establecimiento: "", sede: "", jornada: "", grupo: "" }

const id = (v: string) => (v ? Number(v) : undefined)

// El documento va en la etiqueta para que el filtro del combo no descarte lo que el servidor encontró por él.
export const etiquetaEstudiante = (e: EstudianteObservador) =>
  `${e.estudiante_nombre} · ${e.grado_grupo}${e.estudiante_documento ? ` · ${e.estudiante_documento}` : ""}`

/**
 * Cascada Establecimiento, Sede, Jornada y Grado/Grupo para acotar la búsqueda de estudiantes
 * (la del proyecto) y la consulta de `opciones/estudiantes` con esos filtros y el texto escrito.
 * Establecimiento solo aparece si el usuario tiene más de uno.
 */
export function useBusquedaEstudiantes(proposito: PropositoEstudiantes, enabled = true) {
  const [filtro, setFiltro] = useState<FiltroEstudiante>(FILTRO_ESTUDIANTE_VACIO)
  const [consulta, setConsulta] = useState("")
  const cascada = useOpcionesCascada(filtro.sede, filtro.jornada, filtro.establecimiento)
  // Los grupos salen del mismo alcance que los estudiantes (el docente, solo los de su carga al registrar).
  const grupos = useGruposObservadorQuery(
    { proposito, establecimiento: id(filtro.establecimiento), sede: id(filtro.sede), jornada: id(filtro.jornada) },
    enabled && Boolean(filtro.jornada),
  )
  const grupoOpciones = (grupos.data ?? []).map((g) => ({ value: String(g.fk_tgrupo), label: g.grado_grupo }))
  const estudiantes = useEstudiantesObservadorQuery(
    {
      proposito,
      search: consulta,
      establecimiento: id(filtro.establecimiento),
      sede: id(filtro.sede),
      jornada: id(filtro.jornada),
      grupo: id(filtro.grupo),
      limite: 30,
    },
    enabled,
  )
  return { filtro, setFiltro, consulta, setConsulta, cascada, grupoOpciones, estudiantes }
}
