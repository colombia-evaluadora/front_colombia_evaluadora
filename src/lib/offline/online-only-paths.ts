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

/**
 * Formularios de módulos sin cola de cambios: abrirlos sin red dejaba llenar
 * todo para fallar al guardar. Se consultan sus datos, pero crear y modificar
 * necesitan conexión. (Planeador, planilla y asistencia sí encolan.)
 */
const FORMULARIO_SIN_COLA =
  /^\/app\/(cobertura|gestion-estudiantil|administracion|establecimiento-educativo|comunicaciones)\/(.*\/)?(agregar|nueva|nuevo|editar)(\/|$)/

/** Edición de periodo: ahí viven horario y asignaciones, de solo consulta sin red. */
const EDITAR_PERIODO = /^\/app\/establecimiento-educativo\/periodos\/[^/]+\/editar\/?$/

export function isReadOnlyOfflinePath(pathname: string): boolean {
  return EDITAR_PERIODO.test(pathname)
}

export function isOnlineOnlyPath(pathname: string): boolean {
  if (isReadOnlyOfflinePath(pathname)) return false
  if (FORMULARIO_SIN_COLA.test(pathname)) return true
  return ONLINE_ONLY_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}
