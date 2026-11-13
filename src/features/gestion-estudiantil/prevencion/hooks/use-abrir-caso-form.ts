import { useState } from "react"

import { queueNotice } from "@/components/notice/notice-context"

import { codigoDe, useCatalogo } from "@/features/gestion-estudiantil/commons/api/use-catalogo"
import { enfocarPrimerError } from "@/features/gestion-estudiantil/commons/utils/validaciones"
import { esGrave } from "@/features/gestion-estudiantil/convivencia/api/ui-mappings"
import { useSecuelasHabilitadas } from "@/features/gestion-estudiantil/convivencia/api/validaciones"
import {
  CAMPOS_SIUCE,
  datosDeCaso,
  desdeCaso,
  validarCaso,
  type ErroresCaso,
  type ValoresCaso,
} from "@/features/gestion-estudiantil/convivencia/utils/caso-form"
import { useAbrirCasoConvivencia } from "@/features/gestion-estudiantil/prevencion/api/mutations/caso-convivencia"
import type { PlanDetalle } from "@/features/gestion-estudiantil/prevencion/api/types"
import { useNavegacionPrevencion } from "@/features/gestion-estudiantil/prevencion/hooks/use-navegacion-prevencion"

/**
 * Estado, validación y envío de «Abrir caso de convivencia» desde el plan (Regla 24). Reusa los valores y las
 * validaciones del formulario de Convivencia; el estudiante es el del plan y solo se elige su rol en la situación.
 */
export function useAbrirCasoForm(plan: PlanDetalle) {
  const { volver } = useNavegacionPrevencion()
  const [v, setValores] = useState<ValoresCaso>(() => desdeCaso(undefined))
  const [rol, setRol] = useState("")
  const [intento, setIntento] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [siuceAbierto, setSiuceAbierto] = useState(false)

  const tipos = useCatalogo("TIPO_SITUACION")
  const roles = useCatalogo("ROL_SITUACION")
  const grave = esGrave(codigoDe(tipos, v.tipo))
  const secuelas = useSecuelasHabilitadas(v.siuce)

  const set = (patch: Partial<ValoresCaso>) => setValores({ ...v, ...patch })
  const cambiarTipo = (tipo: string) => {
    set({ tipo })
    if (esGrave(codigoDe(tipos, tipo))) setSiuceAbierto(true)
  }

  // El estudiante del plan entra como única persona; «Tipo I requiere dos» lo valida el backend con sus involucrados.
  const validar = (): ErroresCaso =>
    validarCaso(
      { ...v, estudiantes: [{ fk_matricula: plan.fk_tmatricula, nombre: "", grado: "", rol, rolOriginal: rol }], involucrados: [] },
      { grave, tipoI: false, secuelas, fechasCambiaron: false, involucradoConError: () => false },
    )
  const errores: ErroresCaso = intento ? validar() : {}
  const errorRol = errores.estudiantes ? "El rol del estudiante en la situación es obligatorio." : undefined
  if (errores.estudiantes) delete errores.estudiantes

  const mut = useAbrirCasoConvivencia({
    mutationConfig: {
      onSuccess: () => {
        queueNotice("Caso de convivencia abierto y vinculado al plan.", { variant: "success" })
        volver()
      },
      onError: (e: Error) => setError(e),
    },
  })

  function guardar() {
    setIntento(true)
    setError(null)
    const e = validar()
    if (Object.keys(e).length > 0) {
      if (CAMPOS_SIUCE.some((c) => e[c])) setSiuceAbierto(true)
      enfocarPrimerError()
      return
    }
    mut.mutate({ planId: plan.id, datos: datosDeCaso(v, secuelas), tipoId: Number(v.tipo), rolId: Number(rol), soporte: v.soporte[0] ?? null })
  }

  return {
    v,
    set,
    errores,
    editar: false,
    grave,
    tipos,
    tipoLabel: tipos.find((t) => t.value === v.tipo)?.label,
    cambiarTipo,
    siuceAbierto,
    setSiuceAbierto,
    roles,
    rol,
    setRol,
    errorRol,
    error,
    guardando: mut.isPending,
    guardar,
    volver,
  }
}
