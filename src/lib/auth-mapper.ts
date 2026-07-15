import type { Role, User } from "@/types/api"

export interface AuthUser extends User {
  initials: string
}

export function toAuthUser(user: User): AuthUser {
  const [first, second] = user.name.trim().split(/\s+/)
  return {
    ...user,
    initials: `${first?.[0] ?? ""}${second?.[0] ?? ""}`.toUpperCase(),
  }
}

interface AccessTokenClaims {
  sub: string
  roles: string[]
}

// El backend SSO no devuelve un objeto "usuario" en /auth/login ni
// /auth/refresh, solo el access token — el usuario se deriva de sus claims
// (`sub` = email, `roles`). No se verifica la firma acá: la firma ya fue
// validada por el backend al emitir/aceptar el token; esto solo lee el
// payload para pintar la UI.
function decodeAccessToken(token: string): AccessTokenClaims | null {
  try {
    const payload = token.split(".")[1]
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/")
    const json = atob(base64)
    const claims = JSON.parse(json) as Partial<AccessTokenClaims>
    if (!claims.sub || !Array.isArray(claims.roles)) return null
    return { sub: claims.sub, roles: claims.roles }
  } catch {
    return null
  }
}

export function toAuthUserFromToken(token: string): AuthUser | null {
  const claims = decodeAccessToken(token)
  if (!claims) return null

  const role: Role = claims.roles.includes("ADMIN") ? "ADMIN" : "USER"
  return toAuthUser({
    id: claims.sub,
    email: claims.sub,
    name: claims.sub.split("@")[0],
    role,
  })
}
