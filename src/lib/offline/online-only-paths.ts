/**
 * Prefijos de `/app` que son **solo en línea** (plan offline §8.3–8.6 y §8.11):
 * cobertura, auditoría, roles-menús y establecimiento (general, sedes,
 * funcionarios, alta/edición de EE, periodos). Nada de esto se persiste, así
 * que sin red no hay qué mostrar.
 */
export const ONLINE_ONLY_PREFIXES = [
  "/app/cobertura",
  "/app/registro-de-actividad",
  "/app/administracion/roles-menus",
  "/app/establecimiento-educativo",
] as const

export function isOnlineOnlyPath(pathname: string): boolean {
  return ONLINE_ONLY_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}
