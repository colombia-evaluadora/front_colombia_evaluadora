import { useCallback, useMemo, useState } from "react"

import { useNotify } from "@/components/notice/notice-context"
import { toDigitsOnly } from "@/lib/text-input"

import { enfocarPrimerError } from "@/features/gestion-estudiantil/commons/utils/validaciones"
import { hayCambios } from "@/features/gestion-estudiantil/configuracion/utils/cambios"
import { useEditarPlazoRemisiones } from "@/features/gestion-estudiantil/reintegracion/api/mutations/remisiones"

/** Mensaje del plazo de seguimiento, o `undefined` si es un entero positivo. */
export const errorPlazoRemisiones = (valor: string) => (Number(valor) >= 1 ? undefined : "Indique un número entero positivo.")

/** Estado, validación y envío del plazo de seguimiento de remisiones (G.10.PLA.1). */
export function usePlazoRemisionesForm({ plazo, establecimiento }: { plazo: number; establecimiento: number }) {
  const { notify } = useNotify()
  const inicial = String(plazo)
  const [valor, setValor] = useState(inicial)
  const [intento, setIntento] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const errorCampo = useMemo(() => errorPlazoRemisiones(valor), [valor])
  const guardar = useEditarPlazoRemisiones()

  const cambiar = useCallback((v: string) => setValor(toDigitsOnly(v, 3)), [])
  const cancelar = useCallback(() => {
    setValor(inicial)
    setIntento(false)
    setError(null)
  }, [inicial])
  const enviar = useCallback(() => {
    setIntento(true)
    setError(null)
    if (errorCampo) {
      enfocarPrimerError()
      return
    }
    guardar.mutate(
      { ESTABLECIMIENTO: establecimiento, PLAZO: Number(valor) },
      { onSuccess: () => notify("Plazo de seguimiento de remisiones guardado.", { variant: "success" }), onError: setError },
    )
  }, [errorCampo, guardar, establecimiento, valor, notify])

  return {
    valor,
    errorCampo: intento ? errorCampo : undefined,
    error,
    pendiente: guardar.isPending,
    cambios: hayCambios(valor, inicial),
    cambiar,
    cancelar,
    guardar: enviar,
  }
}
