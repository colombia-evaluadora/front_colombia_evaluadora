import { useMutation, useQueryClient } from "@tanstack/react-query"

import type { MutationConfig } from "@/lib/react-query"

import { restaurarMock } from "@/features/bitacora/api/mock-bitacora"
import { bitacoraKeys } from "@/features/bitacora/api/query/use-bitacora-query"
import type { BitacoraEvento, BitacoraModulo } from "@/features/bitacora/api/types/bitacora"

// TODO: endpoint de restauración cuando exista en el back.
async function restaurarEvento({
  modulo,
  evento,
  motivo,
}: {
  modulo: BitacoraModulo
  evento: BitacoraEvento
  motivo: string
}) {
  await new Promise((r) => setTimeout(r, 400))
  restaurarMock(modulo, evento, motivo)
}

export function useRestaurarEvento({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof restaurarEvento> } = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: restaurarEvento,
    ...rest,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: bitacoraKeys.all })
      onSuccess?.(...args)
    },
  })
}
