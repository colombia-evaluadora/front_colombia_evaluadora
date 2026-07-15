import { http, HttpResponse, delay } from "msw"

import { findUserByCredentials, findUserByToken } from "../db/auth"

function getBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization") ?? ""
  return header.startsWith("Bearer ") ? header.slice("Bearer ".length) : null
}

export const authHandlers = [
  http.post("/auth/login", async ({ request }) => {
    await delay(300)
    const { email, password } = (await request.json()) as {
      email: string
      password: string
    }
    const user = findUserByCredentials(email, password)

    if (!user) {
      return HttpResponse.json(
        { message: "Email o contraseña incorrectos." },
        { status: 401 }
      )
    }

    const { password: _password, ...safeUser } = user
    return HttpResponse.json({ user: safeUser, token: `mock-token-${user.id}` })
  }),

  http.get("/auth/me", ({ request }) => {
    const token = getBearerToken(request)
    const user = token ? findUserByToken(token) : undefined

    if (!user) {
      return HttpResponse.json({ message: "No autenticado." }, { status: 401 })
    }

    const { password: _password, ...safeUser } = user
    return HttpResponse.json(safeUser)
  }),

  http.post("/auth/logout", async () => {
    await delay(150)
    return HttpResponse.json({ message: "Sesión cerrada." })
  }),
]
