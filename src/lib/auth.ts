import { lockVault } from "@/lib/offline/vault"
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query"
import * as z from "zod"

import {
  api,
  beginLogout,
  finishLogout,
  hasAuthToken,
  isNetworkError,
  NetworkSessionError,
  refreshAccessToken,
  setAuthToken,
} from "@/lib/api-client"
import { toAuthUser, toAuthUserFromToken, type AuthUser } from "@/lib/auth-mapper"
import { publishRefreshedToken } from "@/lib/auth-refresh-coordination"
import { captchaHeaders } from "@/lib/captcha"
import { paths } from "@/config/paths"
import { env } from "@/config/env"
import { connectivityStore } from "@/lib/offline/connectivity"
import { stopRealtime } from "@/lib/realtime"
import {
  activatePersistUser,
  clearUserData,
  deactivatePersistUser,
  getActivePersistUser,
  getDeviceMode,
  initOfflinePersistence,
  startQueryPersister,
} from "@/lib/offline/query-persister"
import {
  getUsableOfflineSession,
  saveOnlineSession,
  seedNavigationFromSession,
  startSessionSnapshotSync,
} from "@/lib/offline/session"
import { logoutKeepsDeviceData } from "@/lib/offline/device-policy"
import {
  hasLocalCredential,
  isDeviceSessionLocked,
  lockDeviceSession,
  unlockDeviceSession,
  verifyLocalCredential,
} from "@/lib/offline/local-credential"
import { hasVault } from "@/lib/offline/vault"
import { ensureDeviceAccessToken, reconcileDevice, tryDeviceSession } from "@/lib/offline/device-session"
import { deleteDeviceToken } from "@/lib/offline/device-token"
import { configureOutbox, isSyncing, startOutbox, syncNow } from "@/lib/offline/outbox/engine"
import { notifySyncIdle, setSyncInProgressProbe } from "@/lib/offline/sw-update"
import { getOutboxUser, outboxStore, setOutboxUser } from "@/lib/offline/outbox/store"
import { toast } from "sonner"
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
//
// En un equipo personal registrado va PRIMERO el token del equipo
// (`device-session.ts`): su access token trae `did` y es el único con el que
// el backend acepta `X-Client-Captured-At`. Si no hay o no sirve, la cookie.
export async function getUser(): Promise<AuthUser | null> {
  try {
    const deviceToken = await tryDeviceSession()
    if (deviceToken) {
      const deviceUser = toAuthUserFromToken(deviceToken)
      if (deviceUser) {
        setAuthToken(deviceToken)
        return deviceUser
      }
    }
    // Single-flight con la revalidación de 401/403 (ver `refreshAccessToken`):
    // dos refresh con la misma cookie hacen que auth-center revoque la sesión.
    const token = await refreshAccessToken()
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

export interface LogoutOptions {
  /**
   * Conservar lo guardado en el equipo y bloquearlo en vez de borrarlo. Por
   * defecto lo decide `logoutKeepsDeviceData` (app instalada = conserva);
   * "Borrar los datos de este equipo" pasa `false` después de borrar.
   */
  keepDeviceData?: boolean
}

/**
 * Sin red (§7.8) el logout igual tiene que limpiar este equipo: si el POST
 * falla por red se resuelve como logout local (la cookie `sso_refresh` vence
 * sola en el servidor). Un error HTTP real sí se propaga.
 */
const logout = async (_options?: LogoutOptions): Promise<void> => {
  // Lo de fondo (Preparar, outbox, polling, tiempo real) se corta YA: sin
  // esto seguía disparando requests con el token viejo mientras el logout
  // viajaba y después, cada una un 401 (QA). Solo salen la baja de Web Push
  // y `/auth/logout`.
  beginLogout()
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
    if (!isNetworkError(error)) {
      // El servidor rechazó el logout: la sesión sigue, se reabre.
      finishLogout({ failed: true })
      throw error
    }
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
  /** Token de Turnstile (`useCaptcha().consume()`); viaja como header, no en el body. */
  captchaToken?: string | null
}

const loginWithEmailAndPassword = ({
  captchaToken,
  ...data
}: LoginInputWithRemember): Promise<AuthResponse> => {
  // El flag va como header para que el backend fije el `Max-Age` de la
  // cookie de refresh; sin el header la cookie dura lo que el default.
  return api.post("/auth/login", data, {
    headers: {
      ...(data.rememberMe ? { "x-remember-me": "true" } : {}),
      ...captchaHeaders(captchaToken),
    },
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
      // En la app instalada se CONSERVA y queda bloqueado (D-12): un docente
      // que cierra sesión por error sin red no pierde meses de datos.
      const [, options] = args
      const keep = options?.keepDeviceData ?? logoutKeepsDeviceData(getDeviceMode())
      const sub = queryClient.getQueryData<AuthUser>(USER_QUERY_KEY)?.id ?? getActivePersistUser()
      // Mientras se cierra la sesión el usuario sigue en el cache: un
      // `hasSession` concurrente (p. ej. la precarga de un link al pasar el
      // mouse) lo encontraba y `onOnlineAuthenticated` volvía a activar la
      // persistencia y desbloqueaba la app instalada recién bloqueada.
      loggingOut = true
      try {
        deactivatePersistUser()
        // La DEK no sobrevive al logout: el próximo ingreso vuelve a pedir el PIN.
        lockVault()
        // La outbox NO se borra acá (D-F2-6): el diálogo de logout con
        // pendientes decide conservar o descartar antes de llamar al logout.
        await setOutboxUser(null)
        if (sub && keep) await lockDeviceSession(sub).catch(() => undefined)
        else if (sub) {
          await clearUserData(sub).catch(() => undefined)
          // Equipo que no conserva datos: tampoco conserva la credencial del equipo.
          await deleteDeviceToken(sub).catch(() => undefined)
        }
        setAuthToken(null)
        // Las otras pestañas no deben reusar un token de esta sesión.
        publishRefreshedToken(null)
        // El socket de tiempo real no debe sobrevivir al usuario (spec: Logout).
        stopRealtime()
        // Full clear, not just the user key — otherwise cached protected data
        // (nav menu, ...) stays "fresh" for `staleTime` and could be
        // reused if a different user logs in on the same tab before it expires.
        queryClient.clear()
        lastAuthedUser = null
      } finally {
        loggingOut = false
        finishLogout()
      }
      mutationConfig?.onSuccess?.(...args)
    },
  })
}

// ---- Modo "autenticado sin conexión" (D7) ----------------------------------

// Último usuario online ya registrado (activación + `session`): evita
// reescribir IndexedDB en cada navegación, porque el guard corre siempre.
let lastAuthedUser: AuthUser | null = null
// Logout en curso: no se vuelve a "autenticar" al usuario que sale.
let loggingOut = false

/**
 * Usuario confirmado por el servidor: pasa a ser el dueño de lo persistido
 * (si cambió, el cache del anterior se vacía y se restaura el suyo) y se
 * guarda su `session` con `lastOnlineAuthAt = ahora`.
 */
async function onOnlineAuthenticated(queryClient: QueryClient, user: AuthUser) {
  if (lastAuthedUser === user || loggingOut) return
  lastAuthedUser = user
  try {
    await activatePersistUser(queryClient, user.id, { keep: [USER_QUERY_KEY] })
    // Un logout que arrancó mientras tanto manda: no se desbloquea ni se
    // vuelve a registrar al usuario que está saliendo.
    if (loggingOut) return
    // Con red el servidor ya confirmó quién es: si la app instalada quedó
    // bloqueada por un "Cerrar sesión" anterior, se desbloquea.
    await unlockDeviceSession(user.id).catch(() => undefined)
    await setOutboxUser(user.id)
    const pendientes = outboxStore.getSummary().total
    if (pendientes > 0) toast.info(`Tienes ${pendientes} cambios guardados de una sesión anterior. Sincronizando…`)
    void syncNow()
    // Estado del equipo (revocado / borrado remoto) y alta si es personal.
    void reconcileDevice(user.id)
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
export async function enterOfflineSession(
  queryClient: QueryClient,
  { unlocked = false }: { unlocked?: boolean } = {},
): Promise<AuthUser | null> {
  await initOfflinePersistence()
  const session = await getUsableOfflineSession()
  if (!session) return null
  // Tras "Cerrar sesión" en la app instalada (D-12) no se entra solo: hay que
  // desbloquear en el login (contraseña o PIN), que vuelve a llamar con
  // `unlocked: true`.
  if (!unlocked && (await isDeviceSessionLocked(session.sub))) return null
  if (unlocked) await unlockDeviceSession(session.sub).catch(() => undefined)
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
  await setOutboxUser(session.sub).catch(() => undefined)
  return user
}

/** Nombre a ofrecer en "Continuar sin conexión como {nombre}", si se puede. */
export async function getOfflineContinueName(): Promise<string | null> {
  return (await getOfflineContinueInfo())?.name ?? null
}

export interface OfflineContinueInfo {
  sub: string
  name: string
  /** Se cerró sesión en la app instalada: hay que desbloquear para entrar. */
  locked: boolean
  /** Tiene PIN: al entrar lo pide la bóveda (`VaultGate`). */
  hasPin: boolean
  /** Hay credencial local para verificar la contraseña sin red. */
  hasCredential: boolean
}

/** Sesión guardada del último usuario del equipo y cómo se puede reabrir sin red. */
export async function getOfflineContinueInfo(): Promise<OfflineContinueInfo | null> {
  await initOfflinePersistence()
  const session = await getUsableOfflineSession()
  if (!session) return null
  const [locked, hasPin, hasCredential] = await Promise.all([
    isDeviceSessionLocked(session.sub),
    hasVault(session.sub),
    hasLocalCredential(session.sub),
  ])
  return { sub: session.sub, name: session.name, locked, hasPin, hasCredential }
}

/**
 * Desbloqueo SIN red de la app instalada tras cerrar sesión: el correo tiene
 * que ser el del último usuario y la contraseña la última que usó con red en
 * este equipo (`local-credential.ts`). Con PIN, lo pide luego la bóveda.
 */
export async function unlockOfflineSession(
  queryClient: QueryClient,
  { email, password }: { email: string; password: string },
): Promise<AuthUser | null> {
  const info = await getOfflineContinueInfo()
  if (!info || info.sub.toLowerCase() !== email.trim().toLowerCase()) return null
  if (info.hasCredential) {
    if (!(await verifyLocalCredential(info.sub, password))) return null
  } else if (!info.hasPin) {
    // Sin credencial local ni PIN no hay cómo comprobar quién es sin red.
    return null
  }
  return enterOfflineSession(queryClient, { unlocked: true })
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

/**
 * La outbox asegura un token antes de enviar (§6.2). Sin token (sesión
 * offline) o forzado tras un 401: refresh. 401/403 → "unauth" (se pausa y
 * el banner pide iniciar sesión); red → "network".
 */
async function ensureOutboxAuth(force?: boolean): Promise<"ok" | "unauth" | "network"> {
  // Equipo registrado: el lote sale con un access token del equipo (`did`), y
  // el canje es además el chequeo de revocación de cada sincronización.
  try {
    if (await ensureDeviceAccessToken(getOutboxUser(), force)) return "ok"
  } catch {
    // Red: sigue el camino de siempre (que también la detecta).
  }
  if (hasAuthToken() && !force) return "ok"
  try {
    return (await getUser()) ? "ok" : "unauth"
  } catch {
    return "network"
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
  configureOutbox({ queryClient, ensureAuth: ensureOutboxAuth, onIdle: notifySyncIdle })
  // No se actualiza el SW mientras se sincroniza (§7.10).
  setSyncInProgressProbe(isSyncing)
  startOutbox()
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
        // App instalada bloqueada tras cerrar sesión (D-12): al login, que
        // ofrece desbloquear sin red con la contraseña o el PIN.
        if ((await getOfflineContinueInfo())?.locked) return false
        if (exhausted) throw error
      }
      await wait(SESSION_RETRY_DELAYS_MS[attempt])
    }
  }
}
