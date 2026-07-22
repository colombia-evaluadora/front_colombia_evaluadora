import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query"
import * as z from "zod"

import { api, setAuthToken } from "./api-client"
import { toAuthUserFromToken, type AuthUser } from "./auth-mapper"
import type { MutationConfig } from "./react-query"
import type { AuthResponse } from "@/types/api"

const USER_QUERY_KEY = ["auth-user"]

// El backend no expone un "/auth/me": la sesión se restaura pidiendo un
// access token nuevo (el refresh token viaja en una cookie httpOnly, nunca
// visible acá) y derivando el usuario de sus claims.
async function getUser(): Promise<AuthUser | null> {
  try {
    const { token }: AuthResponse = await api.post("/auth/refresh")
    setAuthToken(token)
    return toAuthUserFromToken(token)
  } catch {
    return null
  }
}

const logout = (): Promise<void> => api.post("/auth/logout")

export const loginInputSchema = z.object({
  email: z.email("Email inválido"),
  password: z.string().min(1, "Requerido"),
})
export type LoginInput = z.infer<typeof loginInputSchema>

const loginWithEmailAndPassword = (data: LoginInput): Promise<AuthResponse> =>
  api.post("/auth/login", data)

// Mismo endpoint/contrato que el backend real (GET .../forgotPassword?email=):
// nunca revela si el email existe, siempre resuelve con éxito. El body es
// opcional: el backend real responde vacío (el enlace va por correo), el mock
// devuelve el token para poder seguir el flujo sin bandeja de entrada.
export interface ForgotPasswordResponse {
  token?: string
  expiresIn?: number
}

const forgotPassword = (email: string): Promise<ForgotPasswordResponse> =>
  api.get("/sso-admin/forgotPassword", { params: { email } })

export type ResetTokenStatus = "valid" | "expired" | "invalid"

export interface ResetTokenStatusResponse {
  status: ResetTokenStatus
  /** Segundos restantes; 0 si venció o el token no existe. */
  expiresIn: number
  /** Correo al que se envió el enlace. Ausente si el token no existe. */
  email?: string
  /** Epoch ms en que se envió el enlace. */
  issuedAt?: number
}

const getResetTokenStatus = (
  token: string
): Promise<ResetTokenStatusResponse> =>
  api.get("/sso-admin/resetTokenStatus", { params: { token } })

const restorePassword = (data: {
  token: string
  password: string
}): Promise<void> => api.post("/sso-admin/restorePassword", data)

export function useUser() {
  return useQuery({
    queryKey: USER_QUERY_KEY,
    queryFn: getUser,
  })
}

export function useLogin({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof loginWithEmailAndPassword> } = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: loginWithEmailAndPassword,
    ...mutationConfig,
    onSuccess: (data, ...args) => {
      setAuthToken(data.token)
      queryClient.setQueryData(USER_QUERY_KEY, toAuthUserFromToken(data.token))
      mutationConfig?.onSuccess?.(data, ...args)
    },
  })
}

export function useLogout({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof logout> } = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: logout,
    ...mutationConfig,
    onSuccess: (...args) => {
      setAuthToken(null)
      // Full clear, not just the user key — otherwise cached protected data
      // (payments, nav menu, ...) stays "fresh" for `staleTime` and could be
      // reused if a different user logs in on the same tab before it expires.
      queryClient.clear()
      mutationConfig?.onSuccess?.(...args)
    },
  })
}

export function useForgotPassword({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof forgotPassword> } = {}) {
  return useMutation({
    mutationFn: forgotPassword,
    ...mutationConfig,
  })
}

/**
 * Estado del enlace de reseteo. Se consulta una sola vez por token: la
 * cuenta regresiva la lleva la UI a partir del `expiresIn` que devuelve,
 * sin repreguntar al servidor cada segundo.
 */
export const resetTokenStatusQueryKey = (token: string | undefined) => [
  "reset-token-status",
  token,
]

export function useResetTokenStatus(token: string | undefined) {
  return useQuery({
    queryKey: resetTokenStatusQueryKey(token),
    queryFn: () => getResetTokenStatus(token!),
    enabled: !!token,
    staleTime: Infinity,
    retry: false,
  })
}

export function useRestorePassword({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof restorePassword> } = {}) {
  return useMutation({
    mutationFn: restorePassword,
    ...mutationConfig,
  })
}

// Usado en `beforeLoad` de las rutas protegidas (TanStack Router). Es async
// porque debe poder disparar y esperar el refresh la primera vez (recarga de
// página) en vez de asumir "sin sesión" solo porque la query todavía no corrió.
export async function hasSession(queryClient: QueryClient): Promise<boolean> {
  const user = await queryClient.ensureQueryData({
    queryKey: USER_QUERY_KEY,
    queryFn: getUser,
  })
  return !!user
}
