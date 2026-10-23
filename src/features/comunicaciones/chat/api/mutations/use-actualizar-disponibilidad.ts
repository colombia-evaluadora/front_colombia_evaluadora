import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { MutationConfig } from "@/lib/react-query"
import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"
import { DISPONIBILIDAD_PATH } from "@/features/comunicaciones/chat/api/query/use-disponibilidad-query"
import type { MiDisponibilidad } from "@/features/comunicaciones/chat/api/types"
import type { PerfilChat } from "@/features/comunicaciones/chat/lib/politica-chat"

export interface ActualizarDisponibilidad {
  estado?: MiDisponibilidad["estado"]
  // "" borra la respuesta automática.
  respuestaAutomatica?: string
  visiblePara?: PerfilChat[]
}

/** Solo el propio estado: el servidor toma al usuario del token (no se manda ningún id). */
export async function actualizarDisponibilidad(v: ActualizarDisponibilidad) {
  return evalCol.patchRow<MiDisponibilidad>(DISPONIBILIDAD_PATH, {
    ...(v.estado !== undefined ? { ESTADO: v.estado } : {}),
    ...(v.respuestaAutomatica !== undefined ? { RESPUESTA_AUTOMATICA: v.respuestaAutomatica } : {}),
    ...(v.visiblePara !== undefined ? { VISIBLE_PARA: v.visiblePara } : {}),
  })
}

export function useActualizarDisponibilidad({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof actualizarDisponibilidad> } = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: actualizarDisponibilidad,
    ...rest,
    onSuccess: (...args) => {
      queryClient.setQueryData(chatKeys.disponibilidad, args[0])
      onSuccess?.(...args)
    },
  })
}
