/**
 * Helpers para declarar `meta.offline` (tarea 2.3). El contrato y la
 * augmentación de `Register.queryMeta` viven en `query-persister.ts`; acá solo
 * se fijan los TTL por clase de dato (plan §8) y la minimización de datos de
 * estudiantes (`persistSelect`, §0.3 / C-72).
 */
import { OFFLINE_TTL, type OfflineQueryMeta } from "@/lib/offline/query-persister"

const DAY = 24 * 60 * 60 * 1000

/** TTL por clase de dato (plan §8). Pasado el TTL, el dato se muestra en rojo. */
export const TTL_OFFLINE = {
  /** Catálogos genéricos (`TLISTA_VALOR`, catálogos del planeador, referentes). */
  catalogo: OFFLINE_TTL.catalog,
  /** Proveedores de establecimiento/periodos (sedes, grados, asignaturas…), §8.6. */
  proveedor: 14 * DAY,
  /** Datos de grupo: actividades, unidades, planilla, asistencia, rosters. */
  grupo: OFFLINE_TTL.roster,
  /** Detalles puntuales que no se preparan (se persisten si fueron visitados). */
  detalle: OFFLINE_TTL.detail,
} as const

export type AppQueryMeta = Record<string, unknown> & OfflineQueryMeta

/** Atajo para declarar `meta` en una query persistible. */
export function offlineMeta(ttl: number, options: { persistSelect?: (data: unknown) => unknown } = {}): AppQueryMeta {
  const meta: AppQueryMeta = { offline: { ttl } }
  if (options.persistSelect) meta.persistSelect = options.persistSelect
  return meta
}

export const catalogoMeta = () => offlineMeta(TTL_OFFLINE.catalogo)
export const proveedorMeta = () => offlineMeta(TTL_OFFLINE.proveedor)

/**
 * Claves que nunca se persisten en datos de estudiantes: documento, contacto,
 * dirección, acudiente y salud. Se comparan en minúsculas y por substring, así
 * cubren `documento`, `numero_documento`, `correo_acudiente`, `telefonoMovil`…
 */
const SENSITIVE_KEY_PARTS = [
  "documento",
  "identificacion",
  "telefono",
  "celular",
  "correo",
  "email",
  "direccion",
  "acudiente",
  "salud",
  "eps",
  "discapacidad",
  "diagnostico",
  "nacimiento",
] as const

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase()
  // `eps` es corto: solo como palabra completa (`eps`, `fk_eps`), no dentro de `steps`.
  return SENSITIVE_KEY_PARTS.some((part) =>
    part === "eps" ? /(^|_)eps($|_)/.test(lower) : lower.includes(part),
  )
}

/**
 * `persistSelect` genérico para respuestas con estudiantes: recorre objetos y
 * arrays y elimina las claves sensibles, conservando pk, nombre y los campos
 * de la pantalla (asistencia, calificación…). No muta `data`.
 */
export function minimizeStudentData(data: unknown): unknown {
  if (Array.isArray(data)) return data.map(minimizeStudentData)
  if (data === null || typeof data !== "object") return data
  if (data instanceof Date) return data
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    if (isSensitiveKey(key)) continue
    out[key] = minimizeStudentData(value)
  }
  return out
}

/** Meta para queries con datos de estudiantes (roster, planilla…). */
export const estudiantesMeta = (ttl: number = TTL_OFFLINE.grupo) =>
  offlineMeta(ttl, { persistSelect: minimizeStudentData })
