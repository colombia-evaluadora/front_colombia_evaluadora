import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { abrirSesion } from "@/lib/auth"
import type { AuthResponse } from "@/types/api"

/**
 * Verificación en dos pasos (U.5.DOS, sso `SegundoFactorService`).
 *
 * El primer `/login` con la contraseña correcta devuelve `{segundoFactor,
 * desafio}` en lugar de los tokens. El desafío vale 5 minutos y se guarda en
 * `sessionStorage` (no en la URL) mientras la persona escribe el código.
 */
export type TipoCodigo = "APP" | "RESPALDO" | "CORREO"

export interface DesafioGuardado {
  desafio: string
  modo: "VERIFICAR" | "CONFIGURAR"
  maskedEmail?: string
  redirectTo?: string
}

const KEY = "ce:segundo-factor"

export function guardarDesafio(d: DesafioGuardado) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(d))
  } catch {
    // Sin almacenamiento: la pantalla de verificación pedirá volver a iniciar sesión.
  }
}

export function leerDesafio(): DesafioGuardado | null {
  try {
    const v = sessionStorage.getItem(KEY)
    return v ? (JSON.parse(v) as DesafioGuardado) : null
  } catch {
    return null
  }
}

export function borrarDesafio() {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    // nada que borrar
  }
}

export interface ConfiguracionApp {
  /** Clave en grupos de 4 (para escribirla a mano). */
  secreto: string
  /** otpauth://… para el QR. */
  uri: string
}

/** Segundo `/login`: con el código (o sin él si la configuración ya se confirmó) abre la sesión. */
export function useCompletarLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: { desafio: string; codigo?: string; tipo?: TipoCodigo; recordar?: boolean }) =>
      api.post<AuthResponse>("/auth/login", body),
    onSuccess: (data) => {
      if (data.token) {
        borrarDesafio()
        abrirSesion(queryClient, data.token)
      }
    },
  })
}

export function useCodigoAlCorreo() {
  return useMutation({
    mutationFn: (desafio: string) =>
      api.post<{ maskedEmail: string; expiresIn: number }>("/auth/segundo-factor/codigo-correo", { desafio }),
  })
}

/** Primer ingreso del Superadministrador: secreto y QR. */
export function useConfiguracionInicial(desafio: string | undefined) {
  return useQuery({
    queryKey: ["segundo-factor", "configurar", desafio],
    queryFn: () => api.post<ConfiguracionApp>("/auth/segundo-factor/configurar", { desafio }),
    enabled: Boolean(desafio),
    staleTime: Infinity,
    retry: false,
  })
}

export function useConfirmarConfiguracionInicial() {
  return useMutation({
    mutationFn: (body: { desafio: string; codigo: string }) =>
      api.post<{ codigosRespaldo: string[] }>("/auth/segundo-factor/configurar/confirmar", body),
  })
}

// ------------------------------------------------------------ Mi cuenta › Seguridad

export interface EstadoSegundoFactor {
  activo: boolean
  /** Solo cuentas con perfil de funcionario. */
  disponible: boolean
  /** Superadministrador: no puede desactivarla. */
  obligatorio: boolean
  codigosRestantes: number
}

export const segundoFactorKey = ["segundo-factor", "estado"] as const

export function useEstadoSegundoFactor() {
  return useQuery({
    queryKey: segundoFactorKey,
    queryFn: () => api.get<EstadoSegundoFactor>("/auth/segundo-factor"),
  })
}

export function useActivarSegundoFactor() {
  return useMutation({
    mutationFn: (password: string) => api.post<ConfiguracionApp>("/auth/segundo-factor/activar", { password }),
  })
}

export function useConfirmarActivacion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (codigo: string) =>
      api.post<{ codigosRespaldo: string[] }>("/auth/segundo-factor/activar/confirmar", { codigo }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: segundoFactorKey }),
  })
}

export function useDesactivarSegundoFactor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (password: string) => api.post<void>("/auth/segundo-factor/desactivar", { password }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: segundoFactorKey }),
  })
}

export function useRegenerarCodigos() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (password: string) =>
      api.post<{ codigosRespaldo: string[] }>("/auth/segundo-factor/codigos", { password }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: segundoFactorKey }),
  })
}
