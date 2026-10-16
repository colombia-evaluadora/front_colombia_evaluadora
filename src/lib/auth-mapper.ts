import type { Role, User } from "@/types/api"

// Nombre exacto del rol en `public.role` (backend real, ver
// academico_test.fn_assert_superadmin en el SSO): `'CEVAL-' || TROL.CODIGO`,
// y el CODIGO de superadmin es `SUPER_ADMINISTRADOR`.
const SUPER_ADMIN_ROLE = "CEVAL-SUPER_ADMINISTRADOR"

export interface AuthUser extends User {
  initials: string
  /** `true` si el token trae el claim de rol `CEVAL-SUPER_ADMINISTRADOR`. */
  isSuperAdmin: boolean
  /**
   * `true` si el usuario sale de la sesión persistida (modo "autenticado sin
   * conexión", `lib/offline/session.ts`): no hay token en memoria.
   */
  offline?: boolean
  /**
   * `users.id_user` (claim `uid` del JWT). Es la identidad numérica del chat
   * (`autor.id`, `menciones[].usuarioId`, `reacciones[].usuarios`) con la que
   * se calculan `esPropio`/`meMenciona`/`mia` en el cliente: los eventos del
   * socket de comms-service llegan iguales para todos (PR SSO #692). `null`
   * si el token no lo trae; entonces se respetan los valores del servidor.
   */
  userId?: number | null
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
  /** `users.id_user`; opcional por la misma razón. */
  uid?: number | string
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
    return { sub: claims.sub, roles: claims.roles, name: claims.name, uid: claims.uid }
  } catch {
    return null
  }
}

export function toAuthUserFromToken(token: string): AuthUser | null {
  const claims = decodeAccessToken(token)
  if (!claims) return null

  const role: Role = claims.roles.includes("ADMIN") ? "ADMIN" : "USER"
  const uid = claims.uid == null || claims.uid === "" ? NaN : Number(claims.uid)
  const user = toAuthUser({
    id: claims.sub,
    email: claims.sub,
    // Sin claim `name` queda el prefijo del correo: no es bonito, pero es
    // lo único que hay para identificar a la persona en pantalla.
    name: claims.name ?? claims.sub.split("@")[0],
    role,
    roles: claims.roles,
  })
  return { ...user, userId: Number.isFinite(uid) ? uid : null }
}

/**
 * Tópico personal del gateway de tiempo real: `user:<sub>` con el `sub` del
 * JWT (correo) en minúsculas, igual que lo normalizan comms-service y
 * notification-service (la bandeja se indexa por ese `sub`, no por un id).
 */
export const topicoUsuario = (user: Pick<AuthUser, "email">) => `user:${user.email.trim().toLowerCase()}`
