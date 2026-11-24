/**
 * Quién decide si este equipo guarda datos para trabajar sin conexión
 * ("personal") o no guarda nada ("compartido"), y qué pasa al cerrar sesión
 * (`openspec/changes/add-offline-meses-pwa`, D-12).
 *
 * Decisión del líder (2026-11): **la app INSTALADA es el equipo personal y la
 * web en una pestaña del navegador es un equipo compartido**. Ya no se
 * pregunta "Este es un equipo compartido" al iniciar sesión ni se usa la
 * lista del piloto (`VITE_APP_OFFLINE_PILOT`): la detección es una sola
 * (`install-detection.ts`). En la pestaña no se guarda nada y cerrar sesión
 * borra lo local; en la app instalada se guarda y cerrar sesión NO borra
 * (bloquea la app). El kill-switch `VITE_APP_OFFLINE=off` (o el flag remoto)
 * sigue mandando: con `off` la app instalada se comporta como la pestaña.
 */
import { getOfflineMode } from "@/lib/offline/offline-mode"
import { isInstalledPwa } from "@/lib/offline/install-detection"

/** La app instalada, con el modo offline encendido: equipo personal automático. */
export function isInstalledPersonalDevice(): boolean {
  return getOfflineMode() !== "off" && isInstalledPwa()
}

/** Antes del login: ¿este equipo es personal? (el correo ya no influye). */
export function canUsePersonalDevice(_email?: string): boolean {
  return isInstalledPersonalDevice()
}

/** Verificación con el usuario del token: solo la app instalada es personal. */
export function isPersonalDeviceAllowed(user: { email: string; roles: string[] } | null | undefined): boolean {
  if (!user) return false
  return isInstalledPersonalDevice()
}

/**
 * ¿Cerrar sesión conserva los datos del equipo? Solo en la app instalada como
 * equipo personal: un docente que cierra sesión por error sin red perdería
 * meses de datos preparados sin forma de volver a bajarlos. Ahí el logout
 * bloquea (para volver a entrar hace falta la contraseña o el PIN) y borrar
 * es una acción aparte y explícita ("Borrar los datos de este equipo").
 */
export function logoutKeepsDeviceData(deviceMode: "personal" | "compartido"): boolean {
  return deviceMode === "personal" && isInstalledPersonalDevice()
}
