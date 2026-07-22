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

// Los flujos de recuperación (contraseña y usuario) viven en
// features/auth/api — acá queda solo lo que hace a la sesión, que usa toda
// la app (router, layouts protegidos, menú).

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
