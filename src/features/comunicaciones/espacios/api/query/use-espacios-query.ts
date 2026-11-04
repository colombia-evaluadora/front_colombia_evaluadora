import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type {
  ConfiguracionEspacio,
  EspacioDetalle,
  EspacioResumen,
  MaterialEspacio,
  Participacion,
  Participante,
} from "@/features/comunicaciones/espacios/api/types"

/**
 * Las conversaciones del espacio no tienen miembros en el chat, así que el socket no las
 * difunde: se refrescan por sondeo mientras la pantalla está abierta.
 */
export const SONDEO_ESPACIO_MS = 15_000

export const espaciosKeys = {
  todos: ["espacios"] as const,
  lista: () => ["espacios", "lista"] as const,
  espacio: (id: number) => ["espacios", id] as const,
  detalle: (id: number) => ["espacios", id, "detalle"] as const,
  participantes: (id: number, equipo: number | null) => ["espacios", id, "participantes", equipo] as const,
  materiales: (id: number) => ["espacios", id, "materiales"] as const,
  chat: (id: number, equipo: number | null) => ["espacios", id, "chat", equipo] as const,
  configuracion: (actividad: number) => ["espacios", "actividad", actividad] as const,
}

const base = (id: number) => `/comunicaciones/espacios/${id}`

export function useEspaciosQuery() {
  return useQuery({
    queryKey: espaciosKeys.lista(),
    queryFn: () => evalCol.getRows<EspacioResumen>("/comunicaciones/espacios"),
  })
}

export function useEspacioQuery(id: number) {
  return useQuery({
    queryKey: espaciosKeys.detalle(id),
    queryFn: async () => (await evalCol.getRows<EspacioDetalle>(base(id)))[0],
    refetchInterval: SONDEO_ESPACIO_MS,
  })
}

export function useConfiguracionEspacioQuery(actividad: number | null) {
  return useQuery({
    queryKey: espaciosKeys.configuracion(actividad ?? 0),
    queryFn: async () =>
      (await evalCol.getRows<ConfiguracionEspacio>(`/comunicaciones/espacios/actividad/${actividad}`))[0],
    enabled: Boolean(actividad),
  })
}

export function useParticipantesQuery(id: number, equipo: number | null) {
  return useQuery({
    queryKey: espaciosKeys.participantes(id, equipo),
    queryFn: () => evalCol.getRows<Participante>(`${base(id)}/participantes${equipo ? `?equipo=${equipo}` : ""}`),
  })
}

export function useMaterialesQuery(id: number) {
  return useQuery({
    queryKey: espaciosKeys.materiales(id),
    queryFn: () => evalCol.getRows<MaterialEspacio>(`${base(id)}/materiales`),
  })
}

export function useChatEspacioQuery(id: number, equipo: number | null) {
  return useQuery({
    queryKey: espaciosKeys.chat(id, equipo),
    queryFn: () => evalCol.getRows<Participacion>(`${base(id)}/chat/mensajes${equipo ? `?equipo=${equipo}` : ""}`),
    refetchInterval: SONDEO_ESPACIO_MS,
  })
}
