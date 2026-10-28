import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { CalendarEntryInput } from "@/features/establishment/academic-period/api/types/academic-calendar"
import { academicPeriodKeys } from "@/features/establishment/academic-period/api/query-keys"

interface SaveCalendarEntryInput {
  academicPeriodId: number
  // Sin id crea la entrada; con id la modifica.
  id?: number
  values: CalendarEntryInput
}

// `POST /eval-col/calendario` y `PUT /eval-col/calendario/:id` (Sección 5.8).
// El back valida que las fechas estén en el período, que "Día hábil por
// excepción" caiga en días inhábiles y que no se quiten días con asistencia.
function saveCalendarEntry({
  academicPeriodId,
  id,
  values,
}: SaveCalendarEntryInput): Promise<unknown> {
  const body = {
    FK_PERIODO_ACADEMICO: academicPeriodId,
    TIPO: values.type,
    FECHA_DESDE: values.from,
    FECHA_HASTA: values.to,
    MOTIVO: values.reason.trim(),
  }
  return id == null
    ? api.post("/eval-col/calendario", body)
    : api.put(`/eval-col/calendario/${id}`, body)
}

// Baja lógica, como el resto del feature.
function deleteCalendarEntry({ id }: { id: number; academicPeriodId: number }): Promise<unknown> {
  return api.patch(`/eval-col/calendario/${id}/eliminar`)
}

export function useSaveCalendarEntry({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof saveCalendarEntry> } = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: saveCalendarEntry,
    ...rest,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: academicPeriodKeys.academicCalendar.all })
      onSuccess?.(...args)
    },
  })
}

export function useDeleteCalendarEntry({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof deleteCalendarEntry> } = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: deleteCalendarEntry,
    ...rest,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: academicPeriodKeys.academicCalendar.all })
      onSuccess?.(...args)
    },
  })
}
