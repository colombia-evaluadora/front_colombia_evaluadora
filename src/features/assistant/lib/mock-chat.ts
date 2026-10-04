import { createChat } from "@shadcn/helpers/tanstack-ai"

import { ASSISTANT_PROXIMAMENTE_MENSAJE } from "@/features/assistant/lib/availability"

// Conexión de ejemplo con respuestas fijas. Se reemplaza por la conexión real cuando
// el backend del asistente exista; ver `availability.ts`.
export const assistantChat = createChat().assistant(
  "¡Hola! Soy el asistente de Colombia Evaluadora. ¿En qué puedo ayudarte?",
)

export const assistantConnection = assistantChat.transport({
  fallback: ASSISTANT_PROXIMAMENTE_MENSAJE,
})
