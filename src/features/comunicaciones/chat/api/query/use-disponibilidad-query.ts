import { useQuery, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"
import type {
  DisponibilidadDirecto,
  EstadoDisponibilidad,
  MiDisponibilidad,
  RespuestaAutomatica,
} from "@/features/comunicaciones/chat/api/types"
import { estadoDe } from "@/features/comunicaciones/chat/lib/disponibilidad"

export const DISPONIBILIDAD_PATH = "/comunicaciones/disponibilidad"

/** Estado propio y preferencias (respuesta automática, quién lo ve). */
export function useMiDisponibilidadQuery() {
  return useQuery({
    queryKey: chatKeys.disponibilidad,
    queryFn: async () => (await evalCol.getRows<MiDisponibilidad>(DISPONIBILIDAD_PATH))[0] ?? null,
    staleTime: Infinity,
  })
}

/**
 * Estado de la otra persona de cada directo (lista de conversaciones). `idsDirectos` va en la key:
 * al aparecer un directo nuevo se vuelve a pedir.
 */
export function useDisponibilidadDirectosQuery(idsDirectos: number[]) {
  const ids = [...idsDirectos].sort((a, b) => a - b).join(",")
  return useQuery({
    queryKey: [...chatKeys.disponibilidadDirectos, ids],
    queryFn: () => evalCol.getRows<DisponibilidadDirecto>(`${DISPONIBILIDAD_PATH}/directos`),
    enabled: ids.length > 0,
    placeholderData: (prev) => prev,
  })
}

export type MapaPresencia = Record<number, EstadoDisponibilidad>

/**
 * Último estado recibido por el socket de cada persona (`presencia.actualizada`). Gana sobre el de
 * las filas REST porque siempre es posterior a la carga. El queryFn devuelve lo que ya hay: un
 * `invalidateQueries(chatKeys.all)` no lo borra.
 */
export function usePresenciaMap(): MapaPresencia {
  const queryClient = useQueryClient()
  return (
    useQuery({
      queryKey: chatKeys.presencia,
      queryFn: () => queryClient.getQueryData<MapaPresencia>(chatKeys.presencia) ?? {},
      staleTime: Infinity,
      gcTime: Infinity,
    }).data ?? {}
  )
}

/** Respuestas automáticas recibidas en esta sesión (no se guardan: el aviso es para quien escribe). */
export function useRespuestasAutomaticas(): RespuestaAutomatica[] {
  const queryClient = useQueryClient()
  return (
    useQuery({
      queryKey: chatKeys.respuestasAutomaticas,
      queryFn: () => queryClient.getQueryData<RespuestaAutomatica[]>(chatKeys.respuestasAutomaticas) ?? [],
      staleTime: Infinity,
      gcTime: Infinity,
    }).data ?? []
  )
}

/**
 * Estado de una persona: el último que llegó por el socket o, si no, el de la fila REST
 * (miembro, autor o directo). Ya viene filtrado por el servidor según quién mira.
 */
export function useEstadoPersona(
  usuarioId: number | undefined,
  fila?: { disponibilidad?: unknown; estado?: unknown; enLinea?: boolean } | null,
): EstadoDisponibilidad | undefined {
  const mapa = usePresenciaMap()
  if (usuarioId != null && mapa[usuarioId]) return mapa[usuarioId]
  return estadoDe(fila)
}
