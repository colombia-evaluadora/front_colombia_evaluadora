import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query"
import * as z from "zod"

import { api, setAuthToken } from "./api-client"
import { toAuthUserFromToken, type AuthUser } from "./auth-mapper"
import type { MutationConfig } from "./react-query"
import type { AuthResponse } from "@/types/api"

const REMEMBER_KEY = "auth_remember_me"

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

/**
 * `rememberMe` solo afecta al cliente: si el usuario lo marca, persistimos
 * el token en localStorage. Si no, el token queda en memoria y muere con la
 * pestaña. El backend real maneja el "remember" con un refresh cookie, pero
 * acá el token del mock es lo único que tenemos.
 */
interface LoginInputWithRemember extends LoginInput {
  rememberMe: boolean
}

const loginWithEmailAndPassword = (data: LoginInputWithRemember): Promise<AuthResponse> => {
  // El endpoint real solo valida credenciales: mandamos el flag como header
  // para que el backend decida el `expiresIn` cuando lo soporte.
  return api.post("/auth/login", data, {
    headers: data.rememberMe ? { "x-remember-me": "true" } : {},
  })
}

function setRememberPreference(value: boolean) {
  if (value) localStorage.setItem(REMEMBER_KEY, "true")
  else localStorage.removeItem(REMEMBER_KEY)
}

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
}: {
  mutationConfig?: MutationConfig<typeof loginWithEmailAndPassword>
} = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: loginWithEmailAndPassword,
    ...mutationConfig,
    onSuccess: (data, variables, ...rest) => {
      // Persistencia según `rememberMe`: si no se marcó, limpiamos
      // cualquier token persistido de antes para que la próxima vez que se
      // recargue la pestaña no quede sesión fantasma.
      if (!variables.rememberMe) {
        setAuthToken(null)
      } else {
        setAuthToken(data.token)
      }
      setRememberPreference(variables.rememberMe)
      queryClient.setQueryData(USER_QUERY_KEY, toAuthUserFromToken(data.token))
      mutationConfig?.onSuccess?.(data, variables, ...rest)
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
