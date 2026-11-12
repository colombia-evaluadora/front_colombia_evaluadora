import { useMemo, useState } from "react"

import { useNotify } from "@/components/notice/notice-context"
import { parseDateValue } from "@/lib/date-value"

import { useEstadoDialogo } from "@/features/gestion-estudiantil/commons/hooks/use-estado-dialogo"
import { enfocarPrimerError } from "@/features/gestion-estudiantil/commons/utils/validaciones"
import { useCrearObservacion } from "@/features/gestion-estudiantil/observaciones/api/mutations/crear-observacion"
import { useModificarObservacion } from "@/features/gestion-estudiantil/observaciones/api/mutations/modificar-observacion"
import { useResumenObservacionQuery } from "@/features/gestion-estudiantil/observaciones/api/query/use-observaciones-query"
import type {
  ObservacionDetalle,
  OpcionGrupoObservacion,
  ResumenObservacionInput,
} from "@/features/gestion-estudiantil/observaciones/api/types"
import {
  fechaParaBackend,
  hayErroresObservacion,
  validarObservacion,
  type ValoresObservacion,
} from "@/features/gestion-estudiantil/observaciones/utils/formularios"

export type ModoObservacion = { modo: "nuevo" } | { modo: "modificar"; detalle: ObservacionDetalle }

function valoresIniciales(m: ModoObservacion): ValoresObservacion {
  if (m.modo === "modificar") {
    const d = m.detalle
    return {
      grupos: [d.fk_tgrupo],
      destinatario: d.destinatario_valor,
      estudiantes: d.fk_tmatricula != null ? [d.fk_tmatricula] : [],
      fecha: parseDateValue(d.fecha),
      titulo: d.titulo ?? "",
      observacion: d.observacion,
    }
  }
  return { grupos: null, destinatario: "TODO_EL_GRUPO", estudiantes: [], fecha: undefined, titulo: "", observacion: "" }
}

interface Opciones {
  modo: ModoObservacion
  /** Grupos que el usuario dirige: con uno solo, viene elegido (§8). */
  grupos: OpcionGrupoObservacion[]
  onClose: () => void
}

/**
 * Estado, validación y envío del formulario de observación. En «nuevo», Guardar valida y abre la
 * confirmación (G.7.ACC.1) y Confirmar registra; en «modificar» solo cambian Fecha, Título y Observación
 * y se guarda directo. El período de la Fecha y el conteo de estudiantes salen del resumen del backend.
 */
export function useObservacionForm({ modo, grupos, onClose }: Opciones) {
  const { notify } = useNotify()
  const s = useEstadoDialogo()
  const [valores, setValores] = useState(() => valoresIniciales(modo))
  const [confirmando, setConfirmando] = useState(false)
  const esNuevo = modo.modo === "nuevo"

  const gruposEfectivos = useMemo(
    () => valores.grupos ?? (grupos.length === 1 ? [grupos[0].fk_tgrupo] : []),
    [valores.grupos, grupos],
  )

  const entradaResumen = useMemo<ResumenObservacionInput>(
    () => ({
      FK_TGRUPOS: gruposEfectivos,
      DESTINATARIO: valores.destinatario,
      FK_TMATRICULAS: valores.destinatario === "ESTUDIANTES_ESPECIFICOS" ? valores.estudiantes : [],
      FECHA: valores.fecha ? fechaParaBackend(valores.fecha) : null,
    }),
    [gruposEfectivos, valores.destinatario, valores.estudiantes, valores.fecha],
  )
  const resumen = useResumenObservacionQuery(entradaResumen, valores.fecha != null)
  // Con la fecha vacía se ignora el resumen anterior que `placeholderData` deja a la vista.
  const filasResumen = valores.fecha ? resumen.data : undefined

  const onError = (e: Error) => {
    setConfirmando(false)
    s.setError(e)
  }
  const crear = useCrearObservacion({
    mutationConfig: {
      onSuccess: (r) => {
        const n = r.estudiantes
        notify(`Observación guardada para ${n} ${n === 1 ? "estudiante" : "estudiantes"}.`, { variant: "success" })
        onClose()
      },
      onError,
    },
  })
  const modificar = useModificarObservacion({
    mutationConfig: {
      onSuccess: () => {
        notify("Observación modificada.", { variant: "success" })
        onClose()
      },
      onError,
    },
  })

  const errores = validarObservacion(valores, { eligeDestino: esNuevo, gruposEfectivos, resumen: filasResumen })

  function set<K extends keyof ValoresObservacion>(campo: K, valor: ValoresObservacion[K]) {
    setValores((v) => ({ ...v, [campo]: valor }))
  }

  /** Al cambiar los grupos se quitan los estudiantes de los grupos que salieron. */
  function setGrupos(next: number[], matriculasDe: (grupo: number) => number[]) {
    const validas = new Set(next.flatMap(matriculasDe))
    setValores((v) => ({ ...v, grupos: next, estudiantes: v.estudiantes.filter((m) => validas.has(m)) }))
  }

  function cuerpo() {
    return {
      FECHA: fechaParaBackend(valores.fecha as Date),
      TITULO: valores.titulo.trim() || null,
      OBSERVACION: valores.observacion.trim(),
    }
  }

  /** Guardar: valida y, en «nuevo», pasa a la confirmación. */
  function enviar() {
    s.setIntento(true)
    s.setError(null)
    // El período de la fecha se valida con el resumen: se espera a que llegue antes de dejar pasar.
    if (hayErroresObservacion(errores) || !valores.fecha || resumen.isFetching || !filasResumen) {
      enfocarPrimerError()
      return
    }
    if (modo.modo === "modificar") modificar.mutate({ id: modo.detalle.pk, ...cuerpo() })
    else setConfirmando(true)
  }

  /** Confirmar (G.7.ACC.1): registra la observación. */
  function confirmar() {
    crear.mutate({ ...entradaResumen, ...cuerpo() })
  }

  return {
    valores,
    set,
    setGrupos,
    gruposEfectivos,
    errores,
    intento: s.intento,
    error: s.error,
    resumen: filasResumen,
    cargandoResumen: resumen.isFetching,
    confirmando,
    cancelarConfirmacion: () => setConfirmando(false),
    pending: crear.isPending || modificar.isPending,
    enviar,
    confirmar,
  }
}
