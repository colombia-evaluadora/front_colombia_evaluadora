import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { MutationConfig } from "@/lib/react-query"
import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"
import type { Mensaje } from "@/features/comunicaciones/chat/api/types"
import { postMultipart } from "@/lib/files"
import { upsertMensaje } from "@/features/comunicaciones/chat/api/use-chat-tiempo-real"

export interface EnviarMensajeInput {
  conversacionId: number
  texto: string
  // Hasta 10 (`MAX_ADJUNTOS`), en el orden en que se muestran.
  archivos?: File[]
  // Mensaje al que responde (respuesta citada).
  respuestaA?: number | null
  /**
   * UUID del intento (`CLIENT_MESSAGE_ID`): comms-service lo usa para que un
   * reintento del mismo mensaje no lo duplique. Quien reintenta debe reusar el
   * mismo valor; si falta se genera uno nuevo.
   */
  clientMessageId?: string
}

/**
 * Con archivo, el mismo POST viaja como multipart por file-service
 * (`/files/eval-col/...`): sube el binario, lo registra en TARCHIVO y reenvía
 * el JSON a comms-service con `ADJUNTO` = su `pk_tarchivo`. Con varios archivos el
 * campo `ADJUNTO` se repite y llega como lista (`TransformadorMultipart`). Nombre,
 * formato y peso los toma el servidor del archivo, no del cliente.
 */
async function enviarMensaje({ conversacionId, texto, archivos = [], respuestaA, clientMessageId }: EnviarMensajeInput) {
  const ruta = `/comunicaciones/conversaciones/${conversacionId}/mensajes`
  const campos = {
    // Las menciones viajan dentro del texto como `<@id>`; el servidor las valida.
    TEXTO: texto,
    CLIENT_MESSAGE_ID: clientMessageId ?? crypto.randomUUID(),
    ...(respuestaA && { FK_MENSAJE_RESPUESTA: respuestaA }),
  }
  if (archivos.length === 0) return evalCol.postRow<Mensaje>(ruta, campos)
  const crudo = await postMultipart<string | { rows: Mensaje[] } | Mensaje[]>(`/eval-col${ruta}`, campos, {
    ADJUNTO: archivos,
  })
  // file-service reenvía el cuerpo de comms-service tal cual; por si llega como texto.
  const body = typeof crudo === "string" ? (JSON.parse(crudo) as { rows: Mensaje[] }) : crudo
  const [mensaje] = Array.isArray(body) ? body : (body?.rows ?? [])
  if (!mensaje) throw new Error("La respuesta del envío no trajo el mensaje.")
  return mensaje
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
      // Con adjunto, el archivo aparece en "Archivos": se refresca su lista (`chatKeys.archivos` es
      // la key exacta de `useArchivosQuery`). Sin esto solo se veía al recargar.
      if (mensaje.adjunto) void queryClient.invalidateQueries({ queryKey: chatKeys.archivos })
      onSuccess?.(mensaje, ...args)
    },
  })
}
