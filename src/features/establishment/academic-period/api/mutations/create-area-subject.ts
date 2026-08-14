import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type {
  CreateAreaSubjectRequest,
  AreaSubject,
} from "@/features/establishment/academic-period/api/types/area-subject"
import {
  extractWriteResultId,
  type WriteResultResponse,
} from "./extract-write-result"
import { toAsignaturasPayload } from "./to-asignaturas-payload"

async function createAreaSubject(
  input: CreateAreaSubjectRequest
): Promise<AreaSubject> {
  const academicPeriodId = input.academicPeriodId ?? 0

  const areaRaw: WriteResultResponse = await api.post("/eval-col/areas", {
    FK_PERIODO: academicPeriodId,
    FK_AREA_ASIGNATURA: Number(input.areaGeneral),
    NOMBRE_INTERNO: input.nombreInterno,
    ABREVIACION: input.abreviacion,
    ORDEN_REPORTES: input.ordenReportes,
  })
  const areaId = extractWriteResultId(areaRaw)

  if (input.subjects.length > 0) {
    await api.put(`/eval-col/areas/${areaId}/asignaturas`, {
      // JSONB espera STRING, no array anidado (mismo caso que SCALES/OBLIGATORIAS).
      ASIGNATURAS: JSON.stringify(toAsignaturasPayload(input.subjects)),
    })
  }

  return {
    codigo: areaId,
    areaGeneral: input.areaGeneral,
    nombreInterno: input.nombreInterno,
    abreviacion: input.abreviacion,
    ordenReportes: input.ordenReportes,
    subjects: input.subjects,
  }
}

interface UseCreateAreaSubjectOptions {
  mutationConfig?: MutationConfig<typeof createAreaSubject>
}

export function useCreateAreaSubject({
  mutationConfig,
}: UseCreateAreaSubjectOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createAreaSubject,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["area-subjects"] })
      queryClient.invalidateQueries({ queryKey: ["subjects"] })
      queryClient.invalidateQueries({ queryKey: ["especialidades"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
