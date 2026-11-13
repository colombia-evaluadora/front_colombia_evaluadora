import { useMutation, useQueryClient } from "@tanstack/react-query"

import type { MutationConfig } from "@/lib/react-query"

import { reintegracionKeys } from "@/features/gestion-estudiantil/reintegracion/api/query-keys"

/** Toda escritura invalida la raíz del módulo: bandeja, detalle, intervenciones y remisiones cambian juntas. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useReintegracionMutation<F extends (input: any) => Promise<any>>(fn: F, mutationConfig?: MutationConfig<F>) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: fn,
    ...rest,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: reintegracionKeys.all })
      onSuccess?.(...args)
    },
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MutationCfg<F extends (...args: any) => Promise<any>> = { mutationConfig?: MutationConfig<F> }
