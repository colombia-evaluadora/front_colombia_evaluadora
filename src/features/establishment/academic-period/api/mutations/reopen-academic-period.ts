import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import { academicPeriodKeys } from "@/features/establishment/academic-period/api/query-keys"

// `PUT /eval-col/periodos-academicos/:id/reabrir` (Regla 16): el período Cerrado
// vuelve a Abierto hasta `cerrarEl`; el motivo queda en la Bitácora.
function reopenAcademicPeriod({ id, motivo, cerrarEl }: { id: number; motivo: string; cerrarEl: string }) {
  return api.put(`/eval-col/periodos-academicos/${id}/reabrir`, {
    MOTIVO: motivo.trim(),
    CERRAR_EL: cerrarEl,
  })
}

// `PUT /eval-col/periodos-academicos/:id/cerrar`: vuelve a Cerrado un período
// reabierto antes de su fecha "Cerrar de nuevo el".
function closeAcademicPeriod({ id }: { id: number }) {
  return api.put(`/eval-col/periodos-academicos/${id}/cerrar`)
}

function usePeriodStateMutation<TVars>(
  mutationFn: (vars: TVars) => Promise<unknown>,
  mutationConfig?: MutationConfig<(vars: TVars) => Promise<unknown>>,
) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn,
    ...rest,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: academicPeriodKeys.academicPeriods.all })
      queryClient.invalidateQueries({ queryKey: academicPeriodKeys.academicPeriod.all })
      onSuccess?.(...args)
    },
  })
}

export function useReopenAcademicPeriod({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof reopenAcademicPeriod> } = {}) {
  return usePeriodStateMutation(reopenAcademicPeriod, mutationConfig)
}

export function useCloseAcademicPeriod({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof closeAcademicPeriod> } = {}) {
  return usePeriodStateMutation(closeAcademicPeriod, mutationConfig)
}
