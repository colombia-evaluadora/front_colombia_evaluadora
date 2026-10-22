import Axios, { type InternalAxiosRequestConfig } from "axios"
import { toast } from "sonner"

import { env } from "@/config/env"
import { paths } from "@/config/paths"
import { isNetworkError, NetworkSessionError } from "@/lib/network-error"
import { APP_VERSION, noteMinClientVersion } from "@/lib/app-version"
import { noteServerTime } from "@/lib/offline/clock"
import { noteServerMessage } from "@/lib/server-message"
import { connectivityStore, isOfflineNow } from "@/lib/offline/connectivity"
import {
  conditionalErrorInterceptor,
  conditionalResponseInterceptor,
  installConditionalRequests,
} from "@/lib/offline/conditional-requests"
import {
  NETWORK_ERROR_MESSAGE,
  OFFLINE_NO_DATA_FULL_MESSAGE,
  OFFLINE_SESSION_MESSAGE,
  OFFLINE_WRITE_MESSAGE,
} from "@/lib/offline/offline-messages"
import { assertNoTmpIds } from "@/lib/offline/outbox/tmp-id"
import { queryClient } from "@/lib/query-client"
import {
  publishRefreshedToken,
  takeRecentSharedToken,
  withCrossTabLock,
} from "@/lib/auth-refresh-coordination"
import type { AuthResponse } from "@/types/api"

export { isNetworkError, NetworkSessionError } from "@/lib/network-error"

declare module "axios" {
  export interface AxiosRequestConfig {
    // Marca una lectura por POST (`api.query`, `evalCol.postRows`): no lleva
    // `Idempotency-Key` porque no muta nada.
    readOnly?: boolean
    // Request enviada por la outbox (Fase 2 offline): sin toast global y sin
    // redirigir a /login ante un 401 — la cola se pausa, conserva las ops y el
    // banner pide iniciar sesión (`lib/offline/outbox/processor.ts`).
    background?: boolean
    // Reintento único tras renovar el access token por un 401/403: si vuelve
    // a fallar con el token recién emitido, el error es de verdad y no se
    // pide otro refresh (ver `refreshAccessToken`).
    _authRetried?: boolean
    // Lectura de "Preparar sin conexión" (la marca `setPrepareRequestScope`).
    // Va además con `background`: sin toasts ni redirecciones; un 401 solo
    // intenta renovar el token (single-flight) y, si no se puede, el motor
    // de preparación se detiene ("detenida: sesión").
    prepare?: boolean
  }
  export interface AxiosInstance {
    // El response interceptor de abajo desenvuelve `response.data` en runtime
    // para TODAS las llamadas a `api.*` — pero `get`/`post`/`put`/`patch`/
    // `delete` heredados de `Axios` siguen tipados con su default
    // (`R = AxiosResponse<T>`), así que sin esto cada call site tipaba mal
    // (`AxiosResponse<T>` en vez de `T`) aunque funcionara bien en runtime.
    // Se pisan acá con el mismo truco que ya usaba `query` (declararlas
    // directo en `AxiosInstance` gana por sobre las heredadas de `Axios` en
    // la resolución de overloads).
    get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T>
    delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T>
    post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>
    put<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>
    patch<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>
    // Lecturas con body (filtros anidados, sorts compuestos) que no entran
    // cómodo en query params. Va por POST; el nombre `query` marca que la
    // intención es leer, no mutar. Corre por el response interceptor que ya
    // desenvuelve `response.data`, así que la promesa resuelve a `T` directo.
    query<T = unknown>(url: string, data?: unknown): Promise<T>
  }
}

/**
 * El access token vive SOLO en memoria — nunca en `localStorage`.
 *
 * Guardarlo en storage lo deja al alcance de cualquier script inyectado: un
 * XSS se lleva la sesión entera y no hay forma de revocarla desde el cliente.
 * El backend ya resuelve la persistencia bien: al hacer login emite la cookie
 * `sso_refresh` con `HttpOnly` + `SameSite=Strict` + `Secure` (ver
 * `JsonLoginFilter` en auth-center, cuyo propio comentario dice que es para no
 * tener el refresh en "JS-accessible storage"). Duplicar eso en
 * `localStorage` no agregaba nada y anulaba la defensa.
 *
 * Consecuencia: al recargar la página el token en memoria se pierde, y la
 * sesión se restaura con `POST /auth/refresh`, que se autentica con la cookie
 * —no con el Bearer—. Eso es exactamente lo que ya hace `getUser()` en
 * `lib/auth.ts`, así que "Mantener sesión iniciada" sigue funcionando: lo que
 * decide cuánto dura es el `Max-Age` de la cookie, no el navegador del
 * usuario.
 */
let authToken: string | null = null

/** ¿Hay access token en memoria? (la outbox lo asegura antes de enviar). */
export function hasAuthToken(): boolean {
  return authToken != null
}

export function setAuthToken(token: string | null) {
  // Mientras se cierra la sesión nadie la vuelve a abrir (un `getUser` del
  // tiempo real o de la outbox que llegara justo en ese momento).
  if (token != null && logoutInProgress) return
  authToken = token
  if (token != null) sessionEnded = null
  // Sin sesión se olvida lo aprendido de la anterior: otro usuario puede
  // tener permisos distintos sobre los mismos endpoints.
  if (token == null) {
    forbiddenEndpoints.clear()
    lastRefresh = null
  }
}

/**
 * Para clientes que no pasan por axios (el streaming SSE del asistente usa
 * `fetch`: axios en el navegador no expone el cuerpo como stream).
 */
export function getAuthToken(): string | null {
  return authToken
}

// ---- Refresh de sesión: uno solo a la vez ------------------------------------

/**
 * auth-center rota el refresh token en cada `POST /auth/refresh` y, si ve la
 * misma cookie dos veces, responde `401 refresh_token_reuse` y REVOCA la
 * sesión entera. Con la revalidación de 403 de #565 cada request rechazada
 * pedía su propio refresh: tres 403 en paralelo (el preparar sin conexión de
 * un acudiente, que no tiene planeador) eran tres refresh con la misma cookie
 * → 200, 401, 401 → a /login, y así cada ~6 s hasta que el servidor mataba la
 * sesión (QA testv2, acudiente).
 *
 * Por eso TODO refresh por cookie pasa por acá: la revalidación de 401/403,
 * `getUser()` (guard, tiempo real, asistente, outbox). Comparten una sola
 * promesa en vuelo, y entre pestañas un lock de Web Locks + el token
 * difundido por `BroadcastChannel` (`auth-refresh-coordination.ts`).
 */
let refreshInFlight: Promise<string> | null = null
let lastRefresh: { token: string; at: number } | null = null

/**
 * Un 403 con un token emitido hace menos que esto no es "sesión vieja": la
 * sesión se acaba de validar, así que es "no tenés permiso" y no se vuelve a
 * pedir refresh por él.
 */
export const REFRESH_COOLDOWN_MS = 30_000
/** Edad máxima del token que otra pestaña acaba de rotar para reusarlo. */
const SHARED_TOKEN_MAX_AGE_MS = 5_000

/**
 * Endpoints (método + path sin query) que respondieron 403 con un token
 * recién validado: el 403 es real. No se revalida más por ellos mientras
 * dure la sesión (si no, un 403 legítimo que se repite cada pocos segundos
 * rotaría la cookie cada pocos segundos).
 */
const forbiddenEndpoints = new Set<string>()

function endpointKey(config: InternalAxiosRequestConfig | undefined): string {
  const method = (config?.method ?? "get").toUpperCase()
  const path = (config?.url ?? "").split("?", 1)[0]
  return `${method} ${path}`
}

function bearerOf(config: InternalAxiosRequestConfig | undefined): string | null {
  const headers = config?.headers as { get?: (name: string) => unknown; Authorization?: unknown } | undefined
  const value = headers?.get?.("Authorization") ?? headers?.Authorization
  return typeof value === "string" && value.startsWith("Bearer ") ? value.slice(7) : null
}

/**
 * Pide un access token nuevo con la cookie `sso_refresh` y lo deja en
 * memoria. Single-flight: los llamadores concurrentes reciben la misma
 * promesa (y, entre pestañas, se serializan). Los errores se propagan tal
 * cual (401 = sin sesión; red = no se sabe).
 */
export function refreshAccessToken(): Promise<string> {
  if (logoutInProgress) return Promise.reject(new Axios.CanceledError("Se está cerrando la sesión"))
  if (!refreshInFlight) {
    refreshInFlight = withCrossTabLock("ceval:auth-refresh", async () => {
      // Otra pestaña rotó mientras esta esperaba el lock: su token sirve y
      // rotar de nuevo enseguida no aporta nada.
      const shared = takeRecentSharedToken(SHARED_TOKEN_MAX_AGE_MS)
      if (shared) return shared
      const { token }: AuthResponse = await api.post("/auth/refresh")
      publishRefreshedToken(token)
      return token
    })
      .then((token) => {
        setAuthToken(token)
        lastRefresh = { token, at: Date.now() }
        return token
      })
      .finally(() => {
        refreshInFlight = null
      })
  }
  return refreshInFlight
}

// ---- Fin de sesión: nada más sale con el token viejo --------------------------

/**
 * Al cerrar sesión (o vencerse) los procesos de fondo seguían disparando
 * requests con el token viejo: "Preparar" seguía con sus tareas y cada una
 * respondía 401 —decenas de 401 en la red y varios "Tu sesión no es válida"
 * apilados (QA). Ahora:
 * - `endSession` aborta TODAS las requests en vuelo (cada una lleva la señal
 *   de la sesión, `sessionRequestInterceptor`) y avisa a quien escuche
 *   (`onSessionEnd`: el motor de preparación se detiene);
 * - mientras la sesión está terminada, toda request que no sea pública/de
 *   login se cancela antes de salir (`CanceledError`, sin toast);
 * - la sesión se reabre sola con el próximo token (login, refresh, equipo).
 */
export type SessionEndReason = "logout" | "expired"

let sessionEnded: SessionEndReason | null = null
let logoutInProgress = false
let sessionController = new AbortController()
const sessionEndListeners = new Set<(reason: SessionEndReason) => void>()

/** Endpoints que sí pueden salir con la sesión terminada (login, refresh, logout). */
function allowedWithoutSession(url: string): boolean {
  return (
    url.startsWith("/auth/logout") ||
    // La baja de la suscripción Web Push va justo antes del logout, con el
    // token todavía válido (ver `logout` en `auth.ts`).
    (logoutInProgress && url.startsWith("/notificaciones/push/suscripciones")) ||
    UNAUTHENTICATED_ENDPOINTS.some((endpoint) => url.startsWith(endpoint)) ||
    PUBLIC_ENDPOINTS.some((endpoint) => url.startsWith(endpoint))
  )
}

export function isSessionEnded(): boolean {
  return sessionEnded != null
}

export function onSessionEnd(listener: (reason: SessionEndReason) => void): () => void {
  sessionEndListeners.add(listener)
  return () => {
    sessionEndListeners.delete(listener)
  }
}

export function endSession(reason: SessionEndReason): void {
  if (sessionEnded != null) return
  sessionEnded = reason
  const controller = sessionController
  sessionController = new AbortController()
  controller.abort()
  for (const listener of [...sessionEndListeners]) {
    try {
      listener(reason)
    } catch (error) {
      console.warn("[auth] onSessionEnd", error)
    }
  }
}

/**
 * Logout: corta lo de fondo ANTES de `POST /auth/logout` (que sí sale) y no
 * deja que nada reabra la sesión hasta `finishLogout`.
 */
export function beginLogout(): void {
  logoutInProgress = true
  endSession("logout")
}

/** Fin del logout. `failed`: el servidor lo rechazó y la sesión sigue viva. */
export function finishLogout({ failed = false }: { failed?: boolean } = {}): void {
  logoutInProgress = false
  if (failed && authToken != null) sessionEnded = null
}

/**
 * Señal de la sesión en cada request (combinada con la propia, si trae) y
 * bloqueo de lo que intente salir con la sesión terminada.
 */
export function sessionRequestInterceptor(config: InternalAxiosRequestConfig) {
  if (sessionEnded != null && !allowedWithoutSession(config.url ?? "")) {
    throw new Axios.CanceledError("La sesión terminó", undefined, config)
  }
  const sessionSignal = sessionController.signal
  const own = config.signal as AbortSignal | undefined
  if (!own) config.signal = sessionSignal
  else if (typeof AbortSignal.any === "function") config.signal = AbortSignal.any([own, sessionSignal])
  return config
}

// ---- Lecturas de "Preparar sin conexión" -------------------------------------

/**
 * Las tareas de Preparar usan las mismas funciones de lectura que las
 * pantallas (la regla de oro de `prepare-tasks.ts`), así que no se les puede
 * pasar un flag por parámetro. El motor prende este alcance mientras corre
 * (como la grabación de `conditional-requests`) y las LECTURAS que salen en
 * ese lapso van con `background` + `prepare`: sin toasts ni redirecciones.
 * Una lectura de una pantalla abierta al mismo tiempo también queda marcada:
 * pierde el toast de error, pero la pantalla ya muestra su estado de error.
 * Las escrituras nunca se marcan (su error sí tiene que verse).
 */
let prepareScopeDepth = 0

export function setPrepareRequestScope(active: boolean): void {
  prepareScopeDepth = Math.max(0, prepareScopeDepth + (active ? 1 : -1))
}

function prepareScopeInterceptor(config: InternalAxiosRequestConfig) {
  if (prepareScopeDepth > 0 && config.background == null && isReadRequest(config)) {
    config.background = true
    config.prepare = true
  }
  return config
}

/** Solo tests. */
export function __resetAuthRefreshForTests() {
  sessionEnded = null
  logoutInProgress = false
  sessionController = new AbortController()
  prepareScopeDepth = 0
  refreshInFlight = null
  lastRefresh = null
  forbiddenEndpoints.clear()
  isHandlingExpiredSession = false
}

/**
 * Endpoints que NO deben llevar `Authorization`.
 *
 * El gateway valida el Bearer en un filtro, antes de mirar qué endpoint es: si
 * el token está vencido responde 401 `invalid_token` y nunca llega a procesar
 * la petición. Mandarle un token viejo a `/auth/login` volvía el login
 * imposible —"JWT expired ... ago"— mientras ese token viejo siguiera en
 * memoria. Loguearse es justamente lo que se hace cuando NO se tiene una
 * credencial válida; el header sobra.
 *
 * `/auth/refresh` no está acá: en el mock es el Bearer lo que identifica al
 * usuario (no hay cookie que mandar).
 */
const UNAUTHENTICATED_ENDPOINTS = [
  "/auth/login",
  "/sso-admin/forgotPassword",
  "/sso-admin/forgotUsername",
  "/sso-admin/restorePassword",
  "/sso-admin/resetTokenStatus",
  // Verificación pública de boletines (QR): la página usa fetch directo, pero
  // si algo la llamara por axios no debe llevar Bearer.
  "/reportes/public/",
  // Sonda de conectividad (heartbeat de `lib/offline/connectivity`).
  "/eval-col/health",
  // Credencial del equipo (D-3): la autenticación es el token del equipo en
  // el body; un Bearer vencido haría que el gateway rechazara el canje.
  "/auth/device/refresh",
  "/auth/device/wipe-ack",
]

/**
 * Se exporta para `report-client`: los reportes necesitan una instancia de
 * axios propia —la de `api` desenvuelve `response.data` y ahi se pierden las
 * cabeceras que traen el nombre del archivo y el conteo de filas—, pero tiene
 * que mandar el mismo Bearer que el resto de la app.
 */
export function authRequestInterceptor(config: InternalAxiosRequestConfig) {
  if (config.headers) {
    config.headers.Accept = "application/json"
    const url = config.url ?? ""
    const sendsCredentials = !UNAUTHENTICATED_ENDPOINTS.some((endpoint) =>
      url.startsWith(endpoint),
    )
    if (authToken && sendsCredentials) {
      config.headers.Authorization = `Bearer ${authToken}`
    }
  }
  return config
}

let isHandlingExpiredSession = false

/** Id fijo del toast de sesión inválida: sonner lo reemplaza en vez de apilarlo. */
export const SESSION_TOAST_ID = "sesion-invalida"

// Endpoints que se llaman *sin* sesión: los de recuperación de contraseña /
// usuario y el chequeo de sesión. Un 401 acá no significa "se venció tu
// sesión" (no había ninguna), sino "este enlace no sirve" — y cada pantalla
// ya tiene su propio estado para eso. Sin esta lista, abrir
// /restore-password?token=... con un token que el backend rechaza terminaba
// en un redirect duro a /login.
const PUBLIC_ENDPOINTS = [
  "/auth/refresh",
  // Un 401 del canje del equipo es "revocado / vencido", no sesión vencida.
  "/auth/device/refresh",
  "/auth/device/wipe-ack",
  // Verificación pública de boletines (QR): un 401 no es sesión vencida.
  "/reportes/public/",
  "/sso-admin/resetTokenStatus",
  "/sso-admin/restorePassword",
  "/sso-admin/forgotPassword",
  "/sso-admin/forgotUsername",
]

// Sondas: se llaman para *averiguar* un estado y una respuesta de error es
// una posibilidad normal, no una falla que el usuario disparó — así que no
// tostean; cada llamador decide qué hacer con el catch. El resto de los
// públicos (restore/forgot) sí avisa: ahí el error es el resultado de una
// acción que el usuario disparó.
//
// `/coverage/reservations/catalogs` entra acá con el mismo criterio:
// institutions/groups todavía no tienen endpoint real (ver `use-
// reservation-catalogs-query.ts`), así que un 404 contra backend real sin
// mocks es esperado mientras tanto — el query ya degrada a lista vacía, no
// hace falta alarmar con un toast en cada carga de Matrícula/Reserva.
// `/eval-col/planeador/actividad/calificaciones` entra acá con el mismo
// criterio que `/coverage/reservations/catalogs`: el form de alta de una
// actividad (`crear-actividad-page.tsx`) monta `EditarActividadForm` con un
// id que todavía no existe en el mock, así que este query siempre pega un
// 404 la primera vez — ya degrada a lista vacía (`estudiantes = []`), no
// hace falta alarmar con un toast por algo esperado.
const PROBE_ENDPOINTS = [
  "/auth/refresh",
  "/auth/device/refresh",
  "/auth/device/wipe-ack",
  // Estado del equipo (revocado / borrado remoto): lo resuelve device-session.
  "/auth/devices/me",
  "/sso-admin/resetTokenStatus",
  "/coverage/reservations/catalogs",
  "/eval-col/planeador/actividad/calificaciones",
  // Estado de cuenta de los funcionarios (tabla de funcionarios): si falla,
  // solo se deshabilita el botón de reenviar activación.
  "/auth/register/cval/funcionario/estado-cuenta",
  // Heartbeat de conectividad: falla justamente cuando no hay red.
  "/eval-col/health",
  // Suscripciones Web Push: se dan de baja en segundo plano (logout, cambio
  // de usuario, `pushsubscriptionchange`) y `PushToggle` muestra sus propios
  // errores; un fallo acá no debe sacar un toast ni cerrar la sesión.
  "/notificaciones/push/suscripciones",
]

// Las pantallas con `NoticeProvider` muestran sus propios avisos (banner
// inline en el diálogo o `notify()`/NoticeOutlet de página) para cada error —
// el toast global duplicaba el mismo mensaje. En vez de mantener una lista de
// endpoints (se desactualiza apenas cambia una ruta), `NoticeProvider`
// prende este flag al montarse y lo apaga cuando se desmonta el último
// provider activo (conteo de referencias en `components/notice/notice-context.tsx`).
let suppressGlobalErrorToast = false

export function setSuppressGlobalErrorToast(value: boolean) {
  suppressGlobalErrorToast = value
}

// Los errores de constraint (`RAISE EXCEPTION` en las funciones PL/pgSQL)
// llegan con todo el contexto crudo de Postgres, p.ej.:
//   "Conflict: ERROR: No se puede eliminar el grado 3725: existen horarios
//   configurados\nWhere: PL/pgSQL function academico_test.fn_grado_soft_delete
//   (bigint,bigint) line 20 at RAISE"
// Al usuario solo le sirve la oración real ("No se puede eliminar..."); el
// resto (prefijo HTTP, "ERROR:", el "Where:" con la función/línea) es ruido
// de implementación. Nos quedamos con la primera línea y le sacamos el
// prefijo tipo "Conflict: ERROR: " si vino.
/**
 * Violaciones de UNIQUE traducidas a algo accionable.
 *
 * Un `RAISE EXCEPTION` de una función PL/pgSQL trae un texto escrito para el
 * usuario, así que alcanza con recortarlo. Un choque de constraint, en cambio,
 * llega crudo del motor —"duplicate key value violates unique constraint
 * «u_testablecimiento_1»"— y no le dice a nadie QUÉ campo repitió. Peor: el
 * nombre de la constraint no se parece al del campo en pantalla
 * (`u_testablecimiento_1` es `UNIQUE (codigo)`, que en el formulario es el
 * código DANE), así que quien lo lee suele buscar el problema donde no está.
 *
 * Solo las que un usuario puede provocar desde la app; el resto cae al mensaje
 * genérico de abajo.
 */
const CONSTRAINT_MESSAGES: Record<string, string> = {
  u_testablecimiento_1: "Ya existe un establecimiento con ese código DANE.",
  u_trol_1: "Ya existe un rol con ese nombre.",
  u_tmenu_1: "Ya existe un menú con ese nombre.",
  u_trol_menu_1: "Ese menú ya está asignado al rol.",
  u_tlista_valor_1: "Ya existe un registro con ese valor.",
}

/**
 * Fugas de la capa de validación de Java.
 *
 * Cuando un campo no pasa una anotación del backend (@Email, @Size, ...)
 * la excepción llega redactada para un log, no para una pantalla:
 *   "Bean validation error: Validation failed for argument [0] ... with 1
 *   error(s): [Field error in object 'personaDTO' on field 'email'; codes
 *   [...]; default message [debe ser una dirección de correo válida]]"
 *
 * Adentro suele venir una frase utilizable —la de `default message [...]`,
 * que es el mensaje de la anotación—, así que se rescata esa y se descarta
 * el envoltorio. Si no la hay, al menos se cambia el volcado por una frase
 * que diga qué hacer.
 *
 * Esto es una red, no la solución: que el usuario llegue a ver un error de
 * bean validation significa que el formulario dejó pasar algo que el
 * backend rechaza, y eso se corrige validando el campo en pantalla (ver
 * `establishment/shared/person-field-rules.ts`). La red existe porque las
 * dos listas de reglas nunca van a coincidir del todo.
 */
const JAVA_VALIDATION =
  /bean validation|validation failed for argument|constraintviolation|(?:javax|jakarta)[.]validation|org[.]springframework/i

export function cleanErrorMessage(message: string): string {
  const constraint = message.match(/unique constraint "([^"]+)"/i)?.[1]
  if (constraint) {
    return (
      CONSTRAINT_MESSAGES[constraint.toLowerCase()] ??
      "Ya existe un registro con esos datos: hay un campo que no puede repetirse."
    )
  }

  if (JAVA_VALIDATION.test(message)) {
    // El último `default message [...]`: cuando la excepción anida varios
    // errores, el más interno es el de la anotación que realmente falló.
    const anotaciones = [...message.matchAll(/default message \[([^\]]+)\]/gi)]
    const frase = anotaciones.at(-1)?.[1]?.trim()

    return frase && frase.length > 3
      ? frase.charAt(0).toUpperCase() + frase.slice(1)
      : "Hay un campo con un formato no válido. Revisa los datos del formulario."
  }

  const firstLine = message.split(/\r?\n/)[0]?.trim() ?? message
  return firstLine.replace(/^[A-Za-z ]+:\s*ERROR:\s*/i, "").trim() || firstLine
}

// 20 s: sin timeout, una request colgada (portal cautivo, 2G) dejaba la UI
// en "Guardando…" para siempre. Se puede pisar por llamada (`{ timeout }`);
// las multipart de `lib/files.ts` usan 120 s.
export const API_TIMEOUT_MS = 20_000

export const api = Axios.create({
  baseURL: env.API_URL,
  timeout: API_TIMEOUT_MS,
})

const MUTATION_METHODS = new Set(["post", "put", "patch", "delete"])

/**
 * `Idempotency-Key` (UUID v4) en cada mutación, para que el backend pueda
 * descartar un reenvío de la misma operación (reintento tras timeout, cola
 * offline). Si la config ya trae una clave —la misma operación reintentada—
 * se conserva. Las lecturas por POST (`readOnly`) no la llevan. Va al mismo
 * origen (`/api` lo proxea el Worker/Vite), así que no hay preflight CORS.
 */
export function idempotencyKeyInterceptor(config: InternalAxiosRequestConfig) {
  const method = (config.method ?? "get").toLowerCase()
  if (config.headers && MUTATION_METHODS.has(method) && !config.readOnly) {
    if (!config.headers["Idempotency-Key"]) {
      config.headers["Idempotency-Key"] = crypto.randomUUID()
    }
  }
  return config
}

function clientVersionInterceptor(config: InternalAxiosRequestConfig) {
  if (config.headers) config.headers["X-Client-Version"] = APP_VERSION
  return config
}

api.interceptors.request.use(authRequestInterceptor)
api.interceptors.request.use(idempotencyKeyInterceptor)
api.interceptors.request.use(clientVersionInterceptor)
api.interceptors.request.use(prepareScopeInterceptor)
// Registrado al final = corre PRIMERO (axios aplica los de request en orden
// inverso): una request con la sesión terminada no llega a armarse.
api.interceptors.request.use(sessionRequestInterceptor)
// Preparar incremental: graba los ETag de las lecturas y reusa la respuesta
// 200 de un sondeo condicional (`lib/offline/conditional-requests.ts`). El
// cliente de sondeo lleva el mismo Bearer y versión que `api`.
installConditionalRequests(api, [sessionRequestInterceptor, authRequestInterceptor, clientVersionInterceptor])
// Fase 3: un id temporal `tmp:<uuid>` de una saga offline nunca llega al
// backend; si se escapara (bug de remapeo) la request falla acá, antes de salir.
api.interceptors.request.use((config) => {
  assertNoTmpIds(config)
  return config
})
// Antes del que desenvuelve: necesita los headers (`ETag`) y la config.
api.interceptors.response.use(conditionalResponseInterceptor, conditionalErrorInterceptor)
api.interceptors.response.use(
  // El response interceptor desenvuelve `response.data` — todas las llamadas
  // a `api.*` (incluyendo `api.query`) resuelven con el body directo.
  (response) => {
    connectivityStore.reportSuccess()
    // BE-7: hora del servidor para corregir un reloj del equipo mal puesto.
    noteServerTime(response.headers?.["x-server-time"] as string | undefined)
    noteMinClientVersion(response.headers?.["x-min-client-version"] as string | undefined)
    // Mensaje de éxito del servidor (etiqueta de la escritura, sso V590): lo
    // usa notify() en vez del texto local. Las lecturas no lo traen.
    if (!isReadRequest(response.config)) {
      noteServerMessage(response.headers?.["x-mensaje"] as string | undefined)
    }
    return response.data
  },
  async (error) => {
    // Error de red (sin respuesta, timeout, 502/503/504/52x): no es un error
    // de negocio ni una sesión vencida. Nunca cierra sesión ni limpia cache y
    // no tostea —el único reflejo es el banner de conectividad—.
    if (Axios.isCancel(error)) return Promise.reject(error)
    if (isNetworkError(error)) {
      // 502/503/504/52x: el gateway respondió, la red del usuario está bien.
      const status = error.response?.status
      connectivityStore.reportNetworkFailure(status != null ? "server" : "network")
      return Promise.reject(error)
    }

    // /auth/refresh se llama para *comprobar* si hay sesión (no hay /auth/me
    // en el backend real) — un 401 ahí es una respuesta normal ("no
    // autenticado"), no un fallo que deba redirigir. getUser() en lib/auth.ts
    // ya lo captura y devuelve null. Lo mismo vale para los endpoints de
    // recuperación, que corren sin sesión.
    // La outbox clasifica sus propios errores (§6.4): nada de toasts,
    // revalidaciones ni redirecciones por cada op que falla.
    if (error.config?.background) {
      // Una lectura de Preparar con el access token vencido: se renueva una
      // vez (el mismo refresh single-flight de todos) y se reintenta. Si no
      // hay sesión, el motor se detiene con el 401; nunca toast ni redirect.
      const cfg = error.config as InternalAxiosRequestConfig
      if (cfg.prepare && !cfg._authRetried && error.response?.status === 401 && sessionEnded == null) {
        try {
          await refreshAccessToken()
          return api.request({ ...cfg, _authRetried: true })
        } catch {
          return Promise.reject(error)
        }
      }
      return Promise.reject(error)
    }

    const requestUrl = error.config?.url ?? ""
    const isPublicEndpoint = PUBLIC_ENDPOINTS.some((endpoint) => requestUrl.startsWith(endpoint))
    const isUnauthorized = error.response?.status === 401

    // Sin guard, un 401 en /login mismo (todavía no existe esa página)
    // reintentaría redirigir a /login en loop infinito.
    const onLoginPage = window.location.pathname === paths.auth.login.path
    // Un probe es una consulta opcional (p. ej. el estado de cuenta de la
    // tabla de funcionarios): si falla, la pantalla degrada sola. Nunca debe
    // cerrar la sesión ni revalidarla — un 401 de un probe que falla siempre
    // mandaba a /login, el login veía la sesión viva y volvía a la pantalla,
    // que repetía el probe: la página se recargaba sola en bucle.
    const isProbe = PROBE_ENDPOINTS.some((endpoint) => requestUrl.startsWith(endpoint))
    let isExpiredSession = isUnauthorized && !onLoginPage && !isPublicEndpoint && !isProbe

    // El backend dice explícitamente que el token no sirve (vencido, mal
    // firmado, revocado). Hay que soltarlo SIEMPRE, incluso en la pantalla de
    // login y en los endpoints públicos: son justo los casos que el guard de
    // arriba excluye del manejo de "sesión vencida", y por eso, sin esto, un
    // token vencido en memoria podía dejar el login trabado en bucle —cada
    // intento volvía a mandarlo y el gateway volvía a rechazarlo—.
    if (isUnauthorized && error.response?.data?.error === "invalid_token") {
      setAuthToken(null)
    }

    // Un 403 fuera de login/públicos es ambiguo: puede ser "de verdad no
    // tenés permiso para esto" o "tu sesión ya no es la que el backend
    // reconoce" (p. ej. alguien te cambió el correo desde Funcionarios
    // mientras tenías la sesión abierta en otra pestaña — el bug de QA que
    // dio origen a esto). El backend no distingue los dos casos con el
    // status: acá se revalida contra /auth/refresh antes de decidir cuál
    // toast mostrar, en vez de dejar que la persona vea varios "no tenés
    // acceso" sueltos hasta que ALGO más adelante dispare el cierre real.
    // Nunca se repite para /auth/refresh en sí (está en PUBLIC_ENDPOINTS,
    // nunca llega hasta acá) ni mientras ya se está resolviendo una sesión
    // vencida (evita pedir el refresh una vez por cada request que venía
    // en vuelo).
    //
    // El refresh es UNO solo para toda la app (`refreshAccessToken`) y nunca
    // se repite sin necesidad: auth-center revoca la sesión si ve la misma
    // cookie dos veces. Antes de pedirlo:
    // - si la request salió con un token que ya no es el actual (otro
    //   refresh terminó mientras viajaba), se reintenta con el actual;
    // - si el token actual se emitió hace menos de `REFRESH_COOLDOWN_MS`, o el
    //   endpoint ya respondió 403 con un token fresco, el 403 es real;
    // - si ya se reintentó con un token nuevo y sigue en 403, también.
    // Lo mismo vale para un 401 (token vencido): se renueva una vez y se
    // reintenta; si el refresh dice que no hay sesión, recién ahí se cierra.
    const isForbidden = error.response?.status === 403
    const config = error.config as InternalAxiosRequestConfig | undefined
    const canRevalidate =
      (isForbidden || isExpiredSession) && config != null && !onLoginPage && !isPublicEndpoint && !isProbe
    if (canRevalidate && !isHandlingExpiredSession) {
      const endpoint = endpointKey(config)
      if (config._authRetried) {
        if (isForbidden) forbiddenEndpoints.add(endpoint)
      } else if (!(isForbidden && forbiddenEndpoints.has(endpoint))) {
        const sentToken = bearerOf(config)
        const tokenChanged = authToken != null && sentToken !== authToken
        const justRefreshed =
          lastRefresh != null && lastRefresh.token === authToken && Date.now() - lastRefresh.at < REFRESH_COOLDOWN_MS
        let retryWith: string | null = tokenChanged ? authToken : null
        if (!retryWith && isForbidden && justRefreshed) {
          forbiddenEndpoints.add(endpoint)
        } else if (!retryWith) {
          try {
            retryWith = await refreshAccessToken()
          } catch (refreshError) {
            // Si el refresh falló por red no sabemos si la sesión sigue viva:
            // se rechaza la request original conservando sesión y cache. El
            // interceptor ya reportó `degraded` al procesar el refresh fallido.
            // Un 429 o un 5xx tampoco dicen que la sesión murió.
            const refreshStatus = (refreshError as { response?: { status?: number } })?.response?.status
            if (isNetworkError(refreshError) || refreshStatus === 429 || (refreshStatus ?? 0) >= 500) {
              return Promise.reject(error)
            }
            isExpiredSession = true
          }
        }
        if (retryWith) return api.request({ ...config, _authRetried: true })
      }
    }

    // Una sesión caída hace fallar *todas* las queries en vuelo a la vez.
    // Sin este latch salía un toast y un `window.location.href` por cada
    // una. El latch no se resetea: la redirección recarga la página entera
    // y con ella este módulo.
    if (isExpiredSession && isHandlingExpiredSession) {
      return Promise.reject(error)
    }

    if (!isProbe && !suppressGlobalErrorToast && !isExpiredSession) {
      // "Tu sesión no es válida" una sola vez: con el mismo `id` sonner
      // reemplaza el toast en vez de apilar uno por request (p. ej. en /login,
      // donde un 401 no dispara el cierre de sesión).
      const status = error.response?.status
      if (status === 401) toast.error(getErrorMessage(error), { id: SESSION_TOAST_ID })
      else toast.error(getErrorMessage(error))
    }

    if (isExpiredSession) {
      isHandlingExpiredSession = true
      endSession("expired")
      setAuthToken(null)
      queryClient.clear()
      const redirectTo = window.location.pathname
      window.location.href = paths.auth.login.getHref(redirectTo)
    }

    return Promise.reject(error)
  },
)

// Un 404 del backend significa "este recurso no existe", no "algo falló": las
// pantallas de detalle lo traducen a la página de "no encontrado" del router
// en vez de mostrar un error genérico.
export function isNotFoundError(error: unknown): boolean {
  return Axios.isAxiosError(error) && error.response?.status === 404
}

// Un 409 significa "esto ya no está en el estado que asumiste" — p.ej.
// `ai-control-service` lo devuelve cuando el docente modificó a mano un
// texto que se intenta regenerar sin `SOBRESCRIBIR`. La pantalla lo traduce
// a una confirmación en vez de al toast de error genérico.
export function isConflictError(error: unknown): boolean {
  return Axios.isAxiosError(error) && error.response?.status === 409
}

// Mismo mensaje que ya muestra el toast global del interceptor (arriba),
// pero para diálogos que quieren mostrarlo en su propio banner en vez de (o
// además de) el toast — p.ej. para que no quede detrás del overlay del
// modal. Reusa `cleanErrorMessage` para recortar el ruido de Postgres.
/**
 * De dónde sale la frase, en orden.
 *
 * El backend no tiene UNA forma de reportar errores: las funciones
 * PL/pgSQL llegan como `message`, `ProblemDetail` de Spring usa `detail`,
 * auth-center usa `error_description` en los de OAuth y la validación de
 * campos manda una lista en `errors`. Leer solo `message` —como se hacía—
 * dejaba a todos los demás mostrando el texto de Axios.
 *
 * `error` NO entra en la lista a propósito: en el cuerpo por defecto de
 * Spring ese campo es la frase del status ("Bad Request"), que no dice
 * nada, y en los de OAuth es un código ("invalid_token").
 */
function mensajeDelCuerpo(data: unknown): string {
  // Un cuerpo de texto suele ser el error tal cual, pero también puede ser
  // la página HTML de un gateway: eso no se le muestra a nadie.
  if (typeof data === "string") {
    const texto = data.trim()
    return texto.startsWith("<") || texto.length > 300 ? "" : texto
  }
  if (data == null || typeof data !== "object") return ""

  const cuerpo = data as Record<string, unknown>

  // `mensaje`: cuerpo de error del agente de ai-control-service (`ErrorDto`).
  for (const clave of ["message", "mensaje", "detail", "error_description"]) {
    const valor = cuerpo[clave]
    if (typeof valor === "string" && valor.trim() !== "") return valor.trim()
  }

  if (Array.isArray(cuerpo.errors)) {
    const frases = cuerpo.errors
      .map((item) => {
        if (typeof item === "string") return item
        if (item == null || typeof item !== "object") return null
        const campo = item as Record<string, unknown>
        const frase = campo.defaultMessage ?? campo.message
        return typeof frase === "string" ? frase : null
      })
      .filter((frase): frase is string => frase != null && frase.trim() !== "")

    if (frases.length > 0) return frases.join(" ")
  }

  return ""
}

/**
 * Lo que dice Axios cuando el backend no dijo nada útil. Son mensajes de
 * librería, no de producto: "Request failed with status code 400" fue
 * literalmente lo que vieron los usuarios al fallar el registro de un
 * funcionario por la contraseña.
 */
const AXIOS_GENERICO = /^(request failed with status code \d+|network error|timeout of \d+ *ms exceeded|canceled)$/i

/**
 * El último recurso: cuando no hay frase del backend, al menos que el
 * status diga algo. Sigue siendo genérico —el mensaje bueno es el que
 * manda el backend—, pero es legible.
 */
const POR_STATUS: Record<number, string> = {
  400: "El servidor rechazó los datos enviados. Revisa los campos del formulario.",
  401: "Tu sesión no es válida. Vuelve a iniciar sesión.",
  403: "El usuario no tiene permisos.",
  404: "No se encontró el recurso solicitado.",
  409: "Ya existe un registro con esos datos.",
  413: "El archivo es demasiado grande.",
  500: "El servidor tuvo un problema procesando la solicitud. Intenta de nuevo.",
  502: "El servidor no está respondiendo. Intenta de nuevo en un momento.",
  503: "El servidor no está respondiendo. Intenta de nuevo en un momento.",
  504: "El servidor tardó demasiado en responder. Intenta de nuevo.",
}

function sinFraseDelBackend(message: string, status?: number): string {
  if (!AXIOS_GENERICO.test(message.trim())) return cleanErrorMessage(message)

  return (
    (status != null ? POR_STATUS[status] : undefined) ??
    "No fue posible completar la operación. Intenta de nuevo."
  )
}

/**
 * ¿La request que falló era una lectura? GET/HEAD, un POST de consulta marcado
 * `readOnly` (`api.query`, `evalCol.postRows`) o un `/query` del motor de
 * eval-col. Decide entre "no está guardada en este equipo" (lectura) y "esta
 * acción necesita internet" (escritura).
 */
function isReadRequest(config: { method?: string; url?: string; readOnly?: boolean } | undefined): boolean {
  const method = (config?.method ?? "get").toLowerCase()
  if (method === "get" || method === "head" || config?.readOnly) return true
  return /\/query(?:[/?]|$)/.test(config?.url ?? "")
}

/**
 * Mensaje de un error de RED (sin respuesta del servidor) según el equipo esté
 * sin conexión o solo con la red inestable. Sin conexión, una lectura que
 * falla es una cuyo dato no estaba guardado en el equipo: las que sí lo
 * estaban ni siquiera se piden (`OfflineAwareQueryClient`).
 */
function networkErrorMessage(error: unknown): string {
  const offline = isOfflineNow()
  if (error instanceof NetworkSessionError) return offline ? OFFLINE_SESSION_MESSAGE : NETWORK_ERROR_MESSAGE
  if (!offline) return NETWORK_ERROR_MESSAGE
  const config = Axios.isAxiosError(error) ? error.config : undefined
  return isReadRequest(config) ? OFFLINE_NO_DATA_FULL_MESSAGE : OFFLINE_WRITE_MESSAGE
}

export function getErrorMessage(error: unknown): string {
  // Sin respuesta (offline, DNS, timeout) o el refresh de sesión sin red: no
  // hay frase del backend que mostrar y "Network Error" no le dice nada a un
  // docente. Un 502/503/504 sí trae respuesta y sigue por el camino de status.
  if (error instanceof NetworkSessionError || (Axios.isAxiosError(error) && !error.response && isNetworkError(error))) {
    return networkErrorMessage(error)
  }
  if (Axios.isAxiosError(error)) {
    const delCuerpo = mensajeDelCuerpo(error.response?.data)
    if (delCuerpo !== "") return cleanErrorMessage(delCuerpo)

    return sinFraseDelBackend(error.message, error.response?.status)
  }
  if (error instanceof Error) return sinFraseDelBackend(error.message)
  return "No fue posible completar la operación."
}

// Queries complejas que no entran cómodo en query params (filtros anidados,
// sorts compuestos, etc.) y por eso necesitan body. Se mandan por POST, que
// es lo que soporta el gateway. Como el response interceptor ya desenvuelve
// `response.data`, casteamos el resultado a `T`.
api.query = <T>(url: string, data?: unknown): Promise<T> =>
  api.request<T>({ method: "POST", url, data, readOnly: true }) as unknown as Promise<T>
