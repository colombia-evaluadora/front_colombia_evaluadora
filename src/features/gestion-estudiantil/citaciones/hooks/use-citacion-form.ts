import { useState } from "react"

import type { OrigenManual } from "@/features/gestion-estudiantil/citaciones/api/types"
import { useAcudienteQuery } from "@/features/gestion-estudiantil/citaciones/api/query/use-citaciones-query"
import { useCrearCitacion } from "@/features/gestion-estudiantil/citaciones/api/mutations/crear-citacion"
import {
  citacionVacia,
  crearCitacionInput,
  hayErroresCitacion,
  validarCitacion,
  type ValoresCitacion,
} from "@/features/gestion-estudiantil/citaciones/utils/formularios"
import { enfocarPrimerError } from "@/features/gestion-estudiantil/commons/utils/validaciones"

interface Opciones {
  origen?: OrigenManual
  matricula?: number
  estudiante?: string
  /** Recibe el mensaje de éxito; quien abrió el modal decide cómo mostrarlo y lo cierra. */
  onCreada: (mensaje: string) => void
}

/** Estado, validación y envío de «Nueva citación» (G.3.CIT.4). */
export function useCitacionForm({ origen, matricula, estudiante, onCreada }: Opciones) {
  const [v, setV] = useState<ValoresCitacion>(() => ({ ...citacionVacia(), matricula: matricula ? String(matricula) : "" }))
  const [nombre, setNombre] = useState(estudiante ?? "")
  const [intento, setIntento] = useState(false)
  // Error del backend (22023: motivo, fecha, lugar, matrícula): va en el banner del modal, con su texto.
  const [error, setError] = useState<unknown>(null)

  const set = (patch: Partial<ValoresCitacion>) => setV((prev) => ({ ...prev, ...patch }))
  const errores = intento ? validarCitacion(v) : {}

  const acudiente = useAcudienteQuery(v.matricula ? Number(v.matricula) : null).data?.acudiente_nombre

  const crear = useCrearCitacion({
    mutationConfig: {
      onSuccess: () => onCreada(`Citación programada; se avisó a ${acudiente ?? "el acudiente"}.`),
      onError: (e: Error) => setError(e),
    },
  })

  function guardar() {
    setIntento(true)
    setError(null)
    if (hayErroresCitacion(validarCitacion(v))) {
      enfocarPrimerError()
      return
    }
    crear.mutate(crearCitacionInput(v, origen))
  }

  return { v, set, nombre, setNombre, errores, error, guardando: crear.isPending, guardar }
}
