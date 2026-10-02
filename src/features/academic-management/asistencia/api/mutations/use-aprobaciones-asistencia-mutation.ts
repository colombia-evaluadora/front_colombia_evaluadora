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

interface ResultadoMasivo {
  resueltas: number[]
  fallidas: { id: number; codigo: string; error: string }[]
}

type RespuestaMasivo = { rows: { resultado: ResultadoMasivo }[] } | { resultado: ResultadoMasivo }[] | { resultado: ResultadoMasivo }

function leerResultado(raw: RespuestaMasivo): ResultadoMasivo {
  const fila = Array.isArray(raw) ? raw[0] : "rows" in raw ? raw.rows[0] : raw
  return fila?.resultado ?? { resueltas: [], fallidas: [] }
}

/**
 * Regla 75: una sola llamada para todo el lote. El backend resuelve cada
 * solicitud por separado y devuelve las que fallaron con su motivo.
 */
async function decidir({ decision, ids, motivo }: DecidirInput): Promise<{ fallidas: number }> {
  const raw = await api.post<RespuestaMasivo>(`/eval-col/aprobaciones/${decision}-masivo`, {
    IDS: ids,
    ...(motivo.trim() ? { MOTIVO: motivo.trim() } : {}),
  })
  const { resueltas, fallidas } = leerResultado(raw)
  if (resueltas.length === 0 && fallidas.length > 0) throw new Error(fallidas[0].error)
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
