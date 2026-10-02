import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { invalidarPlaneadorPorAsistencia } from "@/features/planeador/api/query/invalidar-por-asistencia"

type Decision = "aprobar" | "rechazar"

interface DecidirInput {
  decision: Decision
  ids: number[]
  /** Obligatorio al rechazar, opcional al aprobar (≤1000). */
  motivo: string
}

/**
 * Regla 75: el backend resuelve una solicitud por llamada. Se mandan todas y
 * se reporta cuántas fallaron, para no dejar la selección a medias sin aviso.
 */
async function decidir({ decision, ids, motivo }: DecidirInput): Promise<{ fallidas: number }> {
  const resultados = await Promise.allSettled(
    ids.map((id) =>
      api.post(`/eval-col/aprobaciones/${id}/${decision}`, motivo.trim() ? { MOTIVO: motivo.trim() } : {}),
    ),
  )
  const fallidas = resultados.filter((r) => r.status === "rejected")
  if (fallidas.length === ids.length) throw (fallidas[0] as PromiseRejectedResult).reason
  return { fallidas: fallidas.length }
}

export function useAprobacionesAsistenciaMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: decidir,
    // También cuando algunas fallaron: las que pasaron ya cambiaron.
    onSettled: (_data, _error, { decision }) => {
      queryClient.invalidateQueries({ queryKey: ["asistencia"] })
      if (decision === "aprobar") invalidarPlaneadorPorAsistencia(queryClient)
    },
  })
}
