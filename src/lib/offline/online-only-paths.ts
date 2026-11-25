/**
 * Prefijos de `/app` solo en línea. Desde la decisión del líder (2026-11-23)
 * todos los módulos del menú se consultan sin red en la app instalada
 * (`modulos-persistibles.ts`); las escrituras que no tienen cola siguen
 * necesitando conexión.
 */
export const ONLINE_ONLY_PREFIXES = [
  // Mis dispositivos: registrar o revocar equipos solo tiene sentido con el servidor.
  "/app/mis-dispositivos",
] as const

export function isOnlineOnlyPath(pathname: string): boolean {
  return ONLINE_ONLY_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

/**
 * Formularios de módulos sin cola de cambios: se abren y se consultan sin red
 * (decisión del líder: ningún "Editar" bloqueado), pero Guardar necesita
 * conexión y el banner lo avisa. Planeador, planilla y asistencia sí encolan.
 */
export function guardarNecesitaConexion(pathname: string): boolean {
  return /^\/app\/(cobertura|gestion-estudiantil|administracion|establecimiento-educativo|comunicaciones)\/(.*\/)?(agregar|nueva|nuevo|editar)(\/|$)/.test(pathname)
}
