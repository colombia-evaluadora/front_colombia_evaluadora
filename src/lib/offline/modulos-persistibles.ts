/**
 * Decisión del líder (2026-11-23): en la app instalada (equipo personal) se
 * guarda TODO lo que la persona puede ver según su rol, también gestión
 * estudiantil, cobertura, administración y comunicaciones. El alcance lo pone
 * el backend: solo se guarda lo que ya le respondió a esa persona.
 *
 * Por raíz de la query key y por lista blanca (no "todo menos"): así nunca se
 * guardan sesión, segundo factor, tokens de archivo, verificaciones públicas
 * ni búsquedas efímeras. Una query que declara su `meta.offline` conserva la suya.
 */
import { getDeviceMode, OFFLINE_TTL, type OfflineQueryMeta } from "@/lib/offline/query-persister"

const RAICES = new Set([
  // Gestión estudiantil
  "actividades-extracurriculares", "citaciones-compromisos", "convivencia", "gestion-estudiantil",
  "inclusion", "observaciones-sugerencias", "observador", "orientacion", "piar", "prevencion",
  "reconocimientos", "reintegracion",
  // Cobertura
  "actualizacion-datos", "enrollments", "informes-reportes", "entidad-territorial", "inscripcion-configuracion", "inscripciones",
  "matricula", "matricula-complementaria", "pre-matricula", "promocion-nivelacion", "reservas-cupo", "reservations",
  // Administración
  "administradores-territoriales", "areas-oficiales", "audits", "audit-tables", "audit-operation-types", "audit-session-statuses", "bitacora",
  "conservacion-datos", "criterios-prioridad", "festivos", "listas-valor", "menus",
  "parametros-edad", "plans", "relaciones-alumno-grupo", "role-menus", "roles",
  "superadministradores", "supervisores-territoriales",
  // Establecimiento
  "academic-periods", "academic-period", "academic-calendar", "area-subjects", "academic-assignments",
  "assignment-subjects", "assignment-teachers", "campuses", "evaluation-criteria", "evaluation-periods",
  "especialidades", "grade-groups", "horario", "period-areas", "promotion-criteria", "rating-scales",
  "study-plan-available", "study-plans", "subject-details", "subjects", "teacher-assignments", "employees", "establishments", "grades",
  // Comunicaciones
  "comunicaciones-chat", "comunicado-cascada", "comunicados-gestion", "comunicados-territorial",
  "espacios", "procesos",
  // Gestión académica y planeador (lo que no declaró su meta)
  "asistencia", "informes", "planeador", "aprobaciones",
  "curricular-references", "curricular-reference", "curricular-evidences", "curricular-statements",
  "curricular-reference-grades", "curricular-reference-areas",
  // Catálogos
  "catalogs", "select-category", "sede-jornadas-activas",
])

/** Lecturas con efectos: consultar el Archivo deja registro en la Bitácora (V595); nunca se refrescan solas. */
function tieneEfectos(queryKey: readonly unknown[]): boolean {
  return queryKey[0] === "conservacion-datos" && queryKey[1] === "archivo"
}

export function esModuloPersistible(queryKey: readonly unknown[] | undefined): boolean {
  if (queryKey && tieneEfectos(queryKey)) return false
  return typeof queryKey?.[0] === "string" && RAICES.has(queryKey[0])
}

/** `meta` de la query, con la persistencia por defecto de su módulo si no declara la suya. */
export function conMetaPorDefecto<T extends { queryKey?: readonly unknown[]; meta?: Record<string, unknown> & OfflineQueryMeta }>(
  options: T,
): T {
  if (options.meta?.offline || !esModuloPersistible(options.queryKey)) return options
  return { ...options, meta: { ...options.meta, offline: { ttl: OFFLINE_TTL.roster, requierePin: true } } }
}

/**
 * En el equipo personal lo guardable no se descarta de memoria. Con el `gcTime`
 * por defecto (5 min) lo que Preparar bajaba sin pantalla abierta se borraba
 * mientras seguía la descarga: sin red, la pantalla decía "no está guardada"
 * aunque estaba en IndexedDB (solo se relee al abrir la app).
 */
export function conservarEnMemoria<T extends { gcTime?: number; meta?: Record<string, unknown> & OfflineQueryMeta }>(options: T): T {
  if (!options.meta?.offline || getDeviceMode() !== "personal" || options.gcTime === Infinity) return options
  return { ...options, gcTime: Infinity }
}
