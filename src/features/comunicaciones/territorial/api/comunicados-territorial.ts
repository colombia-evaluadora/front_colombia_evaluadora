import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { Audiencia, DestinosComunicado, OpcionSeleccion } from "@/features/comunicaciones/chat/api/types"

const RUTA = "/comunicaciones/comunicados/territorial"

export type EstadoTerritorial = "PUBLICADO" | "VENCIDO" | "ANULADO"

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

export function useComunicadosTerritorialQuery(filtros: FiltrosTerritorial) {
  return useQuery({
    queryKey: ["comunicados-territorial", "lista", filtros],
    queryFn: () => {
      const params = new URLSearchParams()
      for (const [clave, valor] of Object.entries(filtros)) if (valor) params.set(clave, valor)
      const qs = params.toString()
      return evalCol.getRows<ComunicadoTerritorial>(`${RUTA}${qs ? `?${qs}` : ""}`)
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
