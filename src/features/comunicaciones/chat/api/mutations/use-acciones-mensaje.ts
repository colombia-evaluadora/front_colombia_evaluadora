import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"
import type { Mensaje } from "@/features/comunicaciones/chat/api/types"

const base = (id: number) => `/comunicaciones/mensajes/${id}`

// Reemplaza el mensaje en la caché de su conversación con lo que devolvió el back.
function useActualizarEnCache() {
  const queryClient = useQueryClient()
  return (m: Mensaje) =>
    queryClient.setQueryData<Mensaje[]>(chatKeys.mensajes(m.conversacionId), (prev) =>
      prev?.map((x) => (x.id === m.id ? m : x)),
    )
}

export function useEditarMensaje() {
  const actualizar = useActualizarEnCache()
  return useMutation({
    mutationFn: ({ id, texto }: { id: number; texto: string }) =>
      evalCol.patchRow<Mensaje>(base(id), { TEXTO: texto }),
    onSuccess: actualizar,
  })
}

export function useFijarMensaje() {
  const actualizar = useActualizarEnCache()
  return useMutation({
    mutationFn: ({ id, fijado }: { id: number; fijado: boolean }) =>
      evalCol.patchRow<Mensaje>(`${base(id)}/fijar`, { FIJADO: fijado ? "S" : "N" }),
    onSuccess: actualizar,
  })
}

export function useEliminarAdjunto() {
  const queryClient = useQueryClient()
  const actualizar = useActualizarEnCache()
  return useMutation({
    mutationFn: (id: number) => evalCol.patchRow<Mensaje>(`${base(id)}/adjunto/eliminar`),
    onSuccess: (m) => {
      actualizar(m)
      queryClient.invalidateQueries({ queryKey: chatKeys.archivos })
    },
  })
}

export function useEliminarMensaje() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => evalCol.patchRow<Mensaje>(`${base(id)}/eliminar`),
    onSuccess: (m) => {
      queryClient.setQueryData<Mensaje[]>(chatKeys.mensajes(m.conversacionId), (prev) =>
        prev?.filter((x) => x.id !== m.id),
      )
      queryClient.invalidateQueries({ queryKey: chatKeys.archivos })
    },
  })
}
