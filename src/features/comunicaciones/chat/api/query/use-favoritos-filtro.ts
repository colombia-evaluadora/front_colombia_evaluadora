import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { evalCol } from "@/lib/eval-col-client"
import { busquedaChatKeys } from "@/features/comunicaciones/chat/api/query/use-busqueda-chat-query"
import { cuerpoBusqueda, type FiltrosChat } from "@/features/comunicaciones/chat/lib/filtros-chat"

/**
 * Filtros favoritos del historial (comms-service `/comunicaciones/buscar/favoritos`): cada persona
 * guarda, aplica, renombra y elimina los suyos. `filtros` es el cuerpo de la búsqueda sin paginación.
 */
export interface FiltroFavorito {
  id: number
  nombre: string
  filtros: Record<string, unknown>
  creadoEn: string
  modificadoEn: string
}

const RUTA = "/comunicaciones/buscar/favoritos"
export const favoritosFiltroKey = [...busquedaChatKeys.all, "favoritos"] as const

export function useFavoritosFiltroQuery(enabled = true) {
  return useQuery({
    queryKey: favoritosFiltroKey,
    queryFn: () => evalCol.getRows<FiltroFavorito>(RUTA),
    enabled,
    staleTime: 5 * 60_000,
  })
}

// Sin la paginación: el favorito guarda solo lo que filtra.
const cuerpo = (f: FiltrosChat) => cuerpoBusqueda(f)

export function useGuardarFavoritoFiltro() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ nombre, filtros }: { nombre: string; filtros: FiltrosChat }) => {
      return evalCol.postRow<FiltroFavorito>(RUTA, { NOMBRE: nombre, FILTROS: cuerpo(filtros) })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: favoritosFiltroKey }),
  })
}

export function useEditarFavoritoFiltro() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, nombre, filtros }: { id: number; nombre?: string; filtros?: FiltrosChat }) => {
      return evalCol.patchRow<FiltroFavorito>(`${RUTA}/${id}`, {
        ...(nombre != null && { NOMBRE: nombre }),
        ...(filtros && { FILTROS: cuerpo(filtros) }),
      })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: favoritosFiltroKey }),
  })
}

export function useEliminarFavoritoFiltro() {
  const queryClient = useQueryClient()
  return useMutation({
    // Devuelve los que quedan.
    mutationFn: async (id: number) => {
      await api.patch(`/eval-col${RUTA}/${id}/eliminar`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: favoritosFiltroKey }),
  })
}
