import type { User } from "@/types/api"

export const authUsers: (User & { password: string })[] = [
  {
    id: "1",
    email: "admin@example.com",
    password: "password",
    name: "Admin Demo",
    role: "ADMIN",
  },
  {
    id: "2",
    email: "user@example.com",
    password: "password",
    name: "Usuario Demo",
    role: "USER",
  },
]

export function findUserByCredentials(email: string, password: string) {
  return authUsers.find((u) => u.email === email && u.password === password)
}

// Token con forma de JWT (header.payload.signature, sin firma real) para que
// el front lo decodifique con el mismo mapper que usa contra el backend
// real: ver lib/auth-mapper.ts `toAuthUserFromToken` (claims `sub`/`roles`).
function base64url(json: unknown): string {
  return btoa(JSON.stringify(json)).replace(/\+/g, "-").replace(/\//g, "_")
}

export function createMockAccessToken(user: User): string {
  const header = base64url({ alg: "none", typ: "JWT" })
  const payload = base64url({
    sub: user.email,
    roles: [user.role],
    iat: Math.floor(Date.now() / 1000),
  })
  return `${header}.${payload}.mock-signature`
}

export function findUserByToken(token: string) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1])) as { sub?: string }
    return payload.sub ? findUserByEmail(payload.sub) : undefined
  } catch {
    return undefined
  }
}

export function findUserByEmail(email: string) {
  return authUsers.find((u) => u.email === email)
}

// token -> email, simula el link que el backend real envía por correo.
// En el mock el token es estático y no se consume: así el link
// /restore-password?token=... sigue funcionando entre recargas y se puede
// guardar en favoritos mientras se desarrolla la pantalla.
export const MOCK_PASSWORD_RESET_TOKEN = "mock-reset-token"

// Precargado con el usuario demo para que el token sirva aunque no se haya
// pasado antes por /forgot-password.
const passwordResetTokens = new Map<string, string>([
  [MOCK_PASSWORD_RESET_TOKEN, authUsers[0].email],
])

export function createPasswordResetToken(email: string): string {
  passwordResetTokens.set(MOCK_PASSWORD_RESET_TOKEN, email)
  return MOCK_PASSWORD_RESET_TOKEN
}

export function consumePasswordResetToken(token: string): string | undefined {
  return passwordResetTokens.get(token)
}

export function setUserPassword(email: string, password: string) {
  const user = findUserByEmail(email)
  if (user) user.password = password
}
