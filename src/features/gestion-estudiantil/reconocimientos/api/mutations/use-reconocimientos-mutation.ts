import { useMutation, useQueryClient } from "@tanstack/react-query"

import type { MutationConfig } from "@/lib/react-query"

import { reconocimientosKeys } from "@/features/gestion-estudiantil/reconocimientos/api/query-keys"

/** Toda escritura invalida la raíz del módulo: listado, sugerencias y detalle cambian juntos. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useReconocimientosMutation<F extends (input: any) => Promise<any>>(fn: F, mutationConfig?: MutationConfig<F>) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: fn,
    ...rest,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: reconocimientosKeys.all })
      onSuccess?.(...args)
    },
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MutationCfg<F extends (...args: any) => Promise<any>> = { mutationConfig?: MutationConfig<F> }

/** Respuesta de las escrituras que devuelven la pk del reconocimiento. */
export interface ResultadoEscritura {
  id: number
}
