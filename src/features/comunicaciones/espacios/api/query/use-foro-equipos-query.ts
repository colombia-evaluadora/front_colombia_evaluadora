import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { evalCol } from "@/lib/eval-col-client"
import {
  postConAdjuntos,
  useInvalidarEspacio,
} from "@/features/comunicaciones/espacios/api/mutations/use-acciones-espacio"
import { espaciosKeys, SONDEO_ESPACIO_MS } from "@/features/comunicaciones/espacios/api/query/use-espacios-query"
import type { Participacion } from "@/features/comunicaciones/espacios/api/types"

export interface Tema {
  id: number
  titulo: string
  equipoId: number | null
  apertura: Participacion
  respuestas: number
  solucionId: number | null
  siguiendo: boolean
}

export interface TemaDetalle {
  tema: Tema
  respuestas: Participacion[]
}

export interface Equipo {
  id: number
  nombre: string
  miembros: { usuarioId: number; nombre: string }[]
}

export interface Hallazgo {
  participacion: Participacion
  donde: "CHAT" | "FORO"
  temaId: number | null
  equipoId: number | null
}

export interface FiltrosBusqueda {
  texto: string
  autor: string
  desde: string
  hasta: string
}

const base = (id: number) => `/comunicaciones/espacios/${id}`
const conEquipo = (equipo: number | null) => (equipo ? `?equipo=${equipo}` : "")

export function useTemasQuery(id: number, equipo: number | null) {
  return useQuery({
    queryKey: [...espaciosKeys.espacio(id), "temas", equipo],
    queryFn: () => evalCol.getRows<Tema>(`${base(id)}/foro/temas${conEquipo(equipo)}`),
    refetchInterval: SONDEO_ESPACIO_MS,
  })
}

export function useTemaQuery(id: number, tema: number | null) {
  return useQuery({
    queryKey: [...espaciosKeys.espacio(id), "tema", tema],
    queryFn: async () => (await evalCol.getRows<TemaDetalle>(`${base(id)}/foro/temas/${tema}`))[0],
    enabled: tema !== null,
    refetchInterval: SONDEO_ESPACIO_MS,
  })
}

export function useEquiposQuery(id: number, activo = true) {
  return useQuery({
    queryKey: [...espaciosKeys.espacio(id), "equipos"],
    queryFn: () => evalCol.getRows<Equipo>(`${base(id)}/equipos`),
    enabled: activo,
  })
}

export function useBusquedaEspacio(id: number, filtros: FiltrosBusqueda | null) {
  return useQuery({
    queryKey: [...espaciosKeys.espacio(id), "buscar", filtros],
    queryFn: () => {
      const q = new URLSearchParams()
      Object.entries(filtros ?? {}).forEach(([k, v]) => v && q.set(k, v))
      return evalCol.getRows<Hallazgo>(`${base(id)}/buscar?${q}`)
    },
    enabled: filtros !== null,
  })
}

export function useCrearTema(id: number, equipo: number | null) {
  const invalidar = useInvalidarEspacio(id)
  return useMutation({
    mutationFn: ({ titulo, texto, archivos }: { titulo: string; texto: string; archivos: File[] }) =>
      postConAdjuntos<Tema>(
        `${base(id)}/foro/temas`,
        { TITULO: titulo, TEXTO: texto, CLIENT_MESSAGE_ID: crypto.randomUUID(), ...(equipo && { FK_EQUIPO: equipo }) },
        archivos,
      ),
    onSuccess: invalidar,
  })
}

export function useResponderTema(id: number, tema: number) {
  const invalidar = useInvalidarEspacio(id)
  return useMutation({
    mutationFn: ({ texto, archivos }: { texto: string; archivos: File[] }) =>
      postConAdjuntos<Participacion>(
        `${base(id)}/foro/temas/${tema}/respuestas`,
        { TEXTO: texto, CLIENT_MESSAGE_ID: crypto.randomUUID() },
        archivos,
      ),
    onSuccess: invalidar,
  })
}

export function useAccionesTema(id: number, tema: number) {
  const invalidar = useInvalidarEspacio(id)
  return {
    seguir: useMutation({
      // 204 sin filas: por `api`, no por `evalCol.patchRow`.
      mutationFn: (seguir: boolean) =>
        api.patch(`/eval-col${base(id)}/foro/temas/${tema}/seguir`, { SEGUIR: seguir }),
      onSuccess: invalidar,
    }),
    solucion: useMutation({
      mutationFn: (mensaje: number | null) =>
        evalCol.patchRow<Tema>(`${base(id)}/foro/temas/${tema}/solucion`, { FK_MENSAJE: mensaje }),
      onSuccess: invalidar,
    }),
  }
}

/**
 * Mover a un estudiante a otro equipo (M.3.HER.3). comms-service lo saca de su equipo y lo suma al
 * destino en una sola transacción: nunca queda sin equipo ni en dos si algo falla a mitad.
 */
export function useMoverAEquipo(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ estudiante, equipo }: { estudiante: number; equipo: number }) =>
      api.post(`/eval-col${base(id)}/equipos/mover`, { FK_ESTUDIANTE: estudiante, FK_EQUIPO: equipo }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: espaciosKeys.espacio(id) }),
  })
}

export function useGuardarEquipo(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ equipo, nombre, miembros }: { equipo: number | null; nombre: string; miembros: number[] }) => {
      const cuerpo = { NOMBRE: nombre, MIEMBROS: miembros }
      return equipo
        ? api.put(`/eval-col${base(id)}/equipos/${equipo}`, cuerpo)
        : api.post(`/eval-col${base(id)}/equipos`, cuerpo)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: espaciosKeys.espacio(id) }),
  })
}
