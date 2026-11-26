import { useCallback, useMemo, useState } from "react"

import { useNotify } from "@/components/notice/notice-context"
import { toDigitsOnly } from "@/lib/text-input"

import { enfocarPrimerError } from "@/features/gestion-estudiantil/commons/utils/validaciones"
import { useGuardarPlazos } from "@/features/gestion-estudiantil/configuracion/api/mutations/proceso"
import type { PlazosDisciplinario } from "@/features/gestion-estudiantil/configuracion/api/types"
import { hayCambios } from "@/features/gestion-estudiantil/configuracion/utils/cambios"
import { errorBackendACampo, validarPlazos, type Errores, type ValoresPlazos } from "@/features/gestion-estudiantil/configuracion/utils/proceso"

/** Estado, validación y envío de los plazos del proceso disciplinario. */
export function usePlazosForm({ plazos, establecimiento }: { plazos: PlazosDisciplinario; establecimiento: number }) {
  const { notify } = useNotify()
  const inicial = useMemo(() => ({ descargos: String(plazos.dias_descargos), recursos: String(plazos.dias_recursos) }), [plazos])
  const [valores, setValores] = useState<ValoresPlazos>(inicial)
  const [intento, setIntento] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [erroresBackend, setErroresBackend] = useState<Errores<ValoresPlazos>>({})
  const guardar = useGuardarPlazos()
  const errores = useMemo(() => ({ ...(intento ? validarPlazos(valores) : {}), ...erroresBackend }), [intento, valores, erroresBackend])

  const cambiar = useCallback((campo: keyof ValoresPlazos, valor: string) => {
    setValores((p) => ({ ...p, [campo]: toDigitsOnly(valor, 2) }))
    setErroresBackend({})
  }, [])

  const cancelar = useCallback(() => {
    setValores(inicial)
    setIntento(false)
    setError(null)
    setErroresBackend({})
  }, [inicial])

  const enviar = useCallback(() => {
    setIntento(true)
    setError(null)
    if (Object.keys(validarPlazos(valores)).length) {
      enfocarPrimerError()
      return
    }
    guardar.mutate(
      { establecimiento, descargos: Number(valores.descargos), recursos: Number(valores.recursos) },
      {
        onSuccess: () => notify("Plazos del proceso guardados.", { variant: "success" }),
        onError: (e) => {
          const campo = errorBackendACampo(e)
          if (campo && (campo.campo === "descargos" || campo.campo === "recursos")) {
            setErroresBackend({ [campo.campo]: campo.mensaje })
            enfocarPrimerError()
          } else setError(e)
        },
      },
    )
  }, [valores, guardar, establecimiento, notify])

  return { valores, errores, error, pendiente: guardar.isPending, cambios: hayCambios(valores, inicial), cambiar, cancelar, guardar: enviar }
}
