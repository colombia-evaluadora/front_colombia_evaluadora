import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { evalCol } from "@/lib/eval-col-client"
import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"
import type { Conversacion, Invitacion } from "@/features/comunicaciones/chat/api/types"

/**
 * Invitaciones pendientes a grupos (decisión de Natalia: un acudiente entra a un grupo solo si
 * acepta, y puede rechazar). comms-service avisa en vivo (`invitaciones.actualizadas` en el tópico
 * del usuario) y con la notificación CHAT_GRUPO_INVITACION de la campana.
 */
export function useInvitacionesQuery(enabled = true) {
  return useQuery({
    queryKey: chatKeys.invitaciones,
    queryFn: () => evalCol.getRows<Invitacion>("/comunicaciones/invitaciones"),
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

/** Aceptar: el grupo aparece en la lista (ve el historial y cuenta como miembro). */
export function useAceptarInvitacion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => evalCol.patchRow<Conversacion>(ruta(id, "aceptar")),
    onSuccess: (c) => {
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
export function useRechazarInvitacion() {
  const queryClient = useQueryClient()
  return useMutation({
    // Devuelve las que quedan pendientes; se vuelve a pedir la lista (forma `{rows}` del servidor).
    mutationFn: (id: number) => api.patch(`/eval-col${ruta(id, "rechazar")}`),
    onSuccess: (_r, id) => {
      queryClient.setQueryData<Invitacion[]>(chatKeys.invitaciones, (prev) =>
        prev?.filter((i) => i.conversacionId !== id),
      )
      return queryClient.invalidateQueries({ queryKey: chatKeys.invitaciones })
    },
  })
}
