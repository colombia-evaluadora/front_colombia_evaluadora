import { useEffect, useMemo, useState } from "react"

import type { Opcion } from "@/features/gestion-estudiantil/commons/utils/opcion"
import { useOpcionesEstudiantesQuery } from "@/features/gestion-estudiantil/prevencion/api/query/use-opciones-prevencion-query"
import type { OpcionEstudiante } from "@/features/gestion-estudiantil/prevencion/api/types"

const ESPERA_MS = 300
const etiquetaEstudiante = (o: OpcionEstudiante) => `${o.estudiante_nombre} · ${o.grado_grupo}`

interface Opciones {
  establecimiento: number | null
  /** Matrícula preseleccionada (de la URL) y su nombre, para leer su grado/grupo. */
  inicial?: number
  nombreInicial?: string
  /** Alcance del reporte de salud mental (carga del docente o sedes de orientación). */
  saludMental?: boolean
}

/**
 * Selector de estudiante: búsqueda con espera en el servidor, preselección por nombre (para mostrar
 * «Nombre · grado_grupo») y memoria de lo elegido para que siga en las opciones.
 */
export function useSelectorEstudiantePrevencion({ establecimiento, inicial, nombreInicial, saludMental }: Opciones) {
  const [estudiante, setEstudiante] = useState(inicial != null ? String(inicial) : "")
  const [texto, setTexto] = useState("")
  const [busqueda, setBusqueda] = useState("")
  const [elegidos, setElegidos] = useState<Record<string, string>>({})

  useEffect(() => {
    const t = setTimeout(() => setBusqueda(texto), ESPERA_MS)
    return () => clearTimeout(t)
  }, [texto])

  const estudiantes = useOpcionesEstudiantesQuery({ establecimiento, search: busqueda, saludMental })
  const preseleccion = useOpcionesEstudiantesQuery(
    { establecimiento, search: nombreInicial, saludMental },
    inicial != null && nombreInicial != null,
  )

  const opciones = useMemo<Opcion[]>(() => {
    const lista = (estudiantes.data ?? []).map((o) => ({ value: String(o.fk_tmatricula), label: etiquetaEstudiante(o) }))
    const extra = (preseleccion.data ?? []).map((o) => ({ value: String(o.fk_tmatricula), label: etiquetaEstudiante(o) }))
    for (const o of [...extra, ...Object.entries(elegidos).map(([value, label]) => ({ value, label }))])
      if (!lista.some((x) => x.value === o.value)) lista.push(o)
    // Mientras el grupo no llega, el seleccionado se lee solo con su nombre.
    if (estudiante && nombreInicial && !lista.some((o) => o.value === estudiante) && estudiante === String(inicial))
      lista.push({ value: estudiante, label: nombreInicial })
    return lista
  }, [estudiantes.data, preseleccion.data, elegidos, estudiante, inicial, nombreInicial])

  const elegir = (v: string) => {
    const label = opciones.find((o) => o.value === v)?.label
    if (label) setElegidos((e) => ({ ...e, [v]: label }))
    setEstudiante(v)
  }

  return { estudiante, matricula: estudiante ? Number(estudiante) : undefined, opciones, elegir, onBuscar: setTexto }
}
