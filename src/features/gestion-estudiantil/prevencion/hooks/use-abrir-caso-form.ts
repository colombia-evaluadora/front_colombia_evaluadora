import { useState } from "react"

import { queueNotice } from "@/components/notice/notice-context"

import { codigoDe, useCatalogo } from "@/features/gestion-estudiantil/commons/api/use-catalogo"
import { enfocarPrimerError } from "@/features/gestion-estudiantil/commons/utils/validaciones"
import { esGrave } from "@/features/gestion-estudiantil/convivencia/api/ui-mappings"
import type { EstudianteFila, InvolucradoFila } from "@/features/gestion-estudiantil/convivencia/api/form-types"
import { erroresInvolucrado, useSecuelasHabilitadas } from "@/features/gestion-estudiantil/convivencia/api/validaciones"
import {
  CAMPOS_SIUCE,
  datosDeCaso,
  desdeCaso,
  toInvolucradoInput,
  validarCaso,
  type ErroresCaso,
  type ValoresCaso,
} from "@/features/gestion-estudiantil/convivencia/utils/caso-form"
import { useGestorPrevistoQuery } from "@/features/gestion-estudiantil/convivencia/api/query/use-casos-query"
import { useAbrirCasoConvivencia } from "@/features/gestion-estudiantil/prevencion/api/mutations/caso-convivencia"
import type { PlanDetalle } from "@/features/gestion-estudiantil/prevencion/api/types"
import { useNavegacionPrevencion } from "@/features/gestion-estudiantil/prevencion/hooks/use-navegacion-prevencion"

/**
 * Estado, validación y envío de «Abrir caso de convivencia» desde el plan (Regla 24). Reusa los valores y las
 * validaciones del formulario de Convivencia; el estudiante es el del plan y solo se elige su rol en la situación.
 */
export function useAbrirCasoForm(plan: PlanDetalle) {
  const { volver } = useNavegacionPrevencion()
  // El estudiante del plan va primero y no se quita; los demás son adicionales (ESTUDIANTES).
  const propio: EstudianteFila = {
    fk_matricula: plan.fk_tmatricula,
    nombre: plan.estudiante_nombre,
    grado: plan.grado_grupo,
    rol: "",
  }
  const [v, setValores] = useState<ValoresCaso>(() => ({ ...desdeCaso(undefined), estudiantes: [propio] }))
  const [intento, setIntento] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [siuceAbierto, setSiuceAbierto] = useState(false)

  const tipos = useCatalogo("TIPO_SITUACION")
  const tiposInv = useCatalogo("TIPO_INVOLUCRADO")
  const rolesSit = useCatalogo("ROL_SITUACION")
  const grave = esGrave(codigoDe(tipos, v.tipo))
  const secuelas = useSecuelasHabilitadas(v.siuce)
  // NUE.2: el gestor lo asigna Convivencia por Sede y Jornada del estudiante del plan (VINCULADO).
  const previsto = useGestorPrevistoQuery(v.tipo ? Number(v.tipo) : null, [plan.fk_tmatricula], true)

  const set = (patch: Partial<ValoresCaso>) => setValores({ ...v, ...patch })
  const setEstudiantes = (lista: EstudianteFila[]) => {
    const suyo = lista.find((e) => e.fk_matricula === plan.fk_tmatricula) ?? v.estudiantes[0]
    set({ estudiantes: [suyo, ...lista.filter((e) => e.fk_matricula !== plan.fk_tmatricula)] })
  }
  const rol = v.estudiantes[0]?.rol ?? ""
  const cambiarTipo = (tipo: string) => {
    set({ tipo })
    if (esGrave(codigoDe(tipos, tipo))) setSiuceAbierto(true)
  }

  // «Tipo I requiere dos» lo valida el backend con los involucrados del plan y los adicionales.
  const involucradoConError = (i: InvolucradoFila) =>
    erroresInvolucrado(i, codigoDe(tiposInv, i.tipo), codigoDe(rolesSit, i.rol), v.involucrados) != null
  const validar = (): ErroresCaso => validarCaso(v, { grave, tipoI: false, secuelas, fechasCambiaron: false, involucradoConError })
  const errores: ErroresCaso = intento ? validar() : {}
  const errorEstudiantes = errores.estudiantes
  delete errores.estudiantes

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
    mut.mutate({
      planId: plan.id,
      datos: datosDeCaso(v, secuelas),
      tipoId: Number(v.tipo),
      rolId: Number(rol),
      estudiantes: v.estudiantes
        .filter((e) => e.fk_matricula !== plan.fk_tmatricula)
        .map((e) => ({ fk_matricula: e.fk_matricula, fk_tlv_rol: Number(e.rol) })),
      involucrados: v.involucrados.map(toInvolucradoInput),
      soporte: v.soporte[0] ?? null,
    })
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
    gestorPrevisto: v.tipo ? previsto.data : undefined,
    intento,
    setEstudiantes,
    errorEstudiantes,
    error,
    guardando: mut.isPending,
    guardar,
    volver,
  }
}
