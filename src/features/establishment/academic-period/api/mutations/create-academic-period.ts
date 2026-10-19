import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"

import type { AcademicPeriodFormValues } from "@/features/establishment/academic-period/api/schema"
import type { CreateAcademicPeriodRequest } from "@/features/establishment/academic-period/api/types/academic-period"
import {
  extractWriteResultId,
  type WriteResultResponse,
} from "@/features/establishment/academic-period/api/utils/extract-write-result"
import { invalidateAcademicPeriodRelated } from "./invalidate"

export function toCreateAcademicPeriodRequest(
  values: AcademicPeriodFormValues,
): CreateAcademicPeriodRequest {
  // Body plano de `fn_periodo_crear`; nombre, año y usuario los deriva el backend.
  const breaks = values.breaks ?? []
  return {
    // El backend espera BIGINT.
    FK_SEDE: Number(values.sedeId), 
    FK_ESTADO: values.statusId,
    FECHA_INICIO: values.startDate,
    FECHA_FIN: values.endDate,
    FECHA_LIMITE_MATRICULA: values.enrollmentDeadline,
    FK_JORNADA: values.jornadaId,
    HORA_INICIO: values.scheduleStartTime || null,
    HORA_FIN: values.scheduleEndTime || null,
    // `p_reserva` es `bool_sn` → se manda "S"/"N", no boolean.
    RESERVA: values.reservationEnabled ? "S" : "N",
    BLOQUES_POR_DEFECTO: values.defaultBlocksCount,
    FK_PERIODO_ANTERIOR: values.previousPeriodId,
    // `TIME[]` paralelos; `[]` borra todos, `null` sería "no tocar".
    DESCANSO_INICIO: breaks.map((b) => b.startTime),
    DESCANSO_FIN: breaks.map((b) => b.endTime),
  }
}

// `fn_periodo_crear` devuelve solo el id, envuelto en `{rows:[...]}`.
async function createAcademicPeriod(
  values: AcademicPeriodFormValues
): Promise<{ id: number }> {
  const raw = await api.post<WriteResultResponse>(
    "/eval-col/periodos-academicos",
    toCreateAcademicPeriodRequest(values)
  )
  return { id: extractWriteResultId(raw) }
}

interface UseCreateAcademicPeriodOptions {
  mutationConfig?: MutationConfig<typeof createAcademicPeriod>
}

export function useCreateAcademicPeriod({ mutationConfig }: UseCreateAcademicPeriodOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createAcademicPeriod,
    ...mutationConfig,
    onSuccess: (...args) => {
      invalidateAcademicPeriodRelated(queryClient)
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
