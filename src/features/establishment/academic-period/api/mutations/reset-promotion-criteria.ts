import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import { academicPeriodKeys } from "@/features/establishment/academic-period/api/query-keys"

interface ResetPromotionCriteriaInput {
  academicPeriodId: number
  gradeId: number
}

// `fn_criterio_prom_restablecer`: da de baja el criterio propio del grado, que
// vuelve a heredar el del período (y sus cambios futuros). Devuelve el id dado
// de baja, o null si el grado no tenía propio.
function resetPromotionCriteria({ academicPeriodId, gradeId }: ResetPromotionCriteriaInput) {
  return api.put(`/eval-col/periodos/${academicPeriodId}/criterio-promocion/restablecer`, {
    FK_GRADO: gradeId,
  })
}

interface UseResetPromotionCriteriaOptions {
  mutationConfig?: MutationConfig<typeof resetPromotionCriteria>
}

export function useResetPromotionCriteria({ mutationConfig }: UseResetPromotionCriteriaOptions = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: resetPromotionCriteria,
    ...rest,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: academicPeriodKeys.promotionCriteria.all })
      onSuccess?.(...args)
    },
  })
}
