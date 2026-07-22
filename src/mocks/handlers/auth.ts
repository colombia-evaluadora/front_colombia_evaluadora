import { http, HttpResponse, delay } from "msw"

import {
  consumePasswordResetToken,
  createMockAccessToken,
  createPasswordResetToken,
  expirePasswordResetToken,
  findUserByCredentials,
  findUserByDocument,
  findUserByToken,
  getPasswordResetTokenStatus,
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

    // Mismo contrato que el backend real: solo token/refreshToken/expiresIn,
    // sin objeto "user" — el front lo deriva del propio JWT.
    return HttpResponse.json({
      token: createMockAccessToken(user),
      refreshToken: `mock-refresh-${user.id}`,
      expiresIn: 3600,
    })
  }),

  // El backend real no tiene /auth/me: la sesión se restaura pidiendo un
  // token nuevo acá (normalmente vía cookie de refresh; en el mock, como no
  // hay cookie, se re-emite a partir del Bearer todavía vigente).
  http.post("/api/auth/refresh", ({ request }) => {
    const token = getBearerToken(request)
    const user = token ? findUserByToken(token) : undefined

    if (!user) {
      return HttpResponse.json({ message: "No autenticado." }, { status: 401 })
    }

    return HttpResponse.json({
      token: createMockAccessToken(user),
      refreshToken: `mock-refresh-${user.id}`,
      expiresIn: 3600,
    })
  }),

  http.post("/api/auth/logout", async () => {
    await delay(150)
    return HttpResponse.json({ message: "Sesión cerrada." })
  }),

  // Mismo contrato que el backend real (GET /sso-admin/forgotPassword?email=):
  // nunca revela si el email existe, siempre resuelve 200. Diferencia con el
  // real: acá devolvemos el token en el body, porque en un mock no hay correo
  // que abrir — es lo que le permite a /check-email mostrar el vencimiento
  // real y llegar a /restore-password. El front trata el body como opcional.
  http.get("/api/sso-admin/forgotPassword", async ({ request }) => {
    await delay(300)
    const email = new URL(request.url).searchParams.get("email") ?? ""

    // El token se emite exista o no el usuario: si no existe, el reseteo
    // después no cambia nada, pero la respuesta no delata la diferencia.
    const { token, expiresIn } = createPasswordResetToken(email)

    console.info(
      `[mock] Link de reseteo para ${email}: /restore-password?token=${token}`
    )

    return HttpResponse.json({ token, expiresIn })
  }),

  // Recuperar usuario a partir del documento: el usuario es el correo, así
  // que pedirlo por correo no tendría sentido.
  http.get("/api/sso-admin/forgotUsername", async ({ request }) => {
    await delay(300)
    const document = new URL(request.url).searchParams.get("document") ?? ""
    const user = findUserByDocument(document)

    if (!user) {
      return HttpResponse.json(
        { message: "No encontramos una cuenta con ese número de documento." },
        { status: 404 }
      )
    }

    return HttpResponse.json({ username: user.email })
  }),

  // Endpoint solo-mock: la pantalla de confirmación lo consulta para saber
  // cuántos segundos le quedan al enlace y para distinguir "venció" de
  // "no existe".
  http.get("/api/sso-admin/resetTokenStatus", ({ request }) => {
    const token = new URL(request.url).searchParams.get("token") ?? ""
    return HttpResponse.json(getPasswordResetTokenStatus(token))
  }),

  // Atajo de desarrollo para probar la pantalla de "enlace expirado" sin
  // esperar los 30 minutos.
  http.post("/api/sso-admin/expireResetToken", async ({ request }) => {
    const { token } = (await request.json()) as { token: string }
    expirePasswordResetToken(token)
    return new HttpResponse(null, { status: 200 })
  }),

  http.post("/api/sso-admin/restorePassword", async ({ request }) => {
    await delay(300)
    const { token, password } = (await request.json()) as {
      token: string
      password: string
    }
    const { email, status } = consumePasswordResetToken(token)

    if (!email) {
      return HttpResponse.json(
        {
          code: status,
          message:
            status === "expired"
              ? "El enlace de recuperación ya expiró. Solicita uno nuevo."
              : "El enlace de recuperación no es válido.",
        },
        { status: 400 }
      )
    }

    setUserPassword(email, password)
    return new HttpResponse(null, { status: 200 })
  }),
]
