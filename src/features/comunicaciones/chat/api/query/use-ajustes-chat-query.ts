import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"
import type { AjustesChat } from "@/features/comunicaciones/chat/api/types"

export const AJUSTES_CHAT_DEFECTO: AjustesChat = {
  confirmacionLecturaPermitir: true,
  confirmacionLecturaSolicitar: false,
  sonido: true,
}

export async function fetchAjustesChat() {
  return evalCol.getRow<AjustesChat>("/comunicaciones/ajustes")
}

/** Ajustes del chat (confirmación de lectura y sonido). Mientras carga, el defecto. */
export function useAjustesChatQuery({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: chatKeys.ajustes,
    queryFn: fetchAjustesChat,
    staleTime: 5 * 60_000,
    enabled,
  })
}
