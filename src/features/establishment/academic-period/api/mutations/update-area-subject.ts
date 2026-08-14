import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type {
  MutationResult,
  UpdateAreaSubjectRequest,
} from "@/features/establishment/academic-period/api/types/area-subject"
import {
  extractWriteResultId,
  type WriteResultResponse,
} from "./extract-write-result"
import { toAsignaturasPayload } from "./to-asignaturas-payload"

interface UpdateAreaSubjectInput {
  codigo: number
  values: UpdateAreaSubjectRequest
}

// Área y asignatura son recursos separados, pero se guardan con el mismo
// botón: se actualiza el área y, en un solo bulk (`fn_subject_guardar_bulk`,
// reemplazo total), se guardan todas sus asignaturas vigentes — no hay
// alta/edición/baja de asignatura individual.
async function updateAreaSubject({
  codigo,
  values,
}: UpdateAreaSubjectInput): Promise<MutationResult> {
  const areaRaw: WriteResultResponse = await api.put(`/eval-col/areas/${codigo}`, {
    FK_AREA_ASIGNATURA: Number(values.areaGeneral),
    NOMBRE_INTERNO: values.nombreInterno,
    ABREVIACION: values.abreviacion,
    ORDEN_REPORTES: values.ordenReportes,
  })
  extractWriteResultId(areaRaw)

  await api.put(`/eval-col/areas/${codigo}/asignaturas`, {
    // JSONB espera STRING, no array anidado (mismo caso que SCALES/OBLIGATORIAS).
    ASIGNATURAS: JSON.stringify(toAsignaturasPayload(values.subjects)),
  })

  return { status: "ok", message: "Área/asignatura actualizada." }
}

interface UseUpdateAreaSubjectOptions {
  mutationConfig?: MutationConfig<typeof updateAreaSubject>
}

export function useUpdateAreaSubject({
  mutationConfig,
}: UseUpdateAreaSubjectOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateAreaSubject,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["area-subjects"] })
      queryClient.invalidateQueries({ queryKey: ["subjects"] })
      queryClient.invalidateQueries({ queryKey: ["especialidades"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
