import { createChat } from "@shadcn/helpers/tanstack-ai"

export const assistantChat = createChat().assistant(
  "¡Hola! Soy el asistente de Colombia Evaluadora. Esta es una demo: " +
    "puedo responder con mensajes de ejemplo mientras conectamos un " +
    "modelo real."
)

export const assistantConnection = assistantChat.transport({
  fallback:
    "Esta es una demo sin modelo conectado todavía, así que no puedo " +
    "responder a mensajes libres por ahora.",
})
