import { http, HttpResponse, delay } from "msw"

import {
  consumePasswordResetToken,
  createPasswordResetToken,
  findUserByCredentials,
  findUserByEmail,
  findUserByToken,
  setUserPassword,
} from "../db/auth"

function getBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization") ?? ""
  return header.startsWith("Bearer ") ? header.slice("Bearer ".length) : null
}

export const authHandlers = [
  http.post("/api/auth/login", async ({ request }) => {
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

  http.get("/api/auth/me", ({ request }) => {
    const token = getBearerToken(request)
    const user = token ? findUserByToken(token) : undefined

    if (!user) {
      return HttpResponse.json({ message: "No autenticado." }, { status: 401 })
    }

    const { password: _password, ...safeUser } = user
    return HttpResponse.json(safeUser)
  }),

  http.post("/api/auth/logout", async () => {
    await delay(150)
    return HttpResponse.json({ message: "Sesión cerrada." })
  }),

  // Mismo contrato que el backend real (GET /sso-admin/forgotPassword?email=):
  // nunca revela si el email existe, siempre resuelve 200. El link de reseteo
  // no se puede "enviar" en un mock, así que el token queda logueado en
  // consola para poder probar el flujo de /restore-password localmente.
  http.get("/api/sso-admin/forgotPassword", async ({ request }) => {
    await delay(300)
    const email = new URL(request.url).searchParams.get("email") ?? ""
    const user = findUserByEmail(email)

    if (user) {
      const token = createPasswordResetToken(email)
      console.info(
        `[mock] Link de reseteo para ${email}: /restore-password?token=${token}`
      )
    }

    return new HttpResponse(null, { status: 200 })
  }),

  http.post("/api/sso-admin/restorePassword", async ({ request }) => {
    await delay(300)
    const { token, password } = (await request.json()) as {
      token: string
      password: string
    }
    const email = consumePasswordResetToken(token)

    if (!email) {
      return HttpResponse.json(
        { message: "El enlace de recuperación no es válido o ya expiró." },
        { status: 400 }
      )
    }

    setUserPassword(email, password)
    return new HttpResponse(null, { status: 200 })
  }),
]
