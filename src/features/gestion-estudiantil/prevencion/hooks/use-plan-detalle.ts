import { useCallback, useMemo } from "react"

import { useValoracionQuery } from "@/features/gestion-estudiantil/prevencion/api/query/use-valoraciones-query"
import type { AccionPlan, AvanceAccion, PlanDetalle } from "@/features/gestion-estudiantil/prevencion/api/types"
import { useDialogosPrevencion } from "@/features/gestion-estudiantil/prevencion/components/dialogos/use-dialogos-prevencion"
import { useNavegacionPrevencion } from "@/features/gestion-estudiantil/prevencion/hooks/use-navegacion-prevencion"

export type AvancePlan = AvanceAccion & { accion: AccionPlan }

const CANAL_ETIQUETA: Record<string, string> = { PORTAL: "Portal del acudiente", PRESENCIAL: "Presencial" }

/** Estado derivado del detalle del plan (avances ordenados, banderas, canal) y apertura de sus operaciones. */
export function usePlanDetalle(p: PlanDetalle) {
  const { volver, irPlanEditar, irAbrirCaso, irCaso } = useNavegacionPrevencion()
  const dialogos = useDialogosPrevencion()
  const origen = useValoracionQuery(p.valoracion ? (p.fk_tprevencion_valoracion ?? undefined) : undefined)
  const avances = useMemo<AvancePlan[]>(
    () =>
      p.acciones
        .flatMap((a) => a.avances.map((v) => ({ ...v, accion: a })))
        .sort((x, y) => (x.fecha < y.fecha ? 1 : x.fecha > y.fecha ? -1 : y.id - x.id)),
    [p.acciones],
  )
  const estudiante = p.estudiante_nombre
  const hayAvanzable = p.acciones.some((a) => a.puede_registrar_avance)
  const canal = p.canal_aceptacion ? (CANAL_ETIQUETA[p.canal_aceptacion] ?? p.canal_aceptacion) : null
  const { abrir } = dialogos

  const marcar = useCallback(
    (estado: "SUPERADO" | "INCUMPLIDO") => abrir({ dialogo: "marcar", planId: p.id, estudiante, estado }),
    [abrir, p.id, estudiante],
  )
  const registrarAvance = useCallback(
    (accionId?: number) => abrir({ dialogo: "avance", planId: p.id, estudiante, accionId }),
    [abrir, p.id, estudiante],
  )
  const aceptarPresencial = useCallback(
    () => abrir({ dialogo: "aceptacion", planId: p.id, estudiante }),
    [abrir, p.id, estudiante],
  )
  const anular = useCallback(() => abrir({ dialogo: "anular-plan", planId: p.id, estudiante }), [abrir, p.id, estudiante])
  const modificar = useCallback(() => irPlanEditar(p.id), [irPlanEditar, p.id])

  const abrirCaso = useCallback(() => irAbrirCaso(p.id), [irAbrirCaso, p.id])
  const verCaso = useCallback(() => {
    if (p.caso_convivencia) irCaso(p.caso_convivencia.id)
  }, [irCaso, p.caso_convivencia])

  return {
    estudiante,
    abrirCaso,
    verCaso,
    analisisOrigen: origen.data && p.ve_sensible ? origen.data.analisis : null,
    avances,
    hayAvanzable,
    canal,
    dialogos: dialogos.dialogos,
    volver,
    marcar,
    registrarAvance,
    aceptarPresencial,
    anular,
    modificar,
  }
}
