import Axios, { type InternalAxiosRequestConfig } from "axios"
import { toast } from "sonner"

import { env } from "@/config/env"
import { paths } from "@/config/paths"
import { queryClient } from "./query-client"

declare module "axios" {
  export interface AxiosInstance {
    // RFC 10008: verb "safe + idempotente con body" para queries complejas.
    // `api.query` corre por el response interceptor que ya desenvuelve
    // `response.data`, así que la promesa resuelve a `T` directo.
    query<T = unknown>(url: string, data?: unknown): Promise<T>
  }
}

// Persistido en localStorage solo para que la sesión sobreviva a un reload
// mientras se prueba la UI. No es representativo de cómo se guardaría un
// token contra un backend real.
//
// La clave va namespaced por modo: el token que emite MSW es un JWT sin
// firma (`alg: none`, ver mocks/db/auth.ts) que el gateway real rechaza con
// 401 `invalid_token`. Con una sola clave compartida, cambiar
// ENABLE_API_MOCKING dejaba el token del modo anterior en storage y el front
// se lo mandaba al backend equivocado.
const TOKEN_STORAGE_KEY = env.ENABLE_API_MOCKING
  ? "mock_auth_token"
  : "auth_token"
let authToken: string | null = localStorage.getItem(TOKEN_STORAGE_KEY)

export function setAuthToken(token: string | null) {
  authToken = token
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
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
    // ya lo captura y devuelve null.
    const isSessionCheck = error.config?.url === "/auth/refresh"

    if (!isSessionCheck) {
      // Sin guard, un 401 en /login mismo (todavía no existe esa página)
      // reintentaría redirigir a /login en loop infinito.
      const onLoginPage = window.location.pathname === paths.auth.login.path
      const isExpiredSession = error.response?.status === 401 && !onLoginPage

      // Una sesión caída hace fallar *todas* las queries en vuelo a la vez.
      // Sin este latch salía un toast y un `window.location.href` por cada
      // una. El latch no se resetea: la redirección recarga la página entera
      // y con ella este módulo.
      if (isExpiredSession && isHandlingExpiredSession) {
        return Promise.reject(error)
      }

      const message = error.response?.data?.message || error.message
      toast.error(message)

      if (isExpiredSession) {
        isHandlingExpiredSession = true
        setAuthToken(null)
        queryClient.clear()
        const redirectTo = window.location.pathname
        window.location.href = paths.auth.login.getHref(redirectTo)
      }
    }

    return Promise.reject(error)
  }
)

// RFC 10008 (junio 2026): el método QUERY es safe + idempotente, con body
// (a diferencia de GET) y cacheable (a diferencia de POST). Es el verb
// correcto para queries complejas que no entran cómodo en query params
// (filtros anidados, sorts compuestos, etc.). Axios acepta métodos custom
// vía `request({ method })` — no hay helper built-in. Como el response
// interceptor ya desenvuelve `response.data`, casteamos el resultado a `T`.
api.query = <T>(url: string, data?: unknown): Promise<T> =>
  api.request<T>({ method: "QUERY", url, data }) as unknown as Promise<T>
