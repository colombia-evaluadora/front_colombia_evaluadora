import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { unwrapRow } from "@/lib/response-envelope"

import { academicPeriodKeys } from "@/features/establishment/academic-period/api/query-keys"

/** Regla 109.3: días hábiles que una clase puede seguir sin asistencia antes del
 *  aviso al docente y al Supervisor de sede. Vive en el período (sso V542.9);
 *  se lee y cambia junto al calendario académico (`/calendario/:ID/...`). */
async function fetchPlazoAvisoAsistencia(academicPeriodId: number): Promise<number> {
  const raw = await api.get<{ rows: { plazo_aviso_asistencia: number }[] }>(
    `/eval-col/calendario/${academicPeriodId}/plazo-aviso-asistencia`,
  )
  return unwrapRow<{ plazo_aviso_asistencia: number }>(raw).plazo_aviso_asistencia
}

export function usePlazoAvisoAsistenciaQuery(academicPeriodId: number) {
  return useQuery({
    queryKey: academicPeriodKeys.academicCalendar.plazoAviso(academicPeriodId),
    queryFn: () => fetchPlazoAvisoAsistencia(academicPeriodId),
  })
}

export function useSavePlazoAvisoAsistencia(academicPeriodId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (plazo: number) =>
      api.patch(`/eval-col/calendario/${academicPeriodId}/plazo-aviso-asistencia`, { PLAZO: plazo }),
    onSuccess: (_data, plazo) => {
      // Sin esto el campo muestra el valor viejo hasta que vuelve el refetch.
      queryClient.setQueryData(academicPeriodKeys.academicCalendar.plazoAviso(academicPeriodId), plazo)
      queryClient.invalidateQueries({ queryKey: academicPeriodKeys.academicCalendar.byPeriod(academicPeriodId) })
    },
  })
}
