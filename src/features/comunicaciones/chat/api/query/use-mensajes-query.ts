import { TTL_OFFLINE, offlineMeta } from "@/lib/offline/query-meta"
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query"

import { useAuth } from "@/features/auth/hooks/use-auth"
import { evalCol } from "@/lib/eval-col-client"
import { realtimeEnabled } from "@/lib/realtime"
import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"
import type { Mensaje } from "@/features/comunicaciones/chat/api/types"
import { personalizarMensajes } from "@/features/comunicaciones/chat/lib/personalizar-mensaje"

/**
 * `GET .../mensajes` sin parámetros devuelve los últimos 200 en orden
 * ascendente (comms-service, PR SSO #692; el mock replica el corte). Si llega
 * la página llena puede haber historial anterior: se pide con `?antes=<id>`.
 */
export const MENSAJES_PAGINA_INICIAL = 200
/** Tamaño de cada página de historial anterior (`?limite=`, máx. 500). */
export const MENSAJES_PAGINA_ANTERIOR = 50

async function fetchMensajes(conversacionId: number, params?: { antes: number; limite: number }) {
  const qs = params ? `?antes=${params.antes}&limite=${params.limite}` : ""
  return evalCol.getRows<Mensaje>(`/comunicaciones/conversaciones/${conversacionId}/mensajes${qs}`)
}

/**
 * Une la página más reciente con lo que ya había en cache: el historial
 * anterior cargado a mano (ids menores al primero de la página) no se pierde
 * al refrescar por polling o por un `resync` del socket.
 */
function conservarAnteriores(nuevos: Mensaje[], prev: Mensaje[] | undefined): Mensaje[] {
  if (!prev?.length || nuevos.length < MENSAJES_PAGINA_INICIAL) return nuevos
  const primero = nuevos[0]?.id
  const anteriores = prev.filter((m) => m.id < primero)
  return anteriores.length ? [...anteriores, ...nuevos] : nuevos
}

export function useMensajesQuery(conversacionId: number | undefined) {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const userId = user?.userId
  const key = chatKeys.mensajes(conversacionId ?? "none")
  return useQuery({
    queryKey: key,
    meta: offlineMeta(TTL_OFFLINE.detalle),
    // `enabled` garantiza que hay id.
    queryFn: async () =>
      conservarAnteriores(
        await fetchMensajes(conversacionId as number),
        queryClient.getQueryData<Mensaje[]>(key),
      ),
    enabled: Boolean(conversacionId),
    // La cache guarda la forma del servidor; `esPropio`/`meMenciona`/`mia` se
    // calculan al leer, así cubre REST, eventos del socket y respuestas de mutaciones.
    select: (data) => personalizarMensajes(data, userId),
    // Con tiempo real los eventos parchean la cache; sin él, polling.
    refetchInterval: realtimeEnabled ? false : 15_000,
  })
}

/** ¿Puede haber historial anterior al primer mensaje cargado? */
export const hayMensajesAnteriores = (mensajes: Mensaje[] | undefined, agotado: boolean) =>
  !agotado && (mensajes?.length ?? 0) >= MENSAJES_PAGINA_INICIAL

async function cargarAnteriores(queryClient: QueryClient, conversacionId: number) {
  const key = chatKeys.mensajes(conversacionId)
  const actuales = queryClient.getQueryData<Mensaje[]>(key) ?? []
  const primero = actuales[0]?.id
  if (primero == null) return { agotado: true }
  const anteriores = await fetchMensajes(conversacionId, { antes: primero, limite: MENSAJES_PAGINA_ANTERIOR })
  queryClient.setQueryData<Mensaje[]>(key, (prev = []) => {
    const ids = new Set(prev.map((m) => m.id))
    return [...anteriores.filter((m) => !ids.has(m.id)), ...prev]
  })
  return { agotado: anteriores.length < MENSAJES_PAGINA_ANTERIOR }
}

/** "Cargar mensajes anteriores": antepone la página `?antes=&limite=` a la cache. */
export function useCargarMensajesAnteriores() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (conversacionId: number) => cargarAnteriores(queryClient, conversacionId),
  })
}
