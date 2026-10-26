import { useEffect } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"
import type { Conversacion } from "@/features/comunicaciones/chat/api/types"

/**
 * Colevabot (comms-service `BotService`): al abrir el chat se asegura su conversación (con la
 * bienvenida) y se publica el resumen de lo pendiente (solicitudes de aprobación de quien las
 * resuelve). Es idempotente: una tarjeta con la misma clave no se repite.
 */
export function sincronizarBot() {
  return evalCol.postRow<Conversacion>("/comunicaciones/bot/sincronizar", {})
}

/** Una vez por montaje de la pantalla del chat; deja la conversación del bot en la lista. */
export function useSincronizarBot(habilitado: boolean) {
  const queryClient = useQueryClient()
  const { mutate } = useMutation({
    mutationFn: sincronizarBot,
    onSuccess: (bot) => {
      queryClient.setQueryData<Conversacion[]>(chatKeys.conversaciones, (prev) => {
        if (!prev) return prev
        return prev.some((c) => c.id === bot.id)
          ? prev.map((c) => (c.id === bot.id ? bot : c))
          : [bot, ...prev]
      })
    },
  })
  useEffect(() => {
    if (habilitado) mutate()
  }, [habilitado, mutate])
}
