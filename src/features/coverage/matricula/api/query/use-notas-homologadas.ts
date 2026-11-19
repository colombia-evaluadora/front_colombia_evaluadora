import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { matriculaKeys } from "@/features/coverage/matricula/api/query-keys"
import type {
  OrigenNota,
  SnapshotHomologacion,
  TipoNotaHomologada,
} from "@/features/coverage/matricula/api/types/notas-homologadas"

// fn_matricula_notas_homologadas_listar devuelve un JSONB con los snapshots de la
// matrícula, del más reciente al más antiguo, cada uno con sus notas vigentes.
export interface RawNotaHomologada {
  pk_tmatricula_nota_homologada: number
  asignatura: string
  periodo: string
  tipo: TipoNotaHomologada
  nota: number | null
  nota_original: number | null
  valoracion: string | null
  porcentaje_cursado: number | null
  corregida: boolean
}

export interface RawSnapshot {
  pk_tmatricula_snapshot: number
  motivo: string
  fecha: string
  grupo_origen: string
  institucion_origen: string
  jornada_origen: string
  responsable_ensenanza: string
  grupo_actual: string
  confirmado_por: string
  fallas: number
  escala: { min: number; max: number; desempenos: { nombre: string; desde: number; hasta: number }[] }
  notas: RawNotaHomologada[]
}

export interface RawOrigenNota {
  grupo_origen: string
  responsable_ensenanza: string
  snapshot: string
  nota: number
  valoracion: string
  porcentaje_cursado: number | null
  actividades: { nombre: string; fecha: string; nota: number }[]
}

export const toSnapshot = (raw: RawSnapshot): SnapshotHomologacion => ({
  id: raw.pk_tmatricula_snapshot,
  motivo: raw.motivo,
  fecha: raw.fecha,
  grupoOrigen: raw.grupo_origen,
  institucionOrigen: raw.institucion_origen,
  jornadaOrigen: raw.jornada_origen,
  responsableEnsenanza: raw.responsable_ensenanza,
  grupoActual: raw.grupo_actual,
  confirmadoPor: raw.confirmado_por,
  fallas: Number(raw.fallas ?? 0),
  escala: { ...raw.escala, min: Number(raw.escala.min), max: Number(raw.escala.max) },
  notas: (raw.notas ?? []).map((n) => ({
    id: n.pk_tmatricula_nota_homologada,
    asignatura: n.asignatura,
    periodo: n.periodo,
    tipo: n.tipo,
    nota: n.nota == null ? null : Number(n.nota),
    notaOriginal: n.nota_original == null ? null : Number(n.nota_original),
    valoracion: n.valoracion,
    porcentajeCursado: n.porcentaje_cursado == null ? null : Number(n.porcentaje_cursado),
    corregida: Boolean(n.corregida),
  })),
})

const toOrigen = (raw: RawOrigenNota): OrigenNota => ({
  grupoOrigen: raw.grupo_origen,
  responsableEnsenanza: raw.responsable_ensenanza,
  snapshot: raw.snapshot,
  nota: Number(raw.nota),
  valoracion: raw.valoracion,
  porcentajeCursado: raw.porcentaje_cursado == null ? null : Number(raw.porcentaje_cursado),
  actividades: (raw.actividades ?? []).map((a) => ({ ...a, nota: Number(a.nota) })),
})

/** Pestaña Notas homologadas de Ver detalle (Sección 4.2). */
export function useNotasHomologadasQuery(matriculaId: string | undefined) {
  return useQuery({
    queryKey: matriculaKeys.notasHomologadas(matriculaId),
    queryFn: async () => {
      const row = await evalCol.getRow<{ notas_homologadas: RawSnapshot[] | null }>(
        `/cobertura-academica/matricula/${matriculaId}/notas-homologadas`,
      )
      return (row.notas_homologadas ?? []).map(toSnapshot)
    },
    enabled: Boolean(matriculaId),
  })
}

/** Actividades y notas del grupo anterior de las que sale una nota homologada. */
export function useOrigenNotaQuery(matriculaId: string | undefined, notaId: number | null) {
  return useQuery({
    queryKey: matriculaKeys.origenNota(matriculaId, notaId),
    queryFn: async () => {
      const row = await evalCol.getRow<{ origen: RawOrigenNota }>(
        `/cobertura-academica/matricula/${matriculaId}/notas-homologadas/${notaId}/origen`,
      )
      return toOrigen(row.origen)
    },
    enabled: Boolean(matriculaId) && notaId != null,
  })
}
