/**
 * Quién decide si este equipo guarda datos para trabajar sin conexión
 * ("personal") o no guarda nada ("compartido"), y qué pasa al cerrar sesión
 * (`openspec/changes/add-offline-meses-pwa`, D-12).
 *
 * Default revisable (P6 sigue pendiente): **la app INSTALADA es un equipo
 * personal**. Nadie instala la PWA de su institución en un computador de sala
 * compartida, y el docente que la instala lo hace justamente para trabajar
 * meses sin red: en ella no se ofrece "Este es un equipo compartido", no se
 * exige estar en la lista del piloto (`VITE_APP_OFFLINE_PILOT`) y cerrar
 * sesión NO borra lo guardado (bloquea la app). El kill-switch
 * `VITE_APP_OFFLINE=off` (o el flag remoto) sigue mandando: con `off` la app
 * instalada vuelve a las reglas del navegador.
 *
 * En la pestaña del navegador (no instalada) todo sigue como antes: piloto,
 * checkbox y logout que borra los datos del usuario.
 */
import { getOfflineMode } from "@/lib/offline/offline-mode"
import { canChoosePersonalDevice, isOfflinePilotUser } from "@/lib/offline/pilot"
import { isInstalledPwa } from "@/lib/offline/storage-status"

/** La app instalada, con el modo offline encendido: equipo personal automático. */
export function isInstalledPersonalDevice(): boolean {
  return getOfflineMode() !== "off" && isInstalledPwa()
}

/** Antes del login (solo se conoce el correo escrito): ¿puede ser equipo personal? */
export function canUsePersonalDevice(email: string): boolean {
  return isInstalledPersonalDevice() || canChoosePersonalDevice(email)
}

/** Verificación definitiva con el usuario del token. */
export function isPersonalDeviceAllowed(user: { email: string; roles: string[] } | null | undefined): boolean {
  if (!user) return false
  return isInstalledPersonalDevice() || isOfflinePilotUser(user)
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
