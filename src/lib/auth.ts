import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query"
import * as z from "zod"

import { api, isNetworkError, NetworkSessionError, setAuthToken } from "@/lib/api-client"
import { toAuthUser, toAuthUserFromToken, type AuthUser } from "@/lib/auth-mapper"
import { paths } from "@/config/paths"
import { env } from "@/config/env"
import { connectivityStore } from "@/lib/offline/connectivity"
import {
  activatePersistUser,
  clearUserData,
  deactivatePersistUser,
  getActivePersistUser,
  initOfflinePersistence,
  startQueryPersister,
} from "@/lib/offline/query-persister"
import {
  getUsableOfflineSession,
  saveOnlineSession,
  seedNavigationFromSession,
  startSessionSnapshotSync,
} from "@/lib/offline/session"
import type { MutationConfig } from "@/lib/react-query"
import { toEmailInput } from "@/lib/text-input"
import type { AuthResponse } from "@/types/api"

const USER_QUERY_KEY = ["auth-user"]

// El backend no expone un "/auth/me": la sesión se restaura pidiendo un
// access token nuevo (el refresh token viaja en una cookie httpOnly, nunca
// visible acá) y derivando el usuario de sus claims.
//
// Solo un 401/403 del refresh significa "sin sesión". Un error de red,
// timeout o 5xx de gateway NO dice nada sobre la sesión: se lanza
// `NetworkSessionError` para que el guard reintente y, si persiste, muestre
// el error recuperable en vez de mandar a /login (recargar offline te
// deslogueaba aunque la cookie siguiera viva).
export async function getUser(): Promise<AuthUser | null> {
  try {
    const { token }: AuthResponse = await api.post("/auth/refresh")
    setAuthToken(token)
    return toAuthUserFromToken(token)
  } catch (error) {
    // Cualquier 5xx del refresh tampoco confirma ni niega la sesión.
    const status = (error as { response?: { status?: number } })?.response?.status
    if (isNetworkError(error) || (status != null && status >= 500)) {
      throw new NetworkSessionError(error)
    }
    // 401/403 = sin sesión. Otro status (500, 4xx inesperado) o un token
    // ilegible tampoco dejan una sesión utilizable, igual que antes.
    return null
  }
}

/**
 * Sin red (§7.8) el logout igual tiene que limpiar este equipo: si el POST
 * falla por red se resuelve como logout local (la cookie `sso_refresh` vence
 * sola en el servidor). Un error HTTP real sí se propaga.
 */
const logout = async (): Promise<void> => {
  // Web Push (D-4.4): la suscripción de este navegador se borra ANTES del
  // logout, mientras el token todavía sirve para el `DELETE`. En un equipo
  // compartido el siguiente usuario no debe recibir los avisos del anterior.
  // Import dinámico: solo se carga si el build trae clave VAPID.
  if (env.VAPID_PUBLIC_KEY) {
    const { cleanupPushOnLogout } = await import("@/features/notificaciones/push/lib/push-client")
    await cleanupPushOnLogout()
  }
  try {
    await api.post("/auth/logout")
  } catch (error) {
    if (!isNetworkError(error)) throw error
  }
}

export const loginInputSchema = z.object({
  // Limpia caracteres invisibles (word joiner, zero-width, BOM, NBSP) antes
  // de validar: `.trim()` no los quita y llegan al pegar el correo.
  email: z.string().transform(toEmailInput).pipe(z.email("Email inválido")),
  password: z.string().min(1, "Requerido"),
})
export type LoginInput = z.infer<typeof loginInputSchema>

/**
 * `rememberMe` ("Mantener sesión iniciada") no cambia dónde vive el token: el
 * access token queda SIEMPRE solo en memoria (ver `setAuthToken` en
 * `api-client.ts`). El flag viaja al backend como header `x-remember-me`, y
 * es el backend el que decide cuánto dura la sesión ajustando el `Max-Age`
 * de la cookie httpOnly `sso_refresh`.
 */
interface LoginInputWithRemember extends LoginInput {
  rememberMe: boolean
}

const loginWithEmailAndPassword = (data: LoginInputWithRemember): Promise<AuthResponse> => {
  // El flag va como header para que el backend fije el `Max-Age` de la
  // cookie de refresh; sin el header la cookie dura lo que el default.
  return api.post("/auth/login", data, {
    headers: data.rememberMe ? { "x-remember-me": "true" } : {},
  })
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
      // Solo memoria. La persistencia de la sesión la resuelve la cookie
      // `sso_refresh` que el backend emitió en esta misma respuesta: su
      // `Max-Age` sale del header `x-remember-me` que mandó el login, así que
      // "Mantener sesión iniciada" ya quedó decidido del lado del servidor.
      setAuthToken(data.token)
      queryClient.setQueryData(USER_QUERY_KEY, toAuthUserFromToken(data.token))
      // Menú y permisos por pantalla (`staleTime: Infinity`) son del usuario
      // ANTERIOR si quedó algo en caché (logout y sesión vencida ya hacen
      // `clear()`, esto cubre cualquier otro camino). El guard de `/app` decide
      // con este menú: tiene que salir del token nuevo, no de la caché.
      queryClient.removeQueries({ queryKey: ["navigation"] })
      // Web Push: si este navegador quedó suscrito por OTRO usuario, se
      // suelta (cambio de usuario en equipo compartido, D-4.4).
      if (env.VAPID_PUBLIC_KEY) {
        const sub = toAuthUserFromToken(data.token)?.id
        if (sub) {
          void import("@/features/notificaciones/push/lib/push-client").then((m) =>
            m.releasePushIfOtherUser(sub),
          )
        }
      }
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
    // Sin `always` el `onlineManager` (offline) deja la mutación pausada y el
    // logout nunca corre.
    networkMode: "always",
    ...mutationConfig,
    onSuccess: async (...args) => {
      // Lo persistido de ESTE usuario (queries + session) se borra antes de
      // vaciar la memoria (§5.5). Si IndexedDB falla, el logout sigue.
      const sub = queryClient.getQueryData<AuthUser>(USER_QUERY_KEY)?.id ?? getActivePersistUser()
      deactivatePersistUser()
      lastAuthedUser = null
      if (sub) await clearUserData(sub).catch(() => undefined)
      setAuthToken(null)
      // Full clear, not just the user key — otherwise cached protected data
      // (nav menu, ...) stays "fresh" for `staleTime` and could be
      // reused if a different user logs in on the same tab before it expires.
      queryClient.clear()
      mutationConfig?.onSuccess?.(...args)
    },
  })
}

// ---- Modo "autenticado sin conexión" (D7) ----------------------------------

// Último usuario online ya registrado (activación + `session`): evita
// reescribir IndexedDB en cada navegación, porque el guard corre siempre.
let lastAuthedUser: AuthUser | null = null

/**
 * Usuario confirmado por el servidor: pasa a ser el dueño de lo persistido
 * (si cambió, el cache del anterior se vacía y se restaura el suyo) y se
 * guarda su `session` con `lastOnlineAuthAt = ahora`.
 */
async function onOnlineAuthenticated(queryClient: QueryClient, user: AuthUser) {
  if (lastAuthedUser === user) return
  lastAuthedUser = user
  try {
    await activatePersistUser(queryClient, user.id, { keep: [USER_QUERY_KEY] })
    await saveOnlineSession({
      sub: user.id,
      name: user.name,
      roles: user.roles,
      isSuperAdmin: user.isSuperAdmin,
    })
  } catch (error) {
    console.warn("[offline] no se pudo guardar la sesión", error)
  }
}

/**
 * Entra sin red con la `session` del último usuario del equipo (solo equipo
 * personal y ≤ 14 días desde la última autenticación online). Siembra el
 * usuario, su cache persistido y el menú/permisos (≤ 30 días). Sin token: las
 * requests no salen hasta que vuelva la red y el refresh lo reautentique.
 */
export async function enterOfflineSession(queryClient: QueryClient): Promise<AuthUser | null> {
  await initOfflinePersistence()
  const session = await getUsableOfflineSession()
  if (!session) return null
  const user: AuthUser = {
    ...toAuthUser({
      id: session.sub,
      email: session.sub,
      name: session.name,
      role: session.roles.includes("ADMIN") ? "ADMIN" : "USER",
      roles: session.roles,
    }),
    offline: true,
  }
  queryClient.setQueryData(USER_QUERY_KEY, user)
  lastAuthedUser = null
  await activatePersistUser(queryClient, session.sub, { keep: [USER_QUERY_KEY] })
  seedNavigationFromSession(queryClient, session)
  return user
}

/** Nombre a ofrecer en "Continuar sin conexión como {nombre}", si se puede. */
export async function getOfflineContinueName(): Promise<string | null> {
  await initOfflinePersistence()
  return (await getUsableOfflineSession())?.name ?? null
}

let revalidating = false

/**
 * Al volver la red con un usuario offline: refresh normal. Si el servidor
 * confirma que no hay sesión (401/403), se vacía la memoria y se pide login
 * (lo persistido del `sub` se conserva, §D7). Un error de red no hace nada.
 */
async function revalidateOfflineUser(queryClient: QueryClient) {
  const current = queryClient.getQueryData<AuthUser>(USER_QUERY_KEY)
  if (!current?.offline || revalidating) return
  revalidating = true
  try {
    const user = await getUser()
    if (user) {
      queryClient.setQueryData(USER_QUERY_KEY, user)
      await onOnlineAuthenticated(queryClient, user)
      // Lo sembrado offline (menú, permisos, datos) se refresca con la red.
      void queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] !== USER_QUERY_KEY[0] })
      return
    }
    deactivatePersistUser()
    lastAuthedUser = null
    queryClient.clear()
    if (typeof window !== "undefined") {
      window.location.href = paths.auth.login.getHref(window.location.pathname)
    }
  } catch {
    // Sigue sin red de verdad: se reintenta en el próximo cambio a `online`.
  } finally {
    revalidating = false
  }
}

let offlineSupportStarted = false

/**
 * Conecta la persistencia: persister de queries, snapshot de menú/permisos y
 * reautenticación al volver la red. Se llama una vez al crear el provider.
 */
export function startOfflineSupport(queryClient: QueryClient) {
  if (offlineSupportStarted) return
  offlineSupportStarted = true
  void initOfflinePersistence()
  startQueryPersister(queryClient)
  startSessionSnapshotSync(queryClient, getActivePersistUser)
  connectivityStore.subscribe((state) => {
    if (state.status === "online") void revalidateOfflineUser(queryClient)
  })
}

// Usado en `beforeLoad` de las rutas protegidas (TanStack Router). Es async
// porque debe poder disparar y esperar el refresh la primera vez (recarga de
// página) en vez de asumir "sin sesión" solo porque la query todavía no corrió.
//
// Ante `NetworkSessionError` reintenta 3 veces con backoff 1 s, 2 s, 4 s
// (≈7 s en total). Si sigue sin red (o el `connectivityStore` ya dice
// `offline`, y entonces sin esperar) intenta el modo autenticado sin conexión;
// si no hay `session` usable, propaga el error al `ErrorPage`.
//
// Antes de decidir espera la inicialización de `ce-offline` y, con usuario,
// restaura su cache persistido: así todo lo que corre después en el router
// (loaders, componentes) ya ve los datos restaurados.
export const SESSION_RETRY_DELAYS_MS = [1000, 2000, 4000]

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function hasSession(queryClient: QueryClient): Promise<boolean> {
  await initOfflinePersistence()
  for (let attempt = 0; ; attempt++) {
    try {
      const user = await queryClient.ensureQueryData({
        queryKey: USER_QUERY_KEY,
        queryFn: getUser,
        // El backoff lo maneja este loop (1 s, 2 s, 4 s): con el `retry` por
        // defecto de las queries (2 reintentos de red) cada intento tardaba
        // ~3 s más y el guard dejaba la pantalla en blanco ~20 s.
        retry: false,
        // Con `networkMode: "online"` (default) y el `connectivityStore` en
        // `offline`, la query quedaría PAUSADA para siempre y el guard nunca
        // llegaría al `ErrorPage` con "Reintentar".
        networkMode: "always",
      })
      if (user && !user.offline) await onOnlineAuthenticated(queryClient, user)
      return !!user
    } catch (error) {
      if (!(error instanceof NetworkSessionError)) throw error
      const exhausted = attempt >= SESSION_RETRY_DELAYS_MS.length
      if (exhausted || connectivityStore.getState().status === "offline") {
        if (await enterOfflineSession(queryClient)) return true
        if (exhausted) throw error
      }
      await wait(SESSION_RETRY_DELAYS_MS[attempt])
    }
  }
}
