import type { Role, User } from "@/types/api"

// Nombre exacto del rol en `public.role` (backend real, ver
// academico_test.fn_assert_superadmin en el SSO): `'CEVAL-' || TROL.CODIGO`,
// y el CODIGO de superadmin es `SUPER_ADMINISTRADOR`.
const SUPER_ADMIN_ROLE = "CEVAL-SUPER_ADMINISTRADOR"

export interface AuthUser extends User {
  initials: string
  /** `true` si el token trae el claim de rol `CEVAL-SUPER_ADMINISTRADOR`. */
  isSuperAdmin: boolean
}

export function toAuthUser(user: User): AuthUser {
  const [first, second] = user.name.trim().split(/\s+/)
  return {
    ...user,
    initials: `${first?.[0] ?? ""}${second?.[0] ?? ""}`.toUpperCase(),
    isSuperAdmin: user.roles.includes(SUPER_ADMIN_ROLE),
  }
}

interface AccessTokenClaims {
  sub: string
  roles: string[]
  /** Opcional: no todo emisor de tokens lo manda. */
  name?: string
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
    // El payload de un JWT es UTF-8 en base64url: `atob` devuelve bytes, no
    // texto. Sin este paso, cualquier claim con tilde (un nombre, por
    // ejemplo) llega roto.
    const binary = atob(base64)
    const json = new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)))
    const claims = JSON.parse(json) as Partial<AccessTokenClaims>
    if (!claims.sub || !Array.isArray(claims.roles)) return null
    return { sub: claims.sub, roles: claims.roles, name: claims.name }
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
    // Sin claim `name` queda el prefijo del correo: no es bonito, pero es
    // lo único que hay para identificar a la persona en pantalla.
    name: claims.name ?? claims.sub.split("@")[0],
    role,
    roles: claims.roles,
  })
}
