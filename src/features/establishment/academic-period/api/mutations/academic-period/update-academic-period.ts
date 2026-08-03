import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"

import type { AcademicPeriodFormValues } from "../../schema"
import type { MutationResult } from "../../types/academic-period"
import { toCreateAcademicPeriodRequest } from "./create-academic-period"

interface UpdateAcademicPeriodInput {
  id: number
  values: AcademicPeriodFormValues
}

function updateAcademicPeriod({
  id,
  values,
}: UpdateAcademicPeriodInput): Promise<MutationResult> {
  return api.patch(
    `/academic-periods/${id}`,
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
