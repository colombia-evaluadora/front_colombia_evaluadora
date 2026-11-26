import { useCallback, useMemo, useState } from "react"

import { useNotify } from "@/components/notice/notice-context"

import { enfocarPrimerError } from "@/features/gestion-estudiantil/commons/utils/validaciones"
import { useGuardarNiveles } from "@/features/gestion-estudiantil/configuracion/api/mutations/niveles"
import type { NivelesConvivencia } from "@/features/gestion-estudiantil/configuracion/api/types"
import { hayCambios } from "@/features/gestion-estudiantil/configuracion/utils/cambios"
import { aTexto, limpiarUmbral, validarNiveles, type ValoresNiveles } from "@/features/gestion-estudiantil/configuracion/utils/niveles"

/** Estado, validación y envío de los umbrales del nivel de convivencia (§3.6). */
export function useNivelesForm({ niveles, establecimiento }: { niveles: NivelesConvivencia; establecimiento: number }) {
  const { notify } = useNotify()
  const inicial = useMemo<ValoresNiveles>(() => ({ medio: aTexto(niveles.umbral_medio), alto: aTexto(niveles.umbral_alto) }), [niveles])
  const [valores, setValores] = useState(inicial)
  const [intento, setIntento] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const errores = useMemo(() => validarNiveles(valores), [valores])
  const guardar = useGuardarNiveles()

  const cambiar = useCallback((campo: keyof ValoresNiveles, v: string) => setValores((x) => ({ ...x, [campo]: limpiarUmbral(v) })), [])
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
      {
        ESTABLECIMIENTO: establecimiento,
        UMBRAL_MEDIO: valores.medio.trim() ? Number(valores.medio) : null,
        UMBRAL_ALTO: valores.alto.trim() ? Number(valores.alto) : null,
      },
      { onSuccess: () => notify("Niveles de convivencia guardados.", { variant: "success" }), onError: setError },
    )
  }, [errores, guardar, establecimiento, valores, notify])

  return {
    valores,
    errores: intento ? errores : {},
    error,
    pendiente: guardar.isPending,
    cambios: hayCambios(valores, inicial),
    cambiar,
    cancelar,
    guardar: enviar,
  }
}
