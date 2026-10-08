import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { MutationConfig } from "@/lib/react-query"
import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"
import type { Mensaje } from "@/features/comunicaciones/chat/api/types"
import { formatoDeArchivo } from "@/features/comunicaciones/chat/lib/archivo-adjunto"

export interface EnviarMensajeInput {
  conversacionId: number
  texto: string
  archivo?: File | null
}

// TODO: con el backend real el archivo irá por `postMultipart` (lib/files.ts);
// hoy solo se manda su nombre y formato al mock.
async function enviarMensaje({ conversacionId, texto, archivo }: EnviarMensajeInput) {
  return evalCol.postRow<Mensaje>(`/comunicaciones/conversaciones/${conversacionId}/mensajes`, {
    TEXTO: texto,
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
      queryClient.setQueryData<Mensaje[]>(chatKeys.mensajes(mensaje.conversacionId), (prev) =>
        prev ? [...prev, mensaje] : [mensaje],
      )
      onSuccess?.(mensaje, ...args)
    },
  })
}
