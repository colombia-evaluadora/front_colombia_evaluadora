import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"

import type { AcademicPeriodFormValues } from "@/features/establishment/academic-period/api/schema"
import type { MutationResult } from "@/features/establishment/academic-period/api/types/academic-period"
import { toCreateAcademicPeriodRequest } from "@/features/establishment/academic-period/api/mutations/create-academic-period"
import { invalidateAcademicPeriodRelated } from "./invalidate"

interface UpdateAcademicPeriodInput {
  id: number
  values: AcademicPeriodFormValues
}

function updateAcademicPeriod({
  id,
  values,
}: UpdateAcademicPeriodInput): Promise<MutationResult> {
  // PUT, no PATCH: el SSO no soporta PATCH a nivel de plataforma.
  const payload = toCreateAcademicPeriodRequest(values)
  return api.put<MutationResult>(`/eval-col/periodos-academicos/editar/${id}`, payload)
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
      invalidateAcademicPeriodRelated(queryClient)
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
