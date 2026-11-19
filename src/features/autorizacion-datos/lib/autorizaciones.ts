import type {
  AutorizacionEstablecimiento,
  AutorizacionPendiente,
} from "@/features/autorizacion-datos/api/types"

/** Normaliza lo que llega del backend: ids numéricos y `autorizado` booleano estricto. */
export function toAutorizaciones(rows: unknown): AutorizacionEstablecimiento[] {
  if (!Array.isArray(rows)) return []
  return rows
    .filter((r): r is Record<string, unknown> => r != null && typeof r === "object")
    .map((r) => ({
      establecimientoId: Number(r.establecimientoId),
      establecimiento: String(r.establecimiento ?? ""),
      autorizado: r.autorizado === true,
    }))
    .filter((a) => Number.isFinite(a.establecimientoId))
}

/** Establecimientos que todavía no tienen la autorización. */
export const pendientesDe = (autorizaciones: AutorizacionEstablecimiento[] | null | undefined) =>
  (autorizaciones ?? []).filter((a) => !a.autorizado)

export const tienePendientes = (autorizaciones: AutorizacionEstablecimiento[] | null | undefined) =>
  pendientesDe(autorizaciones).length > 0

/** "IE Central, IE Norte y IE Sur": para "Quedaron autorizados: …". */
export function listarNombres(nombres: string[]): string {
  const limpios = nombres.map((n) => n.trim()).filter(Boolean)
  if (limpios.length <= 1) return limpios[0] ?? ""
  return `${limpios.slice(0, -1).join(", ")} y ${limpios.at(-1)}`
}

/** Mensaje de U.3.EST.1d con los establecimientos que acaban de quedar autorizados. */
export function mensajeAutorizados(
  antes: AutorizacionEstablecimiento[],
  despues: AutorizacionEstablecimiento[],
  pedidos: number[],
): string {
  const yaEstaban = new Set(antes.filter((a) => a.autorizado).map((a) => a.establecimientoId))
  const nuevos = despues.filter(
    (a) => a.autorizado && pedidos.includes(a.establecimientoId) && !yaEstaban.has(a.establecimientoId),
  )
  const nombres = (nuevos.length ? nuevos : despues.filter((a) => pedidos.includes(a.establecimientoId))).map(
    (a) => a.establecimiento,
  )
  return `Quedaron autorizados: ${listarNombres(nombres)}.`
}

/** Fila de autorizaciones-pendientes: tolera `inscripcion_id` por si el back cambia de convención. */
export function toAutorizacionPendiente(row: Record<string, unknown>): AutorizacionPendiente {
  const inscripcionId = row.inscripcionId ?? row.inscripcion_id
  return {
    tipo: row.tipo === "FUNCIONARIO" ? "FUNCIONARIO" : "INSCRIPCION",
    inscripcionId: inscripcionId == null ? null : Number(inscripcionId),
    numero: row.numero == null ? null : String(row.numero),
    aspirante: row.aspirante == null ? null : String(row.aspirante),
    establecimientos: toAutorizaciones(row.establecimientos),
  }
}

/** Clave estable de una fila pendiente (la de funcionario no tiene inscripción). */
export const clavePendiente = (p: AutorizacionPendiente) =>
  p.tipo === "FUNCIONARIO" ? "funcionario" : `inscripcion-${p.inscripcionId}`
