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
  temas: (id: number, equipo: number | null) => ["espacios", id, "temas", equipo] as const,
  tema: (id: number, tema: number | null) => ["espacios", id, "tema", tema] as const,
  equipos: (id: number) => ["espacios", id, "equipos"] as const,
  chat: (id: number, equipo: number | null) => ["espacios", id, "chat", equipo] as const,
  configuracion: (actividad: number) => ["espacios", "actividad", actividad] as const,
}

const base = (id: number) => `/comunicaciones/espacios/${id}`

const conEquipo = (equipo: number | null) => (equipo ? `?equipo=${equipo}` : "")

export const fetchEspacios = () => evalCol.getRows<EspacioResumen>("/comunicaciones/espacios")
export const fetchEspacio = async (id: number) => (await evalCol.getRows<EspacioDetalle>(base(id)))[0]
export const fetchParticipantes = (id: number, equipo: number | null) =>
  evalCol.getRows<Participante>(`${base(id)}/participantes${conEquipo(equipo)}`)
export const fetchMateriales = (id: number) => evalCol.getRows<MaterialEspacio>(`${base(id)}/materiales`)
export const fetchChatEspacio = (id: number, equipo: number | null) =>
  evalCol.getRows<Participacion>(`${base(id)}/chat/mensajes${conEquipo(equipo)}`)

export function useEspaciosQuery() {
  return useQuery({
    queryKey: espaciosKeys.lista(),
    queryFn: fetchEspacios,
  })
}

export function useEspacioQuery(id: number) {
  return useQuery({
    queryKey: espaciosKeys.detalle(id),
    queryFn: () => fetchEspacio(id),
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

export function useParticipantesQuery(id: number, equipo: number | null, activo = true) {
  return useQuery({
    enabled: activo,
    queryKey: espaciosKeys.participantes(id, equipo),
    queryFn: () => fetchParticipantes(id, equipo),
  })
}

export function useMaterialesQuery(id: number) {
  return useQuery({
    queryKey: espaciosKeys.materiales(id),
    queryFn: () => fetchMateriales(id),
  })
}

export function useChatEspacioQuery(id: number, equipo: number | null) {
  return useQuery({
    queryKey: espaciosKeys.chat(id, equipo),
    queryFn: () => fetchChatEspacio(id, equipo),
    refetchInterval: SONDEO_ESPACIO_MS,
  })
}
