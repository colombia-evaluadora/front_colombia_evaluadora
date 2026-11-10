import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { reservasCupoKeys } from "@/features/coverage/inscripcion-reservas/api/query/use-reservas-cupo-query"
import type {
  ReservarCuposInput,
  ReservarCuposResumen,
} from "@/features/coverage/inscripcion-reservas/api/types/reserva-cupo"

// Regla 35: idempotente, solo procesa a quienes faltan.
export function useReservarCupos() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ReservarCuposInput) =>
      api.post<ReservarCuposResumen>("/coverage/reservas-cupo/reservar-cupos", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reservasCupoKeys.all }),
  })
}
