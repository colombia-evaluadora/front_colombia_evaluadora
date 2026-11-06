import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { evalCol } from "@/lib/eval-col-client"

import { orientacionKeys } from "@/features/gestion-estudiantil/inclusion/orientacion/api/query-keys"

const BASE = "/gestion-estudiantil/orientacion/atenciones"

function useInvalidar() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: orientacionKeys.all })
}

export function useGuardarAtencion() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: ({ id, body }: { id?: number; body: unknown }) =>
      id ? evalCol.putRow<{ id: number }>(`${BASE}/${id}`, body) : evalCol.postRow<{ id: number }>(BASE, body),
    onSuccess: invalidar,
  })
}

export function useRemisionExterna(atencionId: number) {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: (body: unknown) => api.post(`/eval-col${BASE}/${atencionId}/remisiones-externas`, body),
    onSuccess: invalidar,
  })
}

export function useAnularAtencion() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: ({ id, motivo }: { id: number; motivo: string }) => api.post(`/eval-col${BASE}/${id}/anular`, { MOTIVO: motivo }),
    onSuccess: invalidar,
  })
}
