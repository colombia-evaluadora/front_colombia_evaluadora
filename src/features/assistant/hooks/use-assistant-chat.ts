import { useChat } from "@tanstack/ai-react"

import { ASSISTANT_DISPONIBLE } from "@/features/assistant/lib/availability"
import { assistantChat, assistantConnection } from "@/features/assistant/lib/mock-chat"

export function useAssistantChat() {
  return useChat({
    // Sin saludo mientras no esté disponible: la lista vacía muestra el
    // estado "Próximamente".
    initialMessages: ASSISTANT_DISPONIBLE ? assistantChat.get(1) : [],
    connection: assistantConnection,
  })
}
