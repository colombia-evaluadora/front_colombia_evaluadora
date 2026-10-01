import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { MutationConfig } from "@/lib/react-query"
import type { TipoAsistencia } from "@/features/academic-management/asistencia/api/types/asistencia"

import { invalidarPlaneadorPorAsistencia } from "@/features/planeador/api/query/invalidar-por-asistencia"

/**
 * Asistencia de UN estudiante en la actividad, marcada desde la tabla de
 * calificaciones: `PUT /planeador/actividades/estudiantes/:ID/asistencia`.
 * Nunca toca la de la Vista Asistencias; sin Vista ese día, el backend
 * recalcula la asistencia oficial con las marcas de todas las actividades.
 * 400 si ya tiene resultado (congelada) o la actividad no empieza.
 */
export interface AsistenciaActividadInput {
  /** `PK_TACTIVIDAD_ESTUDIANTE`. */
  pkTactividadEstudiante: number
  tipo: Extract<TipoAsistencia, 1 | 2 | 5>
}

function marcarAsistenciaActividad(input: AsistenciaActividadInput): Promise<unknown> {
  return evalCol.putRow(`/planeador/actividades/estudiantes/${input.pkTactividadEstudiante}/asistencia`, {
    TIPO_ASISTENCIA: input.tipo,
  })
}

export function useAsistenciaActividadMutation(
  options: { mutationConfig?: MutationConfig<typeof marcarAsistenciaActividad> } = {},
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: marcarAsistenciaActividad,
    ...options.mutationConfig,
    onSuccess: (...args) => {
      // Puede cambiar la oficial del día: afecta otras actividades y Asistencia.
      invalidarPlaneadorPorAsistencia(queryClient)
      queryClient.invalidateQueries({ queryKey: ["asistencia"] })
      options.mutationConfig?.onSuccess?.(...args)
    },
  })
}
