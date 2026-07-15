import Axios, { type InternalAxiosRequestConfig } from "axios"
import { toast } from "sonner"

import { env } from "@/config/env"
import { paths } from "@/config/paths"

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

api.interceptors.request.use(authRequestInterceptor)
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // /auth/me se llama para *comprobar* si hay sesión — un 401 ahí es una
    // respuesta normal ("no autenticado"), no un fallo que deba redirigir.
    // getUser() en lib/auth.ts ya lo captura y devuelve null.
    const isSessionCheck = error.config?.url === "/auth/me"

    if (!isSessionCheck) {
      const message = error.response?.data?.message || error.message
      toast.error(message)

      // Sin guard, un 401 en /login mismo (todavía no existe esa página)
      // reintentaría redirigir a /login en loop infinito.
      const onLoginPage = window.location.pathname === paths.auth.login.path
      if (error.response?.status === 401 && !onLoginPage) {
        const redirectTo = window.location.pathname
        window.location.href = paths.auth.login.getHref(redirectTo)
      }
    }

    return Promise.reject(error)
  }
)
