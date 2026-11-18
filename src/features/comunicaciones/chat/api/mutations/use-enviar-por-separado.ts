import { useMutation } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { MutationConfig } from "@/lib/react-query"
import { useInvalidarConversaciones } from "@/features/comunicaciones/chat/api/mutations/use-acciones-conversacion"

/** Resultado de "Enviar por separado": un directo nuevo por destinatario y los que no se pudo. */
export interface ResultadoPorSeparado {
  conversaciones: { destinatario: number; conversacion: number }[]
  rechazados: { destinatario: number; motivo: string }[]
}

export interface EnviarPorSeparadoInput {
  destinatarios: number[]
  asunto: string
  mensaje: string
}

/**
 * `POST /comunicaciones/mensajes/por-separado` (SSO #1006, M.2.NUE.2): el mismo asunto y mensaje
 * a cada persona en un directo propio (hasta 200, sin adjuntos). Cuenta como un solo envío para el
 * límite de frecuencia (429). Los que la política no permite vuelven en `rechazados` con su motivo.
 */
async function enviarPorSeparado({ destinatarios, asunto, mensaje }: EnviarPorSeparadoInput) {
  const fila = await evalCol.postRow<Partial<ResultadoPorSeparado>>("/comunicaciones/mensajes/por-separado", {
    DESTINATARIOS: destinatarios,
    ASUNTO: asunto,
    MENSAJE: mensaje,
  })
  return { conversaciones: fila.conversaciones ?? [], rechazados: fila.rechazados ?? [] }
}

export function useEnviarPorSeparado({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof enviarPorSeparado> } = {}) {
  const invalidar = useInvalidarConversaciones()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: enviarPorSeparado,
    ...rest,
    onSuccess: (...args) => {
      void invalidar()
      onSuccess?.(...args)
    },
  })
}
