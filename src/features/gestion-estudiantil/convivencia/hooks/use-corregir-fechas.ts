import { useState } from "react"

import { useNotify } from "@/components/notice/notice-context"

import { useActualizarCaso } from "@/features/gestion-estudiantil/convivencia/api/mutations/casos"
import { useCatalogo } from "@/features/gestion-estudiantil/convivencia/api/use-catalogos-convivencia"
import { useCasoQuery } from "@/features/gestion-estudiantil/convivencia/api/query/use-casos-query"
import { useSecuelasHabilitadas } from "@/features/gestion-estudiantil/convivencia/api/validaciones"
import {
  actualizarCasoInput,
  desdeCaso,
  fechasDe,
  validarCaso,
  type ErroresCaso,
  type ValoresCaso,
} from "@/features/gestion-estudiantil/convivencia/utils/caso-form"

const CAMPOS_FECHA = ["fechaConocida", "fechaHechos", "horaConocida", "hora", "fechaConocimiento", "motivo"] as const

/** G.2.CAS.GES.3: edita solo fechas y motivo; el `PUT` del caso exige reenviar el resto sin cambios. */
export function useCorregirFechas(casoId: number, onClose: () => void) {
  const { notify } = useNotify()
  const { data: caso, isPending } = useCasoQuery(casoId)
  const [cambios, setCambios] = useState<Partial<ValoresCaso>>({})
  const [intento, setIntento] = useState(false)
  const [confirmado, setConfirmado] = useState(false)
  const [errorMutacion, setErrorMutacion] = useState<unknown>(null)

  const base = desdeCaso(caso)
  const v: ValoresCaso = { ...base, ...cambios }
  const secuelas = useSecuelasHabilitadas(v.siuce)
  const fechasCambiaron = fechasDe(v) !== fechasDe(base)
  const set = (parcial: Partial<ValoresCaso>) => setCambios((c) => ({ ...c, ...parcial }))

  const mut = useActualizarCaso({
    mutationConfig: {
      onSuccess: () => {
        notify("Fechas del caso corregidas.", { variant: "success" })
        onClose()
      },
      onError: (error) => setErrorMutacion(error),
    },
  })

  const todos = validarCaso(v, {
    grave: false,
    tipoI: false,
    secuelas,
    fechasCambiaron,
    involucradoConError: () => false,
  })
  const deFechas: ErroresCaso = Object.fromEntries(
    CAMPOS_FECHA.filter((c) => todos[c]).map((c) => [c, todos[c]]),
  )
  // El PUT revalida el caso entero: un valor retirado de su lista lo rechaza aunque solo cambien las fechas.
  const lugares = useCatalogo("LUGAR_SITUACION")
  const manifestaciones = useCatalogo("MANIFESTACION_SITUACION")
  const vigente = (valor: string, opciones: { value: string }[]) => opciones.some((o) => o.value === valor)
  const catalogosListos = lugares.length > 0 && manifestaciones.length > 0
  const incompleto =
    !isPending && catalogosListos && (!vigente(v.lugar, lugares) || !vigente(v.manifestacion, manifestaciones))
  const pasaADesconocida = base.fechaConocida === true && v.fechaConocida === false

  return {
    v,
    set,
    errores: intento ? deFechas : {},
    fechasCambiaron,
    cargando: isPending,
    incompleto,
    pasaADesconocida,
    confirmado,
    setConfirmado,
    errorMutacion,
    guardando: mut.isPending,
    puedeGuardar: !isPending && catalogosListos && !incompleto && fechasCambiaron && (!pasaADesconocida || confirmado),
    guardar: () => {
      setIntento(true)
      if (!caso || Object.keys(deFechas).length) return
      setErrorMutacion(null)
      mut.mutate(actualizarCasoInput(caso, v, secuelas, true))
    },
  }
}
