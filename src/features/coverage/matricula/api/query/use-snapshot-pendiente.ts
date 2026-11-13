import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { matriculaKeys } from "@/features/coverage/matricula/api/query-keys"
import type { SnapshotPendiente } from "@/features/coverage/matricula/api/types/notas-homologadas"

// fn_matricula_snapshot_pendiente: el snapshot de traslado sin homologar, o null.
export interface RawSnapshotPendiente {
  pk_tmatricula_snapshot: number
  motivo: string
  fecha: string
  grupo_origen: string
  institucion_origen: string
  escala_distinta: boolean
  periodos_pendientes: string[]
  asignaturas_plan: number
  periodos_destino: { id: number; nombre: string }[]
  asignaturas_destino: { id: number; nombre: string }[]
  periodos: { origen: string; destino: number | null }[]
  asignaturas: { origen: string; destino: number | null }[]
}

const toSnapshotPendiente = (raw: RawSnapshotPendiente): SnapshotPendiente => ({
  id: raw.pk_tmatricula_snapshot,
  motivo: raw.motivo,
  fecha: raw.fecha,
  grupoOrigen: raw.grupo_origen,
  institucionOrigen: raw.institucion_origen,
  escalaDistinta: Boolean(raw.escala_distinta),
  periodosPendientes: raw.periodos_pendientes ?? [],
  asignaturasPlan: Number(raw.asignaturas_plan ?? 0),
  periodosDestino: (raw.periodos_destino ?? []).map((p) => ({ id: Number(p.id), nombre: p.nombre })),
  asignaturasDestino: (raw.asignaturas_destino ?? []).map((a) => ({ id: Number(a.id), nombre: a.nombre })),
  periodos: (raw.periodos ?? []).map((p) => ({ origen: p.origen, destino: p.destino == null ? null : Number(p.destino) })),
  asignaturas: (raw.asignaturas ?? []).map((a) => ({ origen: a.origen, destino: a.destino == null ? null : Number(a.destino) })),
})

/** Lo usa también el alta, justo después de guardar, para preguntar si se homologa. */
export async function fetchSnapshotPendiente(matriculaId: string | number): Promise<SnapshotPendiente | null> {
  const row = await evalCol.getRow<{ snapshot: RawSnapshotPendiente | null }>(
    `/cobertura-academica/matricula/${matriculaId}/snapshot-pendiente`,
  )
  return row.snapshot ? toSnapshotPendiente(row.snapshot) : null
}

export function useSnapshotPendienteQuery(matriculaId: string | undefined) {
  return useQuery({
    queryKey: matriculaKeys.snapshotPendiente(matriculaId),
    queryFn: () => fetchSnapshotPendiente(String(matriculaId)),
    enabled: Boolean(matriculaId),
  })
}
