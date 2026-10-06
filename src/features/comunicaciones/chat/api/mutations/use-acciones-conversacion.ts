import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"
import type {
  CategoriaCanal,
  Conversacion,
  SilencioDuracion,
} from "@/features/comunicaciones/chat/api/types"

const base = (id: number) => `/comunicaciones/conversaciones/${id}`

function useInvalidarConversaciones() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: chatKeys.conversaciones })
}

export function useSilenciarConversacion() {
  const invalidar = useInvalidarConversaciones()
  return useMutation({
    mutationFn: ({ id, duracion }: { id: number; duracion: SilencioDuracion }) =>
      evalCol.patchRow<Conversacion>(`${base(id)}/silenciar`, { DURACION: duracion }),
    onSuccess: invalidar,
  })
}

export function useMarcarNoLeido() {
  const invalidar = useInvalidarConversaciones()
  return useMutation({
    mutationFn: (id: number) => evalCol.patchRow<Conversacion>(`${base(id)}/no-leido`),
    onSuccess: invalidar,
  })
}

export function useMarcarLeido() {
  const invalidar = useInvalidarConversaciones()
  return useMutation({
    mutationFn: (id: number) => evalCol.patchRow<Conversacion>(`${base(id)}/leido`),
    onSuccess: invalidar,
  })
}

export function useArchivarConversacion() {
  const invalidar = useInvalidarConversaciones()
  return useMutation({
    mutationFn: ({ id, archivar }: { id: number; archivar: boolean }) =>
      evalCol.patchRow<Conversacion>(`${base(id)}/${archivar ? "archivar" : "desarchivar"}`),
    onSuccess: invalidar,
  })
}

export function useDuplicarConversacion() {
  const invalidar = useInvalidarConversaciones()
  return useMutation({
    mutationFn: (id: number) => evalCol.postRow<Conversacion>(`${base(id)}/duplicar`),
    onSuccess: invalidar,
  })
}

export function useRenombrarConversacion() {
  const invalidar = useInvalidarConversaciones()
  return useMutation({
    mutationFn: ({ id, nombre }: { id: number; nombre: string }) =>
      evalCol.patchRow<Conversacion>(base(id), { NOMBRE: nombre }),
    onSuccess: invalidar,
  })
}

// Sin DELETE en eval-col: la baja es un PATCH.
export function useEliminarConversacion() {
  const invalidar = useInvalidarConversaciones()
  return useMutation({
    mutationFn: (id: number) => evalCol.patchRow<Conversacion>(`${base(id)}/eliminar`),
    onSuccess: invalidar,
  })
}

export function useSalirConversacion() {
  const invalidar = useInvalidarConversaciones()
  return useMutation({
    mutationFn: (id: number) => evalCol.patchRow<Conversacion>(`${base(id)}/salir`),
    onSuccess: invalidar,
  })
}

export function useCrearCanal() {
  const invalidar = useInvalidarConversaciones()
  return useMutation({
    mutationFn: ({ nombre, categoria }: { nombre: string; categoria: CategoriaCanal }) =>
      evalCol.postRow<Conversacion>("/comunicaciones/conversaciones", {
        NOMBRE: nombre,
        CATEGORIA: categoria,
      }),
    onSuccess: invalidar,
  })
}
