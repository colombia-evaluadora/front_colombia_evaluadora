import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query"
import * as z from "zod"

import { api, setAuthToken } from "./api-client"
import { toAuthUser, type AuthUser } from "./auth-mapper"
import type { MutationConfig } from "./react-query"
import type { AuthResponse, User } from "@/types/api"

const USER_QUERY_KEY = ["auth-user"]

async function getUser(): Promise<AuthUser | null> {
  try {
    const user: User = await api.get("/auth/me")
    return toAuthUser(user)
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
      queryClient.setQueryData(USER_QUERY_KEY, toAuthUser(data.user))
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
// porque debe poder disparar y esperar el fetch de /auth/me la primera vez
// (recarga de página) en vez de asumir "sin sesión" solo porque la query
// todavía no corrió.
export async function hasSession(queryClient: QueryClient): Promise<boolean> {
  const user = await queryClient.ensureQueryData({
    queryKey: USER_QUERY_KEY,
    queryFn: getUser,
  })
  return !!user
}
