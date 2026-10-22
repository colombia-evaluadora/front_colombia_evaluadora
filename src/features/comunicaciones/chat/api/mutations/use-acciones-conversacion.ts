import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"
import type {
  CategoriaCanal,
  Conversacion,
  SilencioDuracion,
} from "@/features/comunicaciones/chat/api/types"
import type { CuerpoSeleccion } from "@/features/comunicaciones/chat/lib/seleccion-grupal"

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

/** Clave de la mutación de salir: el tiempo real la consulta para no pedir miembros de un canal que se deja. */
export const SALIR_MUTATION_KEY = ["comunicaciones-chat", "salir"] as const

export function useSalirConversacion() {
  const queryClient = useQueryClient()
  const invalidar = useInvalidarConversaciones()
  return useMutation({
    mutationKey: SALIR_MUTATION_KEY,
    mutationFn: (id: number) => evalCol.patchRow<Conversacion>(`${base(id)}/salir`),
    onMutate: (id) => queryClient.cancelQueries({ queryKey: chatKeys.miembros(id) }),
    onSuccess: (_data, id) => {
      // Ya no es miembro: nada de esa conversación se vuelve a pedir (sería 404).
      queryClient.setQueryData<Conversacion[]>(chatKeys.conversaciones, (prev) => prev?.filter((x) => x.id !== id))
      queryClient.removeQueries({ queryKey: chatKeys.miembros(id) })
      queryClient.removeQueries({ queryKey: chatKeys.mensajes(id) })
      return invalidar()
    },
  })
}

export function useCrearCanal() {
  const invalidar = useInvalidarConversaciones()
  return useMutation({
    mutationFn: ({
      nombre,
      categoria,
      miembros = [],
      tipo,
      grupal,
    }: {
      nombre: string
      categoria: CategoriaCanal
      miembros?: number[]
      // GRUPO: conversación de un grupo de personas; sin tipo, un foro (CANAL).
      tipo?: "CANAL" | "GRUPO"
      // Solo GRUPO: grados, grupos académicos y cargos que comms-service resuelve en el servidor.
      grupal?: Pick<CuerpoSeleccion, "GRADOS" | "GRUPOS" | "ROLES">
    }) =>
      evalCol.postRow<Conversacion>("/comunicaciones/conversaciones", {
        NOMBRE: nombre,
        CATEGORIA: categoria,
        MIEMBROS: miembros,
        ...(tipo ? { TIPO: tipo } : {}),
        ...(grupal ?? {}),
      }),
    onSuccess: invalidar,
  })
}
