import { useState } from "react"

import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"

import { useCalificarCeldaMutation } from "@/features/planeador/api/mutations/use-calificar-celda"
import { usePlaneadorPeriodosEvaluacionQuery } from "@/features/planeador/api/query/use-planeador-periodos-evaluacion-query"
import type { CambioPendiente } from "@/features/planeador/components/planilla/celda-nota-popover"

/** El periodo de evaluación de esa fecha no es Calificable (estado distinto de "1"). */
export function usePeriodoCerrado(fecha: string) {
  const { data: periodos = [] } = usePlaneadorPeriodosEvaluacionQuery()
  const periodo = periodos.find((p) => p.startDate <= fecha && fecha <= p.endDate)
  return periodo != null && periodo.estado !== "1"
}

/**
 * Periodo cerrado (Regla 55): las notas se acumulan por
 * `pkTactividadEstudiante` y se envían juntas; el backend abre la solicitud.
 * Lo comparten la Planilla y la vista de calificar una actividad.
 */
export function useSolicitudPeriodoCerrado({ onEnviado }: { onEnviado?: () => void } = {}) {
  const [cambios, setCambios] = useState<Map<number, CambioPendiente>>(new Map())
  const [confirmando, setConfirmando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [enviada, setEnviada] = useState(false)
  const { notify } = useNotify()
  const calificar = useCalificarCeldaMutation()

  function agregarCambio(pk: number, cambio: CambioPendiente | null) {
    setCambios((prev) => {
      const next = new Map(prev)
      if (cambio) next.set(pk, cambio)
      else next.delete(pk)
      return next
    })
  }

  async function enviarSolicitud() {
    setEnviando(true)
    const pendientes = new Map(cambios)
    let solicitudes = 0
    let error: unknown = null
    for (const [pk, cambio] of cambios) {
      try {
        const result = await calificar.mutateAsync(cambio.input)
        solicitudes += result?.solicitudes_pendientes?.length ?? 0
        pendientes.delete(pk)
      } catch (e) {
        error ??= e
      }
    }
    setCambios(pendientes)
    setEnviando(false)
    setConfirmando(false)
    if (pendientes.size < cambios.size) onEnviado?.()
    if (error) notify(getErrorMessage(error), { variant: "error" })
    // Una primera nota (sin nota previa) se aplica directo, sin solicitud.
    if (solicitudes > 0) setEnviada(true)
    else if (pendientes.size < cambios.size) notify("Notas guardadas.")
  }

  return {
    cambios,
    agregarCambio,
    limpiarCambios: () => setCambios(new Map()),
    confirmando,
    pedirConfirmacion: () => setConfirmando(true),
    cancelarConfirmacion: () => setConfirmando(false),
    enviando,
    enviarSolicitud,
    enviada,
    cerrarEnviada: () => setEnviada(false),
  }
}
