import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import { academicPeriodKeys } from "@/features/establishment/academic-period/api/query-keys"

interface UpdateSubjectInput {
  subjectId: number
  areaGeneralId?: number
  nombreInterno?: string
  abreviacion?: string
  ordenReportes?: number
  color?: string
  enfasisId?: number
  /** Solo para invalidar el detalle de asignaturas del periodo; no viaja en el body. */
  academicPeriodId?: number
}

async function updateSubject(input: UpdateSubjectInput): Promise<void> {
  await api.put(`/eval-col/areas/asignaturas/${input.subjectId}`, {
    FK_AREA_ASIGNATURA: input.areaGeneralId,
    NOMBRE_INTERNO: input.nombreInterno,
    ABREVIACION: input.abreviacion,
    ORDEN_REPORTES: input.ordenReportes,
    COLOR: input.color,
    FK_ENFASIS: input.enfasisId,
  })
}

interface UseUpdateSubjectOptions {
  mutationConfig?: MutationConfig<typeof updateSubject>
}

export function useUpdateSubject({ mutationConfig }: UseUpdateSubjectOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateSubject,
    ...mutationConfig,
    onSuccess: (...args) => {
      const [, variables] = args
      queryClient.invalidateQueries({ queryKey: academicPeriodKeys.areaSubjects.all })
      queryClient.invalidateQueries({ queryKey: academicPeriodKeys.subjects.all })
      queryClient.invalidateQueries({
        queryKey: academicPeriodKeys.subjectDetails.byPeriod(variables.academicPeriodId),
      })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
