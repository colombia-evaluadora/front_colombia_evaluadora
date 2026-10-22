import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"
import type { Audiencia, Comunicado, Conversacion } from "@/features/comunicaciones/chat/api/types"

export interface CrearComunicadoInput {
  titulo: string
  descripcion: string
  audiencia: Audiencia[]
  publicarEn: string
  contenidoHtml: string
}

const cuerpoComunicado = (v: CrearComunicadoInput) => ({
  TITULO: v.titulo,
  DESCRIPCION: v.descripcion,
  AUDIENCIA: v.audiencia,
  PUBLICAR_EN: v.publicarEn,
  CONTENIDO_HTML: v.contenidoHtml,
})

// El HTML ya va saneado desde el front, pero el backend también debe sanearlo.
export function useCrearComunicado() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (v: CrearComunicadoInput) =>
      evalCol.postRow<Conversacion>("/comunicaciones/comunicados", cuerpoComunicado(v)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: chatKeys.conversaciones }),
  })
}

/**
 * "Editar Comunicado" (diseño 4062:67938): título, descripción y contenido siempre; audiencia y
 * fecha solo mientras siga programado (comms-service responde 409 si ya se publicó).
 */
export function useEditarComunicado(conversacionId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (v: CrearComunicadoInput) =>
      evalCol.patchRow<Comunicado>(`/comunicaciones/conversaciones/${conversacionId}/comunicado`, cuerpoComunicado(v)),
    onSuccess: (c) => {
      queryClient.setQueryData(chatKeys.comunicado(conversacionId), c)
      return queryClient.invalidateQueries({ queryKey: chatKeys.conversaciones })
    },
  })
}
