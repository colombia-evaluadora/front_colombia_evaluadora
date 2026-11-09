import { useMutation, useQueryClient } from "@tanstack/react-query"

import type { MutationConfig } from "@/lib/react-query"

import { citacionesKeys } from "@/features/gestion-estudiantil/citaciones/api/query-keys"

/**
 * Toda escritura invalida la raíz del módulo: una transición de citación o un compromiso nuevo
 * cambian listados y detalles de ambas pestañas (`citacionesKeys.all`).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useCitacionesMutation<F extends (input: any) => Promise<any>>(fn: F, mutationConfig?: MutationConfig<F>) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: fn,
    ...rest,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: citacionesKeys.all })
      onSuccess?.(...args)
    },
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MutationCfg<F extends (...args: any) => Promise<any>> = { mutationConfig?: MutationConfig<F> }

/** Respuesta de toda escritura: `{ id }` con la pk de la citación o del compromiso. */
export interface ResultadoEscritura {
  id: number
}
