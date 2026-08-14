import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"

import type { AcademicPeriodFormValues } from "@/features/establishment/academic-period/api/schema"
import type { MutationResult } from "@/features/establishment/academic-period/api/types/academic-period"
import { toCreateAcademicPeriodRequest } from "@/features/establishment/academic-period/api/mutations/create-academic-period"

interface UpdateAcademicPeriodInput {
  id: number
  values: AcademicPeriodFormValues
}

function updateAcademicPeriod({
  id,
  values,
}: UpdateAcademicPeriodInput): Promise<MutationResult> {
  // PATCH no está soportado a nivel de plataforma en el SSO (pendiente que
  // se corrija de forma global); este endpoint expone PUT en /editar/:ID,
  // mismo patrón que periodo-evaluacion (`fn_periodo_eval_actualizar`).
  return api.put(
    `/eval-col/periodos-academicos/editar/${id}`,
    toCreateAcademicPeriodRequest(values)
  )
}

interface UseUpdateAcademicPeriodOptions {
  mutationConfig?: MutationConfig<typeof updateAcademicPeriod>
}

export function useUpdateAcademicPeriod({
  mutationConfig,
}: UseUpdateAcademicPeriodOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateAcademicPeriod,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["academic-periods"] })
      queryClient.invalidateQueries({ queryKey: ["academic-period"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
