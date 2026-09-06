import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"

import { actividadesQueryKey } from "@/features/planeador/api/query/use-actividades-query"
import type { Actividad } from "@/features/planeador/api/types/actividad"

function createActividad(actividad: Actividad): Promise<Actividad> {
  return api.post("/eval-col/planeador/actividad", actividad)
}

interface UseCreateActividadOptions {
  mutationConfig?: MutationConfig<typeof createActividad>
}

export function useCreateActividad({ mutationConfig }: UseCreateActividadOptions = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...restConfig } = mutationConfig ?? {}

  return useMutation({
    mutationFn: createActividad,
    onSuccess: (...args) => {
      // Invalida el listado para que la nueva actividad aparezca al volver
      // al Planeador (mismo criterio que `useCreateReservation`).
      queryClient.invalidateQueries({ queryKey: actividadesQueryKey() })
      onSuccess?.(...args)
    },
    ...restConfig,
  })
}
