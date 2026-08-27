import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"

import type { MutationResult } from "@/features/establishment/academic-period/api/types/academic-period"
import type { CreateAcademicPeriodRequest } from "@/features/establishment/academic-period/api/types/academic-period"

interface UpdateAcademicPeriodReservationInput {
  id: number
  // Payload COMPLETO de la edición (mismo shape que `fn_periodo_actualizar`)
  // con `RESERVA` ya ajustado al valor deseado. Se reutiliza el endpoint
  // `PUT /periodos-academicos/editar/:ID` porque es el único que toca la
  // config y queda auditado del lado del backend.
  body: CreateAcademicPeriodRequest
}

function updateAcademicPeriodReservation({
  id,
  body,
}: UpdateAcademicPeriodReservationInput): Promise<MutationResult> {
  return api.put(`/eval-col/periodos-academicos/editar/${id}`, body)
}

interface UseUpdateAcademicPeriodReservationOptions {
  mutationConfig?: MutationConfig<typeof updateAcademicPeriodReservation>
}

export function useUpdateAcademicPeriodReservation({
  mutationConfig,
}: UseUpdateAcademicPeriodReservationOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateAcademicPeriodReservation,
    ...mutationConfig,
    onSuccess: (...args) => {
      // Invalida tanto el listado como el detalle de un solo periodo, para
      // que el badge "Inactivo"/"Activo" y cualquier pantalla que dependa
      // del flag se refresquen de inmediato.
      queryClient.invalidateQueries({ queryKey: ["academic-periods"] })
      queryClient.invalidateQueries({ queryKey: ["academic-period"] })
      // Cualquier consumidor que dependa de "periodos con reserva activa"
      // (ej. listado de establecimientos con cupos disponibles para
      // reserva) tiene que reconsultar al cambiar el flag.
      queryClient.invalidateQueries({ queryKey: ["reservations"] })
      queryClient.invalidateQueries({ queryKey: ["pre-matricula"] })
      queryClient.invalidateQueries({ queryKey: ["enrollments"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}