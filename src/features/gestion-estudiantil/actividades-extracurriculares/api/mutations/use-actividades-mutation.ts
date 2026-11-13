import { useMutation, useQueryClient } from "@tanstack/react-query"

import type { MutationConfig } from "@/lib/react-query"

import { actividadesKeys } from "@/features/gestion-estudiantil/actividades-extracurriculares/api/query-keys"

/** Toda escritura invalida la raíz del módulo: listados, detalle, participantes, sesiones y servicio social. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useActividadesMutation<F extends (input: any) => Promise<any>>(
  fn: F,
  mutationConfig?: MutationConfig<F>,
) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: fn,
    ...rest,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: actividadesKeys.all })
      onSuccess?.(...args)
    },
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MutationCfg<F extends (...args: any) => Promise<any>> = { mutationConfig?: MutationConfig<F> }
