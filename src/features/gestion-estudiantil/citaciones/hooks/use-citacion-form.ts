import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"

import { queueNotice, useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import { paths } from "@/config/paths"

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

/** Estado, validación y envío de «Nueva citación» (G.3.CIT.4). */
export function useCitacionForm(origen?: OrigenManual, matricula?: number, estudiante?: string) {
  const navigate = useNavigate()
  const { notify } = useNotify()
  const [v, setV] = useState<ValoresCitacion>(() => ({ ...citacionVacia(), matricula: matricula ? String(matricula) : "" }))
  const [nombre, setNombre] = useState(estudiante ?? "")
  const [intento, setIntento] = useState(false)

  const set = (patch: Partial<ValoresCitacion>) => setV((prev) => ({ ...prev, ...patch }))
  const errores = intento ? validarCitacion(v) : {}

  const volver = () => navigate({ to: paths.app.citacionesCompromisos.getHref(), search: { tab: "citaciones" } } as never)

  const acudiente = useAcudienteQuery(v.matricula ? Number(v.matricula) : null).data?.acudiente_nombre

  const crear = useCrearCitacion({
    mutationConfig: {
      onSuccess: () => {
        queueNotice(`Citación programada; se avisó a ${acudiente ?? "el acudiente"}.`, { variant: "success" })
        volver()
      },
      // Los 22023 del backend (motivo, fecha, lugar, matrícula) llegan con su texto: se muestran arriba.
      onError: (error: Error) => {
        notify(getErrorMessage(error), { variant: "error" })
        enfocarPrimerError()
      },
    },
  })

  function guardar() {
    setIntento(true)
    const e = validarCitacion(v)
    if (hayErroresCitacion(e)) {
      notify("Revise los campos marcados.", { variant: "error" })
      enfocarPrimerError()
      return
    }
    crear.mutate(crearCitacionInput(v, origen))
  }

  return { v, set, nombre, setNombre, errores, guardando: crear.isPending, guardar, volver }
}
