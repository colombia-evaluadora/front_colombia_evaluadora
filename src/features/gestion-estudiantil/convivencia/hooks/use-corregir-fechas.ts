import { useState } from "react"

import { useNotify } from "@/components/notice/notice-context"

import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import { useCorregirFechasCaso } from "@/features/gestion-estudiantil/convivencia/api/mutations/casos"
import { useCasoQuery } from "@/features/gestion-estudiantil/convivencia/api/query/use-casos-query"
import {
  corregirFechasInput,
  desdeCaso,
  fechasDe,
  validarCaso,
  type ErroresCaso,
  type ValoresCaso,
} from "@/features/gestion-estudiantil/convivencia/utils/caso-form"

const CAMPOS_FECHA = ["fechaConocida", "fechaHechos", "horaConocida", "hora", "fechaConocimiento", "motivo"] as const

/** G.2.CAS.GES.3: edita solo fechas y motivo y los envía a `POST /casos/:ID/fechas`, sin reenviar el resto del caso. */
export function useCorregirFechas(casoId: number, onClose: () => void) {
  const { notify } = useNotify()
  const { data: caso, isPending } = useCasoQuery(casoId)
  const [cambios, setCambios] = useState<Partial<ValoresCaso>>({})
  const [intento, setIntento] = useState(false)
  const [confirmado, setConfirmado] = useState(false)
  const [errorMutacion, setErrorMutacion] = useState<unknown>(null)

  const base = desdeCaso(caso)
  const v: ValoresCaso = { ...base, ...cambios }
  const fechasCambiaron = fechasDe(v) !== fechasDe(base)
  const set = (parcial: Partial<ValoresCaso>) => setCambios((c) => ({ ...c, ...parcial }))

  const mut = useCorregirFechasCaso({
    mutationConfig: {
      onSuccess: () => {
        notify("Fechas del caso corregidas.", { variant: "success" })
        onClose()
      },
      onError: (error) => setErrorMutacion(error),
    },
  })

  // Solo se validan los campos de fechas: el resto del caso no viaja.
  const todos = validarCaso(v, {
    grave: false,
    tipoI: false,
    secuelas: false,
    fechasCambiaron,
    involucradoConError: () => false,
  })
  const deFechas: ErroresCaso = Object.fromEntries(CAMPOS_FECHA.filter((c) => todos[c]).map((c) => [c, todos[c]]))
  const pasaADesconocida = base.fechaConocida === true && v.fechaConocida === false

  const hechos = base.fechaConocida
    ? `Hechos el ${formatFecha(base.fechaHechos)}${base.horaConocida && base.hora ? ` a las ${base.hora}` : ""}`
    : "Fecha de los hechos desconocida"
  const valorActual = caso ? `${hechos} · Conocido el ${formatFecha(base.fechaConocimiento)}` : undefined

  return {
    v,
    set,
    valorActual,
    errores: intento ? deFechas : {},
    fechasCambiaron,
    cargando: isPending,
    /** Las acciones ya registradas quedan señaladas para revisión si la fecha aclarada es posterior a alguna. */
    accionesInconsistentes: caso?.acciones_inconsistentes === true,
    pasaADesconocida,
    confirmado,
    setConfirmado,
    errorMutacion,
    guardando: mut.isPending,
    puedeGuardar: !isPending && fechasCambiaron && (!pasaADesconocida || confirmado),
    guardar: () => {
      setIntento(true)
      if (!caso || Object.keys(deFechas).length) return
      setErrorMutacion(null)
      mut.mutate(corregirFechasInput(caso.id, v))
    },
  }
}
