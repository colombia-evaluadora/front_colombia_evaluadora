/**
 * Ventana de frescura por tarea de "Preparar" (`add-offline-preparar-incremental`).
 *
 * Una query que el equipo ya tiene y que se bajó (o el servidor confirmó sin
 * cambios) hace menos que su ventana NO se vuelve a pedir: ni siquiera un
 * sondeo condicional. Así "Preparar todo" justo después de otra corrida tarda
 * segundos. Pasada la ventana se sondea con `If-None-Match` (si la query tiene
 * validadores) y solo se baja si cambió.
 *
 * - Catálogos y proveedores (sedes, periodos, referentes…): una vez por día.
 * - Datos de grupo (actividades, unidades, informes, listas de estudiantes):
 *   cada 4 horas.
 * - Planilla, asistencia, notificaciones y comunicaciones: SIEMPRE se revisan
 *   (cambian durante el día), pero condicional: lo que no cambió vuelve 304.
 *
 * "Forzar todo" (Opciones del diálogo) ignora esta tabla.
 */
import type { QueryKey } from "@tanstack/react-query"

import type { OfflineQueryMeta } from "@/lib/offline/query-persister"
import { TTL_OFFLINE } from "@/lib/offline/query-meta"

const HOUR = 60 * 60 * 1000

export const PREPARE_FRESH_MS = {
  catalogo: 24 * HOUR,
  grupo: 4 * HOUR,
  siempre: 0,
} as const

/** Prefijos de key que se revisan en cada corrida (condicional). */
const SIEMPRE: readonly (readonly string[])[] = [
  ["planeador", "planilla"],
  ["asistencia"],
  ["notificaciones"],
  ["comunicaciones-chat"],
  ["comunicaciones-foros"],
]

function startsWith(queryKey: QueryKey, prefix: readonly string[]): boolean {
  return prefix.every((part, i) => queryKey[i] === part)
}

/** Cuánto (ms) sigue fresca para Preparar una query bajada/verificada. */
export function prepareFreshFor(queryKey: QueryKey, meta?: OfflineQueryMeta): number {
  if (SIEMPRE.some((prefix) => startsWith(queryKey, prefix))) return PREPARE_FRESH_MS.siempre
  const ttl = meta?.offline?.ttl
  if (ttl != null && ttl >= TTL_OFFLINE.proveedor) return PREPARE_FRESH_MS.catalogo
  return PREPARE_FRESH_MS.grupo
}
