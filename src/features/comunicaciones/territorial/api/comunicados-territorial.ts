import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { evalCol } from "@/lib/eval-col-client"
import type { Audiencia, DestinosComunicado, OpcionSeleccion } from "@/features/comunicaciones/chat/api/types"

const RUTA = "/comunicaciones/comunicados/territorial"

// Cancelado no sale: se retiró antes de publicarse y nunca llegó a nadie (comms-service).
export type EstadoTerritorial = "PROGRAMADO" | "PUBLICADO" | "VENCIDO" | "ANULADO"

export interface ComunicadoTerritorial {
  id: number
  titulo: string
  publicarEn: string
  establecimientoId: number
  establecimiento: string
  publicadoPor: string
  audiencia: Audiencia[]
  destinos: DestinosComunicado | null
  destinatarios: number
  estado: EstadoTerritorial
  importante: boolean
}

export interface ComunicadoTerritorialDetalle {
  comunicado: ComunicadoTerritorial
  // Vacío en un comunicado anulado: de ese solo se ve la fila.
  contenidoHtml: string
  visibleHasta: string | null
  adjuntos: string[]
}

export interface FiltrosTerritorial {
  establecimiento?: string
  estado?: string
  desde?: string
  q?: string
}

/** Filtro por establecimiento: comms-service solo devuelve los que el usuario tiene a cargo. */
export function useEstablecimientosTerritorialQuery() {
  return useQuery({
    queryKey: ["comunicados-territorial", "establecimientos"],
    queryFn: () => evalCol.getRows<OpcionSeleccion>(`${RUTA}/establecimientos`),
    staleTime: Infinity,
  })
}

/** Página 0-based de la consulta; comms-service acepta `tamano` entre 1 y 100. */
export interface PaginaTerritorial {
  pagina: number
  tamano: number
}

/** Respuesta de la lista: las filas en `rows` y el total que cumple los filtros, sin paginar. */
interface PaginaTerritorialRespuesta {
  rows?: ComunicadoTerritorial[]
  totalCount?: number
}

export function useComunicadosTerritorialQuery(filtros: FiltrosTerritorial, { pagina, tamano }: PaginaTerritorial) {
  return useQuery({
    queryKey: ["comunicados-territorial", "lista", filtros, pagina, tamano],
    queryFn: async () => {
      const params = new URLSearchParams()
      for (const [clave, valor] of Object.entries(filtros)) if (valor) params.set(clave, valor)
      params.set("pagina", String(pagina))
      params.set("tamano", String(tamano))
      // Por `api` y no `evalCol.getRows`: ese descarta todo lo que no sea `rows` y aquí hace falta el total.
      const r = await api.get<PaginaTerritorialRespuesta>(`/eval-col${RUTA}?${params.toString()}`)
      const totalCount = r?.totalCount ?? 0
      return { rows: r?.rows ?? [], totalCount, pageCount: Math.max(1, Math.ceil(totalCount / tamano)) }
    },
    placeholderData: keepPreviousData,
  })
}

export function useComunicadoTerritorialQuery(id: number | null) {
  return useQuery({
    queryKey: ["comunicados-territorial", "detalle", id],
    queryFn: async () => {
      const [fila] = await evalCol.getRows<ComunicadoTerritorialDetalle>(`${RUTA}/${id as number}`)
      return fila ?? null
    },
    enabled: id != null,
  })
}
