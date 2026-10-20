import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import { extractWriteResultId, type WriteResultResponse } from "../utils/extract-write-result"
import { invalidateSubjectRelated } from "./invalidate"

interface CreateSubjectInput {
  areaId: number
  areaGeneralId: number
  nombreInterno: string
  abreviacion: string
  ordenReportes: number
  color?: string
  // `fn_subject_crear` espera el id de especialidad ya resuelto.
  enfasisId?: number
  /** Solo para invalidar las áreas del periodo; no viaja en el body. */
  academicPeriodId?: number
}

// `fn_subject_crear` (id_query 39): alta de una asignatura; devuelve su id.
async function createSubject(input: CreateSubjectInput): Promise<number> {
  const raw: WriteResultResponse = await api.post(`/eval-col/areas/${input.areaId}/asignaturas`, {
    FK_AREA_ASIGNATURA: input.areaGeneralId,
    NOMBRE_INTERNO: input.nombreInterno,
    ABREVIACION: input.abreviacion,
    ORDEN_REPORTES: input.ordenReportes,
    COLOR: input.color,
    FK_ENFASIS: input.enfasisId,
  })
  return extractWriteResultId(raw)
}

interface UseCreateSubjectOptions {
  mutationConfig?: MutationConfig<typeof createSubject>
}

export function useCreateSubject({ mutationConfig }: UseCreateSubjectOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createSubject,
    ...mutationConfig,
    onSuccess: async (...args) => {
      // Se espera el refetch: el plan autoselecciona la nueva asignatura.
      await invalidateSubjectRelated(queryClient)
      await mutationConfig?.onSuccess?.(...args)
    },
  })
}
