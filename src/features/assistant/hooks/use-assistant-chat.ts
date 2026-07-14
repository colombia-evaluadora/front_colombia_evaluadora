import { useChat } from "@tanstack/ai-react"

import { assistantChat, assistantConnection } from "../lib/mock-chat"

export function useAssistantChat() {
  return useChat({
    initialMessages: assistantChat.get(1),
    connection: assistantConnection,
  })
}
