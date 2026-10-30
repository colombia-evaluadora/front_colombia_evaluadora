import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { MutationConfig } from "@/lib/react-query"

import { invalidarFestivos } from "@/features/administration/festivos/api/mutations/invalidar-festivos"
import type { Festivo, Resultado } from "@/features/administration/festivos/api/types"

// Se puede inactivar aunque esté en uso: deja de copiarse a los períodos por
// comenzar y los que ya comenzaron conservan su día inhábil.
async function setEstadoFestivo({ id, habilitado }: { id: number; habilitado: boolean }) {
  const row = await evalCol.putRow<Resultado<Festivo>>(`/festivos/${id}/estado`, {
    HABILITADO: habilitado,
  })
  return row.resultado
}

export function useEstadoFestivo({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof setEstadoFestivo> } = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: setEstadoFestivo,
    ...rest,
    onSuccess: (...args) => {
      invalidarFestivos(queryClient)
      onSuccess?.(...args)
    },
  })
}
