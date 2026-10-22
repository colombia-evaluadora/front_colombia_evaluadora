import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { Device } from "@/features/devices/api/types/device"

export interface RevokeDeviceInput {
  id: number
  /** Borrar los datos del equipo en su próxima conexión (borrado remoto). */
  wipe: boolean
  /** Super administrador revocando el equipo de otro usuario. */
  admin?: boolean
}

export function revokeDevice({ id, wipe, admin }: RevokeDeviceInput): Promise<Device> {
  const base = admin ? "/auth/devices/admin" : "/auth/devices"
  return api.post<Device>(`${base}/${id}/revoke`, { wipe })
}

export function useRevokeDevice({ mutationConfig }: { mutationConfig?: MutationConfig<typeof revokeDevice> } = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: revokeDevice,
    ...rest,
    onSuccess: (...args) => {
      void queryClient.invalidateQueries({ queryKey: ["devices"] })
      onSuccess?.(...args)
    },
  })
}
