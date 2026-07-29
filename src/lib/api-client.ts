import Axios, { type InternalAxiosRequestConfig } from "axios"
import { toast } from "sonner"

import { env } from "@/config/env"
import { paths } from "@/config/paths"
import { queryClient } from "./query-client"

declare module "axios" {
  export interface AxiosInstance {
    // Lecturas con body (filtros anidados, sorts compuestos) que no entran
    // cómodo en query params. Va por POST; el nombre `query` marca que la
    // intención es leer, no mutar. Corre por el response interceptor que ya
    // desenvuelve `response.data`, así que la promesa resuelve a `T` directo.
    query<T = unknown>(url: string, data?: unknown): Promise<T>
  }
}

// Persistido en localStorage solo cuando el usuario marcó "Mantener sesión".
// Si no, el token vive en memoria y muere con la pestaña — mismo efecto que
// un refresh token que expira al cerrar el navegador.
//
// La clave va namespaced por modo: el token que emite MSW es un JWT sin
// firma (`alg: none`, ver mocks/db/auth.ts) que el gateway real rechaza con
// 401 `invalid_token`. Con una sola clave compartida, cambiar
// ENABLE_API_MOCKING dejaba el token del modo anterior en storage y el front
// se lo mandaba al backend equivocado.
const TOKEN_STORAGE_KEY = env.ENABLE_API_MOCKING ? "mock_auth_token" : "auth_token"
const REMEMBER_KEY = "auth_remember_me"
let authToken: string | null = localStorage.getItem(REMEMBER_KEY)
  ? localStorage.getItem(TOKEN_STORAGE_KEY)
  : null

export function setAuthToken(token: string | null) {
  authToken = token
  // El token en memoria siempre se actualiza para que la pestaña actual
  // funcione; el storage solo se toca si el usuario pidió "recordar".
  if (token === null) {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
    localStorage.removeItem(REMEMBER_KEY)
  } else {
    authToken = token
    if (localStorage.getItem(REMEMBER_KEY)) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token)
    }
  }
}

function authRequestInterceptor(config: InternalAxiosRequestConfig) {
  if (config.headers) {
    config.headers.Accept = "application/json"
    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`
    }
  }
  return config
}

let isHandlingExpiredSession = false

// Endpoints que se llaman *sin* sesión: los de recuperación de contraseña /
// usuario y el chequeo de sesión. Un 401 acá no significa "se venció tu
// sesión" (no había ninguna), sino "este enlace no sirve" — y cada pantalla
// ya tiene su propio estado para eso. Sin esta lista, abrir
// /restore-password?token=... con un token que el backend rechaza terminaba
// en un redirect duro a /login.
const PUBLIC_ENDPOINTS = [
  "/auth/refresh",
  "/sso-admin/resetTokenStatus",
  "/sso-admin/restorePassword",
  "/sso-admin/forgotPassword",
  "/sso-admin/forgotUsername",
]

// Sondas: se llaman para *averiguar* un estado, y "no autorizado" es una de
// las respuestas posibles. Cada pantalla decide qué mostrar, así que no
// tostean. El resto de los públicos (restore/forgot) sí avisa: ahí el error
// es el resultado de una acción que el usuario disparó.
const PROBE_ENDPOINTS = ["/auth/refresh", "/sso-admin/resetTokenStatus"]

export const api = Axios.create({
  baseURL: env.API_URL,
})

api.interceptors.request.use(authRequestInterceptor)
api.interceptors.response.use(
  // El response interceptor desenvuelve `response.data` — todas las llamadas
  // a `api.*` (incluyendo `api.query`) resuelven con el body directo.
  (response) => response.data,
  (error) => {
    // /auth/refresh se llama para *comprobar* si hay sesión (no hay /auth/me
    // en el backend real) — un 401 ahí es una respuesta normal ("no
    // autenticado"), no un fallo que deba redirigir. getUser() en lib/auth.ts
    // ya lo captura y devuelve null. Lo mismo vale para los endpoints de
    // recuperación, que corren sin sesión.
    const requestUrl = error.config?.url ?? ""
    const isPublicEndpoint = PUBLIC_ENDPOINTS.some((endpoint) => requestUrl.startsWith(endpoint))
    const isUnauthorized = error.response?.status === 401

    // Sin guard, un 401 en /login mismo (todavía no existe esa página)
    // reintentaría redirigir a /login en loop infinito.
    const onLoginPage = window.location.pathname === paths.auth.login.path
    const isExpiredSession = isUnauthorized && !onLoginPage && !isPublicEndpoint

    // Una sesión caída hace fallar *todas* las queries en vuelo a la vez.
    // Sin este latch salía un toast y un `window.location.href` por cada
    // una. El latch no se resetea: la redirección recarga la página entera
    // y con ella este módulo.
    if (isExpiredSession && isHandlingExpiredSession) {
      return Promise.reject(error)
    }

    const isProbe = PROBE_ENDPOINTS.some((endpoint) => requestUrl.startsWith(endpoint))

    if (!isProbe) {
      const message = error.response?.data?.message || error.message
      toast.error(message)
    }

    if (isExpiredSession) {
      isHandlingExpiredSession = true
      setAuthToken(null)
      queryClient.clear()
      const redirectTo = window.location.pathname
      window.location.href = paths.auth.login.getHref(redirectTo)
    }

    return Promise.reject(error)
  },
)

// Queries complejas que no entran cómodo en query params (filtros anidados,
// sorts compuestos, etc.) y por eso necesitan body. Se mandan por POST, que
// es lo que soporta el gateway. Como el response interceptor ya desenvuelve
// `response.data`, casteamos el resultado a `T`.
api.query = <T>(url: string, data?: unknown): Promise<T> =>
  api.request<T>({ method: "POST", url, data }) as unknown as Promise<T>
