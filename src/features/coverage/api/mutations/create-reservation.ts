import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { CreateReservationInput, Reservation } from "@/features/coverage/api/types/reservation"

function createReservation(input: CreateReservationInput): Promise<Reservation> {
  return api.post("/coverage/reservations", input)
}

interface UseCreateReservationOptions {
  mutationConfig?: MutationConfig<typeof createReservation>
}

export function useCreateReservation({ mutationConfig }: UseCreateReservationOptions = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...restConfig } = mutationConfig ?? {}

  return useMutation({
    mutationFn: createReservation,
    onSuccess: (...args) => {
      // Invalida listado y stats: la reserva nueva entra en ambos.
      queryClient.invalidateQueries({ queryKey: ["reservations"] })
      onSuccess?.(...args)
    },
    ...restConfig,
  })
}
