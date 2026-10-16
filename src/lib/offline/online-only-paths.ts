/**
 * Prefijos de `/app` que son **solo en línea** (plan offline §8.3–8.6 y §8.11):
 * cobertura, auditoría, roles-menús, áreas oficiales, criterios de prioridad y establecimiento (general, sedes,
 * funcionarios, alta/edición de EE, periodos). Nada de esto se persiste, así
 * que sin red no hay qué mostrar.
 */
export const ONLINE_ONLY_PREFIXES = [
  "/app/cobertura",
  "/app/registro-de-actividad",
  "/app/administracion/roles-menus",
  "/app/administracion/areas-oficiales",
  "/app/administracion/criterios-prioridad",
  "/app/establecimiento-educativo",
] as const

/**
 * Excepciones de **solo consulta** dentro de un prefijo solo en línea (Fase 4,
 * `add-offline-rest`): la lista de periodos y la edición de un periodo, donde
 * viven los tabs de horario y asignaciones académicas que el docente consulta
 * en el aula. Sus queries ya se persisten (`proveedorMeta`); las escrituras de
 * esos tabs siguen deshabilitadas sin red con `useOnlineOnly`. Agregar un
 * periodo (`/periodos/agregar`) sigue siendo solo en línea.
 */
const READ_ONLY_OFFLINE_PATTERNS = [
  /^\/app\/establecimiento-educativo\/periodos\/?$/,
  /^\/app\/establecimiento-educativo\/periodos\/[^/]+\/editar\/?$/,
] as const

export function isReadOnlyOfflinePath(pathname: string): boolean {
  if (pathname.startsWith("/app/establecimiento-educativo/periodos/agregar")) return false
  return READ_ONLY_OFFLINE_PATTERNS.some((re) => re.test(pathname))
}

export function isOnlineOnlyPath(pathname: string): boolean {
  if (isReadOnlyOfflinePath(pathname)) return false
  return ONLINE_ONLY_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}
