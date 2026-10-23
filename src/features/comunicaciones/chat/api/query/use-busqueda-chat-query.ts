import { useEffect, useState } from "react"
import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"
import type { CategoriaCanal, TipoConversacion } from "@/features/comunicaciones/chat/api/types"
import type { PerfilChat } from "@/features/comunicaciones/chat/lib/politica-chat"
import {
  cuerpoBusqueda,
  filtrosEfectivos,
  hayFiltros,
  type FiltrosChat,
} from "@/features/comunicaciones/chat/lib/filtros-chat"

/** Mensaje encontrado (`POST /comunicaciones/buscar`), en formato chat. */
export interface ResultadoMensaje {
  id: number
  conversacionId: number
  conversacion: string
  tipoConversacion: TipoConversacion
  categoria: CategoriaCanal | null
  autorId: number
  autor: string
  perfilAutor: PerfilChat
  esPropio: boolean
  // Vacío en un eliminado salvo para quien puede ver el original (directivo, nunca el autor).
  texto: string
  fecha: string
  // Nombre del adjunto vigente (null si no tiene o se eliminó).
  adjunto: string | null
  editado: boolean
  eliminado: boolean
  // El usuario aún no lo ha leído.
  noLeido: boolean
}

export interface ResultadoBusqueda {
  // Conversaciones que cumplen los filtros (solo en la primera página).
  conversaciones: number[]
  mensajes: ResultadoMensaje[]
  hayMas: boolean
}

/** Grupo académico que se ofrece en el filtro (`valor` = pk_tgrupo). */
export interface OpcionGrupo {
  valor: string
  etiqueta: string
  detalle: string | null
  total: number
}

export interface OpcionesFiltro {
  grupos: OpcionGrupo[]
  perfiles: PerfilChat[]
}

// Fuera de `conversaciones`: invalidar la lista no repite la búsqueda.
export const busquedaChatKeys = {
  all: [...chatKeys.all, "busqueda"] as const,
  resultados: (filtros: FiltrosChat) => [...chatKeys.all, "busqueda", "resultados", filtros] as const,
  opciones: [...chatKeys.all, "busqueda", "opciones"] as const,
}

const ESPERA_MS = 300

// Por la clave serializada: un objeto igual en cada render no reprograma la espera.
function useDebounced<T>(valor: T): T {
  const clave = JSON.stringify(valor)
  const [v, setV] = useState(clave)
  useEffect(() => {
    const t = setTimeout(() => setV(clave), ESPERA_MS)
    return () => clearTimeout(t)
  }, [clave])
  return JSON.parse(v) as T
}

export async function fetchBusquedaChat(filtros: FiltrosChat, antes?: number | null) {
  const [fila] = await evalCol.postRows<ResultadoBusqueda>("/comunicaciones/buscar", cuerpoBusqueda(filtros, antes))
  return fila ?? { conversaciones: [], mensajes: [], hayMas: false }
}

/**
 * Búsqueda del servidor con los filtros combinados; pagina hacia atrás por id de mensaje
 * ("Ver más"). Sin filtros efectivos no consulta.
 */
export function useBusquedaChatQuery(filtros: FiltrosChat) {
  const efectivos = useDebounced(filtrosEfectivos(filtros))
  return useInfiniteQuery({
    queryKey: busquedaChatKeys.resultados(efectivos),
    queryFn: ({ pageParam }) => fetchBusquedaChat(efectivos, pageParam),
    initialPageParam: null as number | null,
    getNextPageParam: (ultima) => (ultima.hayMas ? (ultima.mensajes.at(-1)?.id ?? null) : null),
    enabled: hayFiltros(efectivos),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  })
}

/** Grupos académicos y roles de las personas con las que el usuario conversa. */
export function useOpcionesFiltroQuery(enabled = true) {
  return useQuery({
    queryKey: busquedaChatKeys.opciones,
    queryFn: async () => {
      const [fila] = await evalCol.getRows<OpcionesFiltro>("/comunicaciones/buscar/opciones")
      return fila ?? { grupos: [], perfiles: [] }
    },
    enabled,
    staleTime: 5 * 60_000,
  })
}
