import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { MutationConfig } from "@/lib/react-query"

import { configuracionKeys } from "@/features/gestion-estudiantil/configuracion/api/query-keys"
import { BASE_CONFIGURACION } from "@/features/gestion-estudiantil/configuracion/api/query/use-configuracion-query"
import type { GuardarNivelesInput } from "@/features/gestion-estudiantil/configuracion/api/types"

/** `PUT /configuracion/niveles-convivencia`: los dos umbrales o ninguno (los dos vacíos quitan el nivel). */
const guardarNiveles = (body: GuardarNivelesInput) =>
  evalCol.putRow<{ id: number }>(`${BASE_CONFIGURACION}/niveles-convivencia`, body)

export function useGuardarNiveles({ mutationConfig }: { mutationConfig?: MutationConfig<typeof guardarNiveles> } = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: guardarNiveles,
    ...rest,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: configuracionKeys.all })
      onSuccess?.(...args)
    },
  })
}
