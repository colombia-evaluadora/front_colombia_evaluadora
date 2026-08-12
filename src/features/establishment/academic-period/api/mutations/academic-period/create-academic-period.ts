import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"

import type { AcademicPeriodFormValues } from "../../schema"
import type {
  AcademicPeriod,
  CreateAcademicPeriodRequest,
} from "../../types/academic-period"

export function toCreateAcademicPeriodRequest(
  values: AcademicPeriodFormValues
): CreateAcademicPeriodRequest {
  // `name` y `schoolYearId` los deriva el backend; `minAbsences`/`weeksCount`/
  // `minFailedSubjects`/`isPrincipal` no son parámetros de creación → no se mandan.
  return {
    // `sedeId` es string en el front (Campus.id). ⚠️ el backend espera el
    // PK_TSEDE numérico; ver pendiente cross-módulo en MAPEO_ENDPOINTS §4.
    sedeId: values.sedeId,
    previousPeriodId: values.previousPeriodId,
    statusId: values.statusId,
    startDate: values.startDate,
    endDate: values.endDate,
    enrollmentDeadline: values.enrollmentDeadline,
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
