import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

/** Mi cuenta › Sesiones activas (Administración del Sistema §13.4–13.5). */
export interface SesionActiva {
  id: string
  inicio: string
  ultimoUso: string
  app: string | null
  /** La sesión de este navegador. */
  actual: boolean
}

export const sesionesKey = ["cuenta", "sesiones"] as const

export function useSesionesActivas() {
  return useQuery({ queryKey: sesionesKey, queryFn: () => api.get<SesionActiva[]>("/auth/sesiones") })
}

export function useCerrarSesion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post<void>(`/auth/sesiones/${encodeURIComponent(id)}/cerrar`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sesionesKey }),
  })
}

export function useCerrarDemasSesiones() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.post<{ cerradas: number }>("/auth/sesiones/cerrar-demas"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sesionesKey }),
  })
}

/** Cambiar contraseña: cierra las demás sesiones y conserva esta. */
export function useCambiarContrasena() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: { actual: string; nueva: string }) => api.post<void>("/sso-admin/me/password", body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sesionesKey }),
  })
}

/** Superadministradores › Restablecer segundo factor (§7.1), sobre otro Superadministrador. */
export function useRestablecerSegundoFactor() {
  return useMutation({
    mutationFn: (body: { correo: string; motivo: string }) => api.post<void>("/auth/segundo-factor/restablecer", body),
  })
}
