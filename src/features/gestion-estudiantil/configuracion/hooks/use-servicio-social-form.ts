import { useCallback, useMemo, useState } from "react"

import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import { toDigitsOnly } from "@/lib/text-input"

import { enfocarPrimerError } from "@/features/gestion-estudiantil/commons/utils/validaciones"
import { useGuardarServicioSocial } from "@/features/gestion-estudiantil/configuracion/api/mutations/riesgo-servicio"
import type { ParametrosServicioSocialConfig } from "@/features/gestion-estudiantil/configuracion/api/types"
import { validarServicioSocial, type ValoresServicioSocial } from "@/features/gestion-estudiantil/configuracion/utils/servicio-social"

/** Estado, validación y envío de G.10.SOC.1. */
export function useServicioSocialForm({ parametros, establecimiento }: { parametros: ParametrosServicioSocialConfig; establecimiento: number }) {
  const { notify } = useNotify()
  const inicial = useMemo<ValoresServicioSocial>(
    () => ({
      horas: String(parametros.horas_requeridas),
      grados: parametros.grados.map((g) => g.pk),
      anticipacion: String(parametros.anticipacion_meses),
    }),
    [parametros],
  )
  const [valores, setValores] = useState(inicial)
  const [intento, setIntento] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [errorGradosBackend, setErrorGradosBackend] = useState<string | undefined>()
  const guardar = useGuardarServicioSocial()
  const errores = useMemo(() => validarServicioSocial(valores), [valores])

  const cambiarHoras = useCallback((v: string) => setValores((x) => ({ ...x, horas: toDigitsOnly(v, 3) })), [])
  const cambiarAnticipacion = useCallback((v: string) => setValores((x) => ({ ...x, anticipacion: toDigitsOnly(v, 1) })), [])
  const cambiarGrados = useCallback((grados: number[]) => {
    setValores((x) => ({ ...x, grados }))
    setErrorGradosBackend(undefined)
  }, [])

  const cancelar = useCallback(() => {
    setValores(inicial)
    setIntento(false)
    setError(null)
  }, [inicial])

  const enviar = useCallback(() => {
    setIntento(true)
    setError(null)
    if (Object.keys(errores).length) {
      enfocarPrimerError()
      return
    }
    guardar.mutate(
      { establecimiento, horas: Number(valores.horas), grados: valores.grados, anticipacion: Number(valores.anticipacion) },
      {
        onSuccess: () => notify("Parámetros del servicio social guardados.", { variant: "success" }),
        // «El grado X no es de la educación media…» es del campo Grados: se muestra inline.
        onError: (e) => {
          const mensaje = getErrorMessage(e)
          if (mensaje.toLowerCase().startsWith("el grado")) {
            setErrorGradosBackend(mensaje)
            enfocarPrimerError()
          } else setError(e)
        },
      },
    )
  }, [errores, guardar, establecimiento, valores, notify])

  return {
    valores,
    errores: { ...(intento ? errores : {}), ...(errorGradosBackend ? { grados: errorGradosBackend } : {}) },
    error,
    pendiente: guardar.isPending,
    cambiarHoras,
    cambiarAnticipacion,
    cambiarGrados,
    cancelar,
    guardar: enviar,
  }
}
