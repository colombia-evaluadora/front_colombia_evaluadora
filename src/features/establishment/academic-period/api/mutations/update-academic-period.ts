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
  const payload = toCreateAcademicPeriodRequest(values)
  console.log("[updateAcademicPeriod] request", { id, payload })
  return api
    .put<MutationResult>(`/eval-col/periodos-academicos/editar/${id}`, payload)
    .then((result) => {
      console.log("[updateAcademicPeriod] response", result)
      return result
    })
    .catch((error) => {
      console.log("[updateAcademicPeriod] error", error?.response?.data ?? error)
      throw error
    })
}

interface UseUpdateAcademicPeriodOptions {
  mutationConfig?: MutationConfig<typeof updateAcademicPeriod>
}

export function useUpdateAcademicPeriod({ mutationConfig }: UseUpdateAcademicPeriodOptions = {}) {
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
