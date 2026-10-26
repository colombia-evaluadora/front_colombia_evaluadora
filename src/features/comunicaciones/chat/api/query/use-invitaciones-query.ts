import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { evalCol } from "@/lib/eval-col-client"
import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"
import type { Conversacion, Invitacion } from "@/features/comunicaciones/chat/api/types"
import { offlineMeta, TTL_OFFLINE } from "@/lib/offline/query-meta"

export const fetchInvitaciones = () => evalCol.getRows<Invitacion>("/comunicaciones/invitaciones")

/**
 * Invitaciones pendientes a grupos (decisión de Natalia: un acudiente entra a un grupo solo si
 * acepta, y puede rechazar). comms-service avisa en vivo (`invitaciones.actualizadas` en el tópico
 * del usuario) y con la notificación CHAT_GRUPO_INVITACION de la campana.
 */
export function useInvitacionesQuery(enabled = true) {
  return useQuery({
    queryKey: chatKeys.invitaciones,
    queryFn: fetchInvitaciones,
    // Se guarda en el equipo (y la prepara "Preparar") para que el chat sin
    // red no quede con un dato faltante; aceptar o rechazar sigue con red.
    meta: offlineMeta(TTL_OFFLINE.detalle),
    enabled,
    staleTime: 30_000,
  })
}

/** Canal de una invitación a partir del deep link de la notificación (`?invitacion=<id>`). */
export function canalDeInvitacion(deepLink: string | null | undefined): number | null {
  const m = /[?&]invitacion=(\d+)/.exec(deepLink ?? "")
  return m ? Number(m[1]) : null
}

const ruta = (id: number, accion: "aceptar" | "rechazar") =>
  `/comunicaciones/conversaciones/${id}/invitacion/${accion}`

/**
 * Lo que la pantalla hace al responder (avisar, abrir el grupo) va en el hook y no en
 * `mutate(id, { onSuccess })`: el onSuccess del hook saca la invitación del cache y eso desmonta
 * la tarjeta que llamó a `mutate`; TanStack Query no corre los callbacks de `mutate` de un
 * observer desmontado, así que "Te uniste a…" y abrir el grupo nunca pasaban (QA acudiente).
 * Por eso se llaman ANTES de tocar el cache.
 */
interface AceptarInvitacionOptions {
  onAceptada?: (conversacion: Conversacion) => void
}

interface RechazarInvitacionOptions {
  onRechazada?: (conversacionId: number) => void
}

/** Aceptar: el grupo aparece en la lista (ve el historial y cuenta como miembro). */
export function useAceptarInvitacion({ onAceptada }: AceptarInvitacionOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => evalCol.patchRow<Conversacion>(ruta(id, "aceptar")),
    onSuccess: (c) => {
      onAceptada?.(c)
      queryClient.setQueryData<Invitacion[]>(chatKeys.invitaciones, (prev) =>
        prev?.filter((i) => i.conversacionId !== c.id),
      )
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: chatKeys.invitaciones }),
        queryClient.invalidateQueries({ queryKey: chatKeys.conversaciones }),
      ])
    },
  })
}

/** Rechazar: no entra; quien gestiona el grupo lo ve como "Invitación rechazada". */
export function useRechazarInvitacion({ onRechazada }: RechazarInvitacionOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    // Devuelve las que quedan pendientes; se vuelve a pedir la lista (forma `{rows}` del servidor).
    mutationFn: (id: number) => api.patch(`/eval-col${ruta(id, "rechazar")}`),
    onSuccess: (_r, id) => {
      onRechazada?.(id)
      queryClient.setQueryData<Invitacion[]>(chatKeys.invitaciones, (prev) =>
        prev?.filter((i) => i.conversacionId !== id),
      )
      return queryClient.invalidateQueries({ queryKey: chatKeys.invitaciones })
    },
  })
}
