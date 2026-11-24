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
import { OFFLINE_TTL, type OfflineQueryMeta } from "@/lib/offline/query-persister"

const RAICES = new Set([
  // Gestión estudiantil
  "actividades-extracurriculares", "citaciones-compromisos", "convivencia", "gestion-estudiantil",
  "inclusion", "observaciones-sugerencias", "observador", "orientacion", "piar", "prevencion",
  "reconocimientos", "reintegracion",
  // Cobertura
  "actualizacion-datos", "enrollments", "entidad-territorial", "inscripcion-configuracion", "inscripciones",
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
  "catalogs", "select-category",
])

export function esModuloPersistible(queryKey: readonly unknown[] | undefined): boolean {
  return typeof queryKey?.[0] === "string" && RAICES.has(queryKey[0])
}

/** `meta` de la query, con la persistencia por defecto de su módulo si no declara la suya. */
export function conMetaPorDefecto<T extends { queryKey?: readonly unknown[]; meta?: Record<string, unknown> & OfflineQueryMeta }>(
  options: T,
): T {
  if (options.meta?.offline || !esModuloPersistible(options.queryKey)) return options
  return { ...options, meta: { ...options.meta, offline: { ttl: OFFLINE_TTL.roster } } }
}
