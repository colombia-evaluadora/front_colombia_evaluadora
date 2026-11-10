import { getAuthToken } from "@/lib/api-client"
import { toAuthUserFromToken } from "@/lib/auth-mapper"

/**
 * Perfiles de una cuenta ("[admin] Acceso y sesiones", U.5.PER.1). Una misma
 * persona puede ser funcionario y acudiente: entra con un perfil a la vez y el
 * menú (`GET /my-menus?perfil=`, sso V193) muestra solo lo de ese perfil.
 *
 * Se deriva de los roles del token: `CEVAL-ACUDIENTE` → Acudiente,
 * `CEVAL-ESTUDIANTE` → Estudiante, cualquier otro rol CEVAL → Funcionario.
 * "Participante de procesos" todavía no tiene rol.
 */
export type Perfil = "FUNCIONARIO" | "ACUDIENTE" | "ESTUDIANTE"

export const PERFIL_LABEL: Record<Perfil, string> = {
  FUNCIONARIO: "Funcionario",
  ACUDIENTE: "Acudiente",
  ESTUDIANTE: "Estudiante",
}

const ORDEN: Perfil[] = ["FUNCIONARIO", "ACUDIENTE", "ESTUDIANTE"]

export function perfilesDeRoles(roles: readonly string[] | null | undefined): Perfil[] {
  const encontrados = new Set<Perfil>()
  for (const rol of roles ?? []) {
    if (!rol.startsWith("CEVAL-")) continue
    if (rol === "CEVAL-ACUDIENTE") encontrados.add("ACUDIENTE")
    else if (rol === "CEVAL-ESTUDIANTE") encontrados.add("ESTUDIANTE")
    else encontrados.add("FUNCIONARIO")
  }
  return ORDEN.filter((p) => encontrados.has(p))
}

// El último perfil usado se recuerda por cuenta en este navegador (solo para
// marcar "Último usado"); el de la sesión actual vive en sessionStorage, así
// cada sesión nueva vuelve a preguntar.
const ultimoKey = (email: string) => `ce:perfil-ultimo:${email.toLowerCase()}`
const sesionKey = (email: string) => `ce:perfil-sesion:${email.toLowerCase()}`

function leer(storage: Storage | undefined, key: string): Perfil | null {
  try {
    const v = storage?.getItem(key)
    return v && (ORDEN as string[]).includes(v) ? (v as Perfil) : null
  } catch {
    return null
  }
}

export function getUltimoPerfil(email: string): Perfil | null {
  return leer(globalThis.localStorage, ultimoKey(email))
}

export function getPerfilDeSesion(email: string): Perfil | null {
  return leer(globalThis.sessionStorage, sesionKey(email))
}

export function setPerfilDeSesion(email: string, perfil: Perfil) {
  try {
    globalThis.sessionStorage?.setItem(sesionKey(email), perfil)
    globalThis.localStorage?.setItem(ultimoKey(email), perfil)
  } catch {
    // Sin almacenamiento (modo privado): el perfil vale solo hasta recargar.
  }
}

/** Usuario actual según el token en memoria. */
function usuarioActual() {
  const token = getAuthToken()
  return token ? toAuthUserFromToken(token) : null
}

/**
 * Perfil con el que se pide el menú. `null` si la cuenta tiene un solo
 * perfil (o ninguno): el menú sale completo, como siempre.
 */
export function perfilActivo(): Perfil | null {
  const user = usuarioActual()
  if (!user) return null
  const perfiles = perfilesDeRoles(user.roles)
  if (perfiles.length < 2) return null
  const elegido = getPerfilDeSesion(user.email)
  return elegido && perfiles.includes(elegido) ? elegido : null
}

/** ¿Tiene que elegir perfil antes de entrar? */
export function debeElegirPerfil(): boolean {
  const user = usuarioActual()
  if (!user) return false
  return perfilesDeRoles(user.roles).length > 1 && perfilActivo() === null
}
