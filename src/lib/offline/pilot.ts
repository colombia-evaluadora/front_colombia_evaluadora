import { env } from "@/config/env"

/**
 * Pertenencia al piloto offline (plan §0.3 / P6). Mientras no haya política
 * institucional sobre datos de menores en equipos personales, solo los
 * usuarios del piloto pueden desmarcar "Este es un equipo compartido" (es
 * decir, guardar datos en el equipo).
 *
 * No existe un rol ni un permiso de menú del backend que represente "piloto
 * offline" (los roles reales son por función: docente, rector…), y agregar uno
 * sería un cambio de esquema. Por eso es configuración de build:
 * `VITE_APP_OFFLINE_PILOT` = lista separada por comas de correos (llevan `@`)
 * y/o roles del JWT; `*` habilita a todos; vacío no habilita a nadie.
 *
 * Se valida dos veces: antes del login (por el correo escrito, para habilitar
 * el checkbox) y después (por correo y roles del token): si el usuario no es
 * del piloto el equipo vuelve a "compartido" y no se guarda nada.
 */
export interface OfflinePilotConfig {
  all: boolean
  emails: Set<string>
  roles: Set<string>
}

export function parseOfflinePilot(raw: string | undefined): OfflinePilotConfig {
  const entries = (raw ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean)
  return {
    all: entries.includes("*"),
    emails: new Set(entries.filter((e) => e.includes("@")).map((e) => e.toLowerCase())),
    roles: new Set(entries.filter((e) => e !== "*" && !e.includes("@"))),
  }
}

const config = parseOfflinePilot(env.OFFLINE_PILOT)

/**
 * Antes del login solo se conoce el correo escrito: se habilita el checkbox si
 * el piloto abarca a todos, al correo, o hay roles en la lista (los roles se
 * verifican recién con el token, en `isOfflinePilotUser`).
 */
export function canChoosePersonalDevice(email: string, cfg: OfflinePilotConfig = config): boolean {
  return cfg.all || cfg.emails.has(email.trim().toLowerCase()) || cfg.roles.size > 0
}

/** Verificación definitiva, con el usuario del token. */
export function isOfflinePilotUser(
  user: { email: string; roles: string[] } | null | undefined,
  cfg: OfflinePilotConfig = config,
): boolean {
  if (!user) return false
  if (cfg.all) return true
  if (cfg.emails.has(user.email.toLowerCase())) return true
  return user.roles.some((role) => cfg.roles.has(role))
}
