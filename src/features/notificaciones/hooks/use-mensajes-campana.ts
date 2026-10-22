import { useQuery, useQueryClient } from "@tanstack/react-query"

import { paths } from "@/config/paths"
import { topicoUsuario } from "@/lib/auth-mapper"
import { useRealtimeTopic } from "@/lib/realtime/use-realtime"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { useNavItemsQuery } from "@/features/navigation/api/query/use-nav-items-query"
import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"
import { fetchConversaciones } from "@/features/comunicaciones/chat/api/query/use-conversaciones-query"
import { aplicarEventoUsuario } from "@/features/comunicaciones/chat/api/use-chat-tiempo-real"

const CHAT_HREF = paths.app.comunicacionesChat.getHref()

/** El usuario tiene el chat en su menú (comms-service responde 403 sin el menú COMUNICACIONES). */
export function useTieneChat(): boolean {
  const { data } = useNavItemsQuery()
  return !!data?.some(
    (i) => i.url.startsWith(CHAT_HREF) || i.items?.some((s) => s.url.startsWith(CHAT_HREF)),
  )
}

/** Conversaciones del chat para la campana; solo se piden (y se escuchan en vivo) con ella abierta. */
export function useConversacionesCampana(habilitado: boolean) {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const query = useQuery({
    queryKey: chatKeys.conversaciones,
    queryFn: fetchConversaciones,
    enabled: habilitado,
  })
  useRealtimeTopic(habilitado && user ? topicoUsuario(user) : null, (e) => {
    aplicarEventoUsuario(queryClient, e)
  })
  return query
}
