import { useMutation, useQueryClient } from "@tanstack/react-query"

import type { MutationConfig } from "@/lib/react-query"

import { observacionesKeys } from "@/features/gestion-estudiantil/observaciones/api/query-keys"

/** Toda escritura invalida la raíz del módulo: listado y detalle cambian juntos. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useObservacionesMutation<F extends (input: any) => Promise<any>>(fn: F, mutationConfig?: MutationConfig<F>) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: fn,
    ...rest,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: observacionesKeys.all })
      onSuccess?.(...args)
    },
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MutationCfg<F extends (...args: any) => Promise<any>> = { mutationConfig?: MutationConfig<F> }

/** Respuesta de modificar y anular: la pk de la observación. */
export interface ResultadoEscritura {
  id: number
}
