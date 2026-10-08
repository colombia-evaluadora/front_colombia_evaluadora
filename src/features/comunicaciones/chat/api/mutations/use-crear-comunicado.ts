import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"
import type { Audiencia, Conversacion } from "@/features/comunicaciones/chat/api/types"

export interface CrearComunicadoInput {
  titulo: string
  descripcion: string
  audiencia: Audiencia[]
  publicarEn: string
  contenidoHtml: string
}

// El HTML ya va saneado desde el front, pero el backend también debe sanearlo.
export function useCrearComunicado() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (v: CrearComunicadoInput) =>
      evalCol.postRow<Conversacion>("/comunicaciones/comunicados", {
        TITULO: v.titulo,
        DESCRIPCION: v.descripcion,
        AUDIENCIA: v.audiencia,
        PUBLICAR_EN: v.publicarEn,
        CONTENIDO_HTML: v.contenidoHtml,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: chatKeys.conversaciones }),
  })
}
