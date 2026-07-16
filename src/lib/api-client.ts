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

// Persistido en localStorage solo para que la sesión mock sobreviva a un
// reload mientras se prueba la UI. No es representativo de cómo se
// guardaría un token contra un backend real.
const TOKEN_STORAGE_KEY = "mock_auth_token"
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

export const api = Axios.create({
  baseURL: env.API_URL,
})

// RFC 10008 (junio 2026): el método QUERY es safe + idempotente, con body
// (a diferencia de GET) y cacheable (a diferencia de POST). Es el verb
// correcto para queries complejas que no entran cómodo en query params
// (filtros anidados, sorts compuestos, etc.). Axios acepta métodos custom
// vía `request({ method })` — no hay helper built-in.
api.query = <T>(url: string, data?: unknown): Promise<T> =>
  api
    .request<T>({ method: "QUERY", url, data })
    .then((response) => response.data) as Promise<T>

api.interceptors.request.use(authRequestInterceptor)
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // /auth/refresh se llama para *comprobar* si hay sesión (no hay /auth/me
    // en el backend real) — un 401 ahí es una respuesta normal ("no
    // autenticado"), no un fallo que deba redirigir. getUser() en lib/auth.ts
    // ya lo captura y devuelve null.
    const isSessionCheck = error.config?.url === "/auth/refresh"

    if (!isSessionCheck) {
      const message = error.response?.data?.message || error.message
      toast.error(message)

      // Sin guard, un 401 en /login mismo (todavía no existe esa página)
      // reintentaría redirigir a /login en loop infinito.
      const onLoginPage = window.location.pathname === paths.auth.login.path
      if (error.response?.status === 401 && !onLoginPage) {
        setAuthToken(null)
        queryClient.clear()
        const redirectTo = window.location.pathname
        window.location.href = paths.auth.login.getHref(redirectTo)
      }
    }

    return Promise.reject(error)
  }
)
