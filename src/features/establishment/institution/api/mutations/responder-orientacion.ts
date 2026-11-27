import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { MutationConfig } from "@/lib/react-query"

import { establishmentKeys } from "@/features/establishment/institution/api/query-keys"
import { ORIENTACIONES_RECIBIDAS_BASE } from "@/features/establishment/institution/api/query/use-orientaciones-recibidas"

/** Responder una orientación Enviada (informe, 2.3): queda Atendida y se avisa al territorial que la envió. */
export function responderOrientacion({ id, respuesta }: { id: number; respuesta: string }) {
  return evalCol.postRow<{ id: number }>(`${ORIENTACIONES_RECIBIDAS_BASE}/${id}/responder`, {
    RESPUESTA: respuesta,
  })
}

export function useResponderOrientacion({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof responderOrientacion> } = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: responderOrientacion,
    ...rest,
    onSuccess: (...args) => {
      // Lista, contador de la pestaña y detalle cuelgan del mismo prefijo.
      queryClient.invalidateQueries({ queryKey: establishmentKeys.orientaciones.all })
      onSuccess?.(...args)
    },
  })
}
