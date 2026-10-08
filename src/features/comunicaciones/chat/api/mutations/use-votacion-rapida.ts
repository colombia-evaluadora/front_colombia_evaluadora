import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"
import type { Mensaje, TipoVotacionRapida } from "@/features/comunicaciones/chat/api/types"

export interface VotacionRapidaInput {
  pregunta: string
  tipo: TipoVotacionRapida
  minutos: number
}

const cuerpo = (v: VotacionRapidaInput) => ({ PREGUNTA: v.pregunta, TIPO: v.tipo, MINUTOS: v.minutos })

// Pone el mensaje devuelto en la caché: lo agrega si es nuevo o lo reemplaza.
function useGuardarEnCache() {
  const queryClient = useQueryClient()
  return (m: Mensaje) =>
    queryClient.setQueryData<Mensaje[]>(chatKeys.mensajes(m.conversacionId), (prev = []) =>
      prev.some((x) => x.id === m.id) ? prev.map((x) => (x.id === m.id ? m : x)) : [...prev, m],
    )
}

export function useCrearVotacionRapida(conversacionId: number) {
  const guardar = useGuardarEnCache()
  return useMutation({
    mutationFn: (v: VotacionRapidaInput) =>
      evalCol.postRow<Mensaje>(`/comunicaciones/conversaciones/${conversacionId}/votaciones-rapidas`, cuerpo(v)),
    onSuccess: guardar,
  })
}

export function useEditarVotacionRapida() {
  const guardar = useGuardarEnCache()
  return useMutation({
    mutationFn: ({ mensajeId, ...v }: VotacionRapidaInput & { mensajeId: number }) =>
      evalCol.patchRow<Mensaje>(`/comunicaciones/mensajes/${mensajeId}/votacion`, cuerpo(v)),
    onSuccess: guardar,
  })
}

export function useVotarRapido() {
  const guardar = useGuardarEnCache()
  return useMutation({
    mutationFn: ({ mensajeId, opcionId }: { mensajeId: number; opcionId: number }) =>
      evalCol.postRow<Mensaje>(`/comunicaciones/mensajes/${mensajeId}/votacion/votar`, { FK_OPCION: opcionId }),
    onSuccess: guardar,
  })
}
