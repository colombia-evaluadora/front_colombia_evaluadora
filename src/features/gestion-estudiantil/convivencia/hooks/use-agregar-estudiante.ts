import { useState } from "react"

import { useEstudiantesGrupoQuery, useOpcionesConvivencia } from "@/features/gestion-estudiantil/convivencia/api/use-opciones-convivencia"
import type { EstudianteFila } from "@/features/gestion-estudiantil/convivencia/api/form-types"

interface Opciones {
  yaAgregados: number[]
  onAgregar: (fila: EstudianteFila) => void
  onOpenChange: (open: boolean) => void
}

/** Cascada Sede → Jornada → Grado/Grupo → Estudiante (endpoint propio) del diálogo «Agregar estudiante». */
export function useAgregarEstudiante({ yaAgregados, onAgregar, onOpenChange }: Opciones) {
  const [sede, setSede] = useState("")
  const [jornada, setJornada] = useState("")
  const [grupo, setGrupo] = useState("")
  const [estudiante, setEstudiante] = useState("")
  const [repetido, setRepetido] = useState(false)
  const opciones = useOpcionesConvivencia(sede, jornada)
  const roster = useEstudiantesGrupoQuery(grupo)
  const grupoLabel = opciones.grupoOpciones.find((g) => g.value === grupo)?.label ?? ""

  function agregar() {
    const m = roster.data?.find((r) => String(r.fk_matricula) === estudiante)
    if (!m) return
    if (yaAgregados.includes(m.fk_matricula)) {
      setRepetido(true)
      return
    }
    onAgregar({ fk_matricula: m.fk_matricula, nombre: m.nombre, grado: grupoLabel, rol: "" })
    setEstudiante("")
    setRepetido(false)
    onOpenChange(false)
  }

  return {
    sede,
    jornada,
    grupo,
    estudiante,
    repetido,
    opciones,
    cargandoRoster: roster.isFetching,
    estudianteOpciones: (roster.data ?? []).map((m) => ({ value: String(m.fk_matricula), label: m.nombre })),
    elegirSede: (s: string) => {
      setSede(s)
      setJornada("")
      setGrupo("")
      setEstudiante("")
    },
    elegirJornada: (j: string) => {
      setJornada(j)
      setGrupo("")
      setEstudiante("")
    },
    elegirGrupo: (g: string) => {
      setGrupo(g)
      setEstudiante("")
    },
    elegirEstudiante: (e: string) => {
      setEstudiante(e)
      setRepetido(false)
    },
    agregar,
  }
}
