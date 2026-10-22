import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { getDeviceId } from "@/lib/offline/device-token"
import type { Device } from "@/features/devices/api/types/device"

export const devicesQueryKey = (sub: string | null) => ["devices", "mine", sub] as const
export const adminDevicesQueryKey = (email: string) => ["devices", "admin", email] as const

/** Mis equipos. `X-Device-Id` marca cuál es este (`current`). */
async function fetchMyDevices(sub: string | null): Promise<Device[]> {
  const deviceId = sub ? await getDeviceId(sub) : undefined
  return api.get<Device[]>("/auth/devices", { headers: deviceId ? { "X-Device-Id": deviceId } : {} })
}

export function useMyDevicesQuery(sub: string | null) {
  return useQuery({
    queryKey: devicesQueryKey(sub),
    queryFn: () => fetchMyDevices(sub),
    enabled: Boolean(sub),
  })
}

/** Super administrador: equipos de otro usuario por correo. */
export function useAdminDevicesQuery(email: string) {
  return useQuery({
    queryKey: adminDevicesQueryKey(email),
    queryFn: () => api.get<Device[]>("/auth/devices/admin", { params: { email } }),
    enabled: email.length > 0,
    retry: false,
  })
}
