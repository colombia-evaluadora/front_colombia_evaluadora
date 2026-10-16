import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { MutationConfig } from "@/lib/react-query"
import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"
import type { Mensaje } from "@/features/comunicaciones/chat/api/types"
import { formatoDeArchivo } from "@/features/comunicaciones/chat/lib/archivo-adjunto"
import { upsertMensaje } from "@/features/comunicaciones/chat/api/use-chat-tiempo-real"

export interface EnviarMensajeInput {
  conversacionId: number
  texto: string
  archivo?: File | null
  // Mensaje al que responde (respuesta citada).
  respuestaA?: number | null
  /**
   * UUID del intento (`CLIENT_MESSAGE_ID`): comms-service lo usa para que un
   * reintento del mismo mensaje no lo duplique. Quien reintenta debe reusar el
   * mismo valor; si falta se genera uno nuevo.
   */
  clientMessageId?: string
}

// TODO: con el backend real el archivo irá por `postMultipart` (lib/files.ts);
// hoy solo se manda su nombre y formato al mock.
async function enviarMensaje({ conversacionId, texto, archivo, respuestaA, clientMessageId }: EnviarMensajeInput) {
  return evalCol.postRow<Mensaje>(`/comunicaciones/conversaciones/${conversacionId}/mensajes`, {
    // Las menciones viajan dentro del texto como `<@id>`; el servidor las valida.
    TEXTO: texto,
    CLIENT_MESSAGE_ID: clientMessageId ?? crypto.randomUUID(),
    ...(respuestaA && { FK_MENSAJE_RESPUESTA: respuestaA }),
    ...(archivo && { ADJUNTO_NOMBRE: archivo.name, ADJUNTO_FORMATO: formatoDeArchivo(archivo) }),
  })
}

export function useEnviarMensaje({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof enviarMensaje> } = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: enviarMensaje,
    ...rest,
    onSuccess: (mensaje, ...args) => {
      // Se agrega al final sin esperar el refetch para que el envío se sienta inmediato.
      // `upsert`: el evento en vivo `mensaje.creado` pudo llegar antes que la respuesta.
      queryClient.setQueryData<Mensaje[]>(chatKeys.mensajes(mensaje.conversacionId), (prev) =>
        prev ? upsertMensaje(prev, mensaje) : [mensaje],
      )
      onSuccess?.(mensaje, ...args)
    },
  })
}
