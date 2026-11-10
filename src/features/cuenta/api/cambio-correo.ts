import { useMutation } from "@tanstack/react-query"
import * as z from "zod"

import { api } from "@/lib/api-client"

/**
 * Cambio de correo (U.6.COR, sso `CambioCorreoService`):
 * 1. Mi cuenta pide el cambio con la contraseña → enlace al correo nuevo (24 h).
 * 2. `/confirmar-correo?token=` lo confirma → aviso al correo anterior.
 * 3. `/no-fui-yo?token=` lo revierte (7 días) y cierra todas las sesiones.
 */
export const tokenSearchSchema = z.object({
  token: z.string().optional().catch(undefined),
})

export function useSolicitarCambioCorreo() {
  return useMutation({
    mutationFn: (body: { correoNuevo: string; password: string }) =>
      api.post<{ maskedEmail: string }>("/sso-admin/me/email-change", body),
  })
}

export function useConfirmarCorreo() {
  return useMutation({
    mutationFn: (token: string) =>
      api.post<{ maskedEmail: string }>("/sso-admin/emailChange/confirm", { token }),
  })
}

export function useNoFuiYo() {
  return useMutation({
    mutationFn: (token: string) => api.post<void>("/sso-admin/emailChange/revert", { token }),
  })
}
