import type { User } from "@/types/api"

export const authUsers: (User & {
  password: string
  /** Documento de identidad: con esto se recupera el usuario. */
  document: string
})[] = [
  {
    id: "1",
    email: "admin@example.com",
    password: "password",
    name: "Admin Demo",
    role: "ADMIN",
    // Carga también el claim de super admin real del backend: así el mock
    // deja probar los flujos que dependen de `AuthUser.isSuperAdmin`.
    roles: ["ADMIN", "CEVAL-SUPER_ADMINISTRADOR"],
    document: "1020304050",
  },
  {
    // Cuenta espejo de la que existe en el backend real: mismas credenciales
    // acá para poder recorrer la app entera en modo mock sin cambiar de
    // usuario. Superadmin, así que ve todos los menús y pasa los chequeos de
    // `AuthUser.isSuperAdmin`.
    id: "3",
    email: "laura.martinez.1786561207@example.com",
    password: "LauraSuper2026!",
    name: "Laura Martínez",
    role: "ADMIN",
    roles: ["ADMIN", "CEVAL-SUPER_ADMINISTRADOR"],
    document: "1786561207",
  },
  {
    id: "2",
    email: "user@example.com",
    password: "password",
    name: "Usuario Demo",
    role: "USER",
    roles: ["USER"],
    document: "1098765432",
  },
]

/** El usuario con el que se ingresa es el correo. */
export function findUserByDocument(document: string) {
  return authUsers.find((u) => u.document === document.trim())
}

export function findUserByCredentials(email: string, password: string) {
  return authUsers.find((u) => u.email === email && u.password === password)
}

// Token con forma de JWT (header.payload.signature, sin firma real) para que
// el front lo decodifique con el mismo mapper que usa contra el backend
// real: ver lib/auth-mapper.ts `toAuthUserFromToken` (claims `sub`/`roles`).
function base64url(json: unknown): string {
  // Un JWT real codifica el payload en UTF-8 antes del base64. `btoa` solo
  // acepta latin-1, así que un nombre con tilde ("Laura Martínez") saldría
  // mal —o rompería— sin este paso. El front hace el camino inverso al
  // decodificar (ver `decodeAccessToken` en lib/auth-mapper.ts).
  const utf8 = new TextEncoder().encode(JSON.stringify(json))
  const binary = String.fromCharCode(...utf8)
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

export function createMockAccessToken(user: User): string {
  const header = base64url({ alg: "none", typ: "JWT" })
  const payload = base64url({
    sub: user.email,
    // El backend real trae el nombre en el token; sin este claim la barra
    // lateral muestra el prefijo del correo en vez del nombre de la persona.
    name: user.name,
    roles: user.roles,
    iat: Math.floor(Date.now() / 1000),
  })
  return `${header}.${payload}.mock-signature`
}

/** Inversa de `base64url`: base64url -> bytes -> texto UTF-8. */
function decodeBase64Url(segment: string): string {
  const binary = atob(segment.replace(/-/g, "+").replace(/_/g, "/"))
  return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)))
}

export function findUserByToken(token: string) {
  try {
    const payload = JSON.parse(decodeBase64Url(token.split(".")[1])) as { sub?: string }
    return payload.sub ? findUserByEmail(payload.sub) : undefined
  } catch {
    return undefined
  }
}

export function findUserByEmail(email: string) {
  return authUsers.find((u) => u.email === email)
}

/**
 * "carlos.mendoza@x.com" -> "car•••••@x.com". Enmascarar es tarea del
 * backend: la dirección completa nunca debe salir en la respuesta de
 * "recuperar usuario", donde alcanza con reconocerla.
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@")
  if (!domain) return email
  return `${local.slice(0, 3)}${"•".repeat(Math.max(3, local.length - 3))}@${domain}`
}

// token -> email + vencimiento, simula el link que el backend real envía por
// correo. En el mock el token es estático y no se consume al usarlo: así el
// link /restore-password?token=... sigue funcionando entre recargas y se
// puede guardar en favoritos mientras se desarrolla la pantalla. Lo único
// que lo invalida es el tiempo.
export const MOCK_PASSWORD_RESET_TOKEN = "mock-reset-token"

/**
 * Vida del enlace de reseteo. En producción son 30 minutos; acá está en 10
 * segundos a propósito, para poder ver el contador llegar a cero y las
 * pantallas de "expiró" sin esperar.
 */
export const PASSWORD_RESET_TTL_SECONDS = 30 * 60

interface PasswordResetEntry {
  email: string
  /** Epoch ms en que se emitió (es decir, cuándo se "envió" el correo). */
  issuedAt: number
  /** Epoch ms en que el token deja de servir. */
  expiresAt: number
}

// Precargado con el usuario demo para que el token sirva aunque no se haya
// pasado antes por /forgot-password.
const passwordResetTokens = new Map<string, PasswordResetEntry>([
  [
    MOCK_PASSWORD_RESET_TOKEN,
    {
      email: authUsers[0].email,
      issuedAt: Date.now(),
      expiresAt: Date.now() + PASSWORD_RESET_TTL_SECONDS * 1000,
    },
  ],
])

export function createPasswordResetToken(email: string): {
  token: string
  expiresIn: number
} {
  const issuedAt = Date.now()
  passwordResetTokens.set(MOCK_PASSWORD_RESET_TOKEN, {
    email,
    issuedAt,
    expiresAt: issuedAt + PASSWORD_RESET_TTL_SECONDS * 1000,
  })
  return {
    token: MOCK_PASSWORD_RESET_TOKEN,
    expiresIn: PASSWORD_RESET_TTL_SECONDS,
  }
}

export type PasswordResetTokenStatus = "valid" | "expired" | "invalid"

/**
 * Estado de un token de reseteo. El token es la única fuente: de él salen el
 * email al que se envió, cuándo se envió (`issuedAt`) y cuántos segundos le
 * quedan (`expiresIn`, 0 si venció o no existe). Eso es lo que alimenta la
 * pantalla de "revisa tu correo" sin necesidad de más query params.
 */
export function getPasswordResetTokenStatus(token: string): {
  status: PasswordResetTokenStatus
  expiresIn: number
  ttlSeconds: number
  maskedEmail?: string
  issuedAt?: number
} {
  const entry = passwordResetTokens.get(token)
  if (!entry) {
    return {
      status: "invalid",
      expiresIn: 0,
      ttlSeconds: PASSWORD_RESET_TTL_SECONDS,
    }
  }

  const remaining = Math.max(0, Math.ceil((entry.expiresAt - Date.now()) / 1000))
  return {
    status: remaining > 0 ? "valid" : "expired",
    expiresIn: remaining,
    ttlSeconds: PASSWORD_RESET_TTL_SECONDS,
    // Enmascarado desde acá: la dirección completa no sale en la respuesta.
    maskedEmail: maskEmail(entry.email),
    issuedAt: entry.issuedAt,
  }
}

/**
 * Devuelve el email asociado si el token todavía sirve. El segundo valor
 * distingue "no existe" de "venció" para que la UI muestre el mensaje
 * correcto.
 */
export function consumePasswordResetToken(token: string): {
  email?: string
  status: PasswordResetTokenStatus
} {
  const { status } = getPasswordResetTokenStatus(token)
  if (status !== "valid") return { status }
  return { email: passwordResetTokens.get(token)!.email, status }
}

/** Solo para probar el camino de vencimiento sin esperar 30 minutos. */
export function expirePasswordResetToken(token: string) {
  const entry = passwordResetTokens.get(token)
  if (entry) entry.expiresAt = Date.now()
}

export function setUserPassword(email: string, password: string) {
  const user = findUserByEmail(email)
  if (user) user.password = password
}
