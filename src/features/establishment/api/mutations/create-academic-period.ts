import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"

import type { AcademicPeriodFormValues } from "../schema"
import type {
  AcademicPeriod,
  CreateAcademicPeriodRequest,
} from "../types/academic-period/academic-period"

export function toCreateAcademicPeriodRequest(
  values: AcademicPeriodFormValues
): CreateAcademicPeriodRequest {
  const schoolYearId = values.startDate
    ? new Date(values.startDate).getFullYear()
    : new Date().getFullYear()

  return {
    sedeId: values.sedeId,
    previousPeriodId: values.previousPeriodId,
    schoolYearId,
    status: values.status,
    startDate: values.startDate,
    endDate: values.endDate,
    enrollmentDeadline: values.enrollmentDeadline,
    minAbsences: null,
    weeksCount: null,
    minFailedSubjects: null,
    name: `Año lectivo ${schoolYearId}`,
    isPrincipal: true,
    config: {
      jornadaId: values.jornadaId,
      reservationEnabled: values.reservationEnabled,
      defaultBlocksCount: values.defaultBlocksCount,
      scheduleStartTime: values.scheduleStartTime || null,
      scheduleEndTime: values.scheduleEndTime || null,
      breaks: values.breaks,
    },
  }
}

function createAcademicPeriod(
  values: AcademicPeriodFormValues
): Promise<AcademicPeriod> {
  return api.post("/academic-periods", toCreateAcademicPeriodRequest(values))
}

interface UseCreateAcademicPeriodOptions {
  mutationConfig?: MutationConfig<typeof createAcademicPeriod>
}

export function useCreateAcademicPeriod({
  mutationConfig,
}: UseCreateAcademicPeriodOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createAcademicPeriod,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["academic-periods"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
