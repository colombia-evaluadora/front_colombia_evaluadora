import { useCallback, useMemo, useState } from "react"

import { useNotify } from "@/components/notice/notice-context"

import { enfocarPrimerError } from "@/features/gestion-estudiantil/commons/utils/validaciones"
import { useGuardarCausasReservadas } from "@/features/gestion-estudiantil/configuracion/api/mutations/riesgo-servicio"
import type { CausasReservadas } from "@/features/gestion-estudiantil/configuracion/api/types"
import { hayCambios } from "@/features/gestion-estudiantil/configuracion/utils/cambios"
import { causasConFijas, causasParaBackend } from "@/features/gestion-estudiantil/configuracion/utils/riesgo"
import { useGuardarParametros } from "@/features/gestion-estudiantil/prevencion/api/mutations/parametros"
import type { ParametrosRiesgo } from "@/features/gestion-estudiantil/prevencion/api/types"
import {
  hayErroresParametros,
  parametrosParaBackend,
  validarParametros,
  valoresIniciales,
  type CampoParametro,
  type ValoresParametros,
} from "@/features/gestion-estudiantil/prevencion/utils/parametros"

interface Opciones {
  parametros: ParametrosRiesgo
  causas: CausasReservadas
  establecimiento: number
}

/** Estado, validación y envío de G.10.RIE.1: parámetros (PUT /parametros) y causas reservadas (su propio PUT). */
export function useParametrosRiesgoForm({ parametros, causas, establecimiento }: Opciones) {
  const { notify } = useNotify()
  const inicial = useMemo(() => valoresIniciales(parametros), [parametros])
  const causasIniciales = useMemo(() => causas.causas.filter((c) => c.reservada).map((c) => c.valor), [causas])
  const [valores, setValores] = useState<ValoresParametros>(inicial)
  const [reservadas, setReservadas] = useState<string[]>(causasIniciales)
  const [intento, setIntento] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const guardarParametros = useGuardarParametros()
  const guardarCausas = useGuardarCausasReservadas()

  const erroresBase = useMemo(() => validarParametros(valores), [valores])
  const errores = useMemo(() => {
    const e: Partial<Record<CampoParametro | "avisoSm", string>> = { ...erroresBase }
    if (!valores.avisoSm) e.avisoSm = "El aviso en salud mental es obligatorio."
    return e
  }, [erroresBase, valores.avisoSm])

  const cambiar = useCallback((campo: CampoParametro, valor: string) => setValores((v) => ({ ...v, [campo]: valor })), [])
  const cambiarAviso = useCallback((avisoSm: string) => setValores((v) => ({ ...v, avisoSm })), [])
  const marcarCondicion = useCallback(
    (codigo: string, marcada: boolean) =>
      setValores((v) => ({
        ...v,
        condiciones: marcada ? [...v.condiciones, codigo] : v.condiciones.filter((c) => c !== codigo),
      })),
    [],
  )
  // Las cuatro fijas no se pueden quitar: vuelven a entrar aunque el selector las suelte.
  const cambiarCausas = useCallback((siguientes: string[]) => setReservadas(causasConFijas(siguientes, causas.fijas)), [causas.fijas])

  const cancelar = useCallback(() => {
    setValores(inicial)
    setReservadas(causasIniciales)
    setIntento(false)
    setError(null)
  }, [inicial, causasIniciales])

  const guardar = useCallback(() => {
    setIntento(true)
    setError(null)
    if (hayErroresParametros(errores)) {
      enfocarPrimerError()
      return
    }
    const causasCambiaron = [...reservadas].sort().join() !== [...causasIniciales].sort().join()
    const terminar = () => notify("Parámetros de riesgo guardados.", { variant: "success" })
    guardarParametros.mutate(parametrosParaBackend(establecimiento, valores), {
      onSuccess: () =>
        causasCambiaron
          ? guardarCausas.mutate(
              { establecimiento, causas: causasParaBackend(reservadas, causas.fijas) },
              { onSuccess: terminar, onError: setError },
            )
          : terminar(),
      onError: setError,
    })
  }, [errores, reservadas, causasIniciales, guardarParametros, guardarCausas, establecimiento, valores, causas.fijas, notify])

  return {
    valores,
    reservadas,
    errores: intento ? errores : {},
    error,
    pendiente: guardarParametros.isPending || guardarCausas.isPending,
    cambios: hayCambios({ valores, reservadas }, { valores: inicial, reservadas: causasIniciales }),
    cambiar,
    cambiarAviso,
    marcarCondicion,
    cambiarCausas,
    cancelar,
    guardar,
  }
}
