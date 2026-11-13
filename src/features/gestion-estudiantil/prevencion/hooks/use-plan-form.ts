import { useCallback, useMemo, useState } from "react"

import { useNotify } from "@/components/notice/notice-context"
import { parseDateValue } from "@/lib/date-value"

import { useEstadoDialogo } from "@/features/gestion-estudiantil/commons/hooks/use-estado-dialogo"
import { enfocarPrimerError } from "@/features/gestion-estudiantil/commons/utils/validaciones"
import { useCrearPlan, useModificarPlan } from "@/features/gestion-estudiantil/prevencion/api/mutations/planes"
import type { PlanDetalle } from "@/features/gestion-estudiantil/prevencion/api/types"
import {
  accionVacia,
  accionesParaBackend,
  fechaParaBackend,
  hayErroresPlan,
  nuevaClaveAccion,
  validarPlan,
  type ValoresAccion,
  type ValoresPlan,
} from "@/features/gestion-estudiantil/prevencion/utils/formularios"

/** Valoración desde la que se crea el plan (solo lectura en el formulario). */
export interface OrigenPlan {
  id: number
  /** `aaaa-mm-dd`. */
  fecha: string
  nivelNombre: string | null
  /** Código del nivel (`BAJO`…), para el color de la etiqueta. */
  nivelValor?: string | null
}

export type ModoPlan =
  | { modo: "nuevo"; matricula: number; origen: OrigenPlan | null }
  | { modo: "modificar"; plan: PlanDetalle }

interface Opciones {
  modo: ModoPlan
  /** pk de lista (texto) por `TLISTA_VALOR.VALOR` de `TIPO_ACCION_PREVENTIVA`, para precargar al modificar. */
  tipoPorCodigo: (codigo: string) => string
  /** Responsable por defecto de las acciones (la fila `es_usuario_actual`). */
  responsableActual: string
  onClose: () => void
  onCreado?: (id: number) => void
}

function valoresIniciales(m: ModoPlan, tipoPorCodigo: (codigo: string) => string): ValoresPlan {
  if (m.modo === "modificar") {
    const p = m.plan
    return {
      objetivo: p.objetivo,
      inicio: parseDateValue(p.fecha_inicio),
      fin: parseDateValue(p.fecha_fin_prevista),
      acciones: p.acciones.map((a) => ({
        clave: nuevaClaveAccion(),
        tipo: tipoPorCodigo(a.tipo_valor),
        descripcion: a.descripcion,
        responsable: String(a.fk_responsable),
        plazo: parseDateValue(a.plazo),
        estrategia: a.fk_estrategia != null ? String(a.fk_estrategia) : "",
        estrategiaFija: a.fk_estrategia != null,
      })),
    }
  }
  return { objetivo: "", inicio: undefined, fin: undefined, acciones: [accionVacia()] }
}

/** Estado, validación y envío del plan de acompañamiento (Nuevo plan y Modificar plan comparten formulario). */
export function usePlanForm({ modo, tipoPorCodigo, responsableActual, onClose, onCreado }: Opciones) {
  const { notify } = useNotify()
  const s = useEstadoDialogo()
  const [valores, setValores] = useState<ValoresPlan>(() => valoresIniciales(modo, tipoPorCodigo))

  const alExito = (mensaje: string) => () => {
    notify(mensaje, { variant: "success" })
    onClose()
  }
  const crear = useCrearPlan({
    mutationConfig: {
      onSuccess: (r) => {
        notify("Plan de acompañamiento creado.", { variant: "success" })
        onCreado?.(r.id)
        onClose()
      },
      onError: (e: Error) => s.setError(e),
    },
  })
  const modificar = useModificarPlan({
    mutationConfig: { onSuccess: alExito("Plan de acompañamiento modificado."), onError: (e: Error) => s.setError(e) },
  })

  // Las acciones sin responsable elegido toman el funcionario actual (valor por defecto del selector).
  const efectivos = useMemo<ValoresPlan>(
    () => ({ ...valores, acciones: valores.acciones.map((a) => ({ ...a, responsable: a.responsable || responsableActual })) }),
    [valores, responsableActual],
  )
  const fechaOrigen = modo.modo === "nuevo" ? modo.origen?.fecha : modo.plan.valoracion?.fecha
  const errores = useMemo(() => validarPlan(efectivos, fechaOrigen), [efectivos, fechaOrigen])

  const set = useCallback(<K extends keyof ValoresPlan>(campo: K, valor: ValoresPlan[K]) => {
    setValores((v) => ({ ...v, [campo]: valor }))
  }, [])
  const cambiarAccion = useCallback((clave: string, patch: Partial<ValoresAccion>) => {
    setValores((v) => ({ ...v, acciones: v.acciones.map((a) => (a.clave === clave ? { ...a, ...patch } : a)) }))
  }, [])
  const agregarAccion = useCallback(() => {
    setValores((v) => ({ ...v, acciones: [...v.acciones, accionVacia()] }))
  }, [])
  const quitarAccion = useCallback((clave: string) => {
    setValores((v) => ({ ...v, acciones: v.acciones.filter((a) => a.clave !== clave) }))
  }, [])

  const enviar = () => {
    s.setIntento(true)
    s.setError(null)
    if (hayErroresPlan(errores)) {
      enfocarPrimerError()
      return
    }
    const comun = {
      OBJETIVO: efectivos.objetivo.trim(),
      FECHA_INICIO: fechaParaBackend(efectivos.inicio as Date),
      FECHA_FIN: fechaParaBackend(efectivos.fin as Date),
      ACCIONES: accionesParaBackend(efectivos.acciones),
    }
    if (modo.modo === "nuevo") {
      crear.mutate({ MATRICULA: modo.matricula, FK_VALORACION: modo.origen?.id ?? null, ...comun })
    } else {
      modificar.mutate({ id: modo.plan.id, ...comun })
    }
  }

  return {
    valores: efectivos,
    set,
    cambiarAccion,
    agregarAccion,
    quitarAccion,
    errores,
    intento: s.intento,
    error: s.error,
    pending: crear.isPending || modificar.isPending,
    enviar,
  }
}
