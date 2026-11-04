import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { invalidarPlaneadorPorAsistencia } from "@/features/planeador/api/query/invalidar-por-asistencia"
import { asistenciaKeys } from "@/features/academic-management/asistencia/api/query-keys"

export interface JustificarAsistenciaInput {
  /** Registros de la fila: una corrida de bloques se justifica entera. */
  pks: number[]
  /** `null` (con `fuente` null) quita la justificación. */
  justificacion: string | null
  fuente: number | null
}

/** Regla 109: `PATCH /asistencias/:ID/justificar` (sso V542.7). No cambia el
 *  estado de asistencia; el back propaga Justificada a los resultados del día
 *  (Regla 75). Lo usa el docente de la clase o el Responsable de grupo. Sin
 *  outbox offline: es una acción puntual, no la captura del pase de lista. */
async function justificarAsistencia({ pks, justificacion, fuente }: JustificarAsistenciaInput) {
  for (const pk of pks) {
    await api.patch(`/eval-col/asistencias/${pk}/justificar`, {
      JUSTIFICACION: justificacion,
      FUENTE: fuente,
    })
  }
}

export function useAsistenciaJustificarMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: justificarAsistencia,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: asistenciaKeys.all })
      invalidarPlaneadorPorAsistencia(queryClient)
    },
  })
}
