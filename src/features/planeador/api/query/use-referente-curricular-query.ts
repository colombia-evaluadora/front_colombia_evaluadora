import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import type { UnidadReferente } from "@/features/planeador/api/query/use-unidad-referente-query"

/**
 * `GET /planeador/referente-curricular?grado=&asignatura=` (confirmado
 * real, colección Postman `planeador-guia-completa`, 3.0) — mismo árbol y
 * mismas banderas que `GET /unidades/:id/referente` (3.1,
 * `use-unidad-referente-query.ts`), pero resoluble desde GRADO+ASIGNATURA
 * sin que exista todavía una unidad: mientras se está creando (o editando
 * antes de guardar) el form solo tiene lo que el docente ya eligió en los
 * selects, no un `:id` contra el que pedir 3.1.
 *
 * Devuelve un ARREGLO ordenado por `especificidad` (los referentes
 * acotados al área de la asignatura primero, los universales después) —
 * el primero de la lista es el que aplica; nunca hay que elegir "a mano"
 * cuál usar.
 */
interface ReferenteCurricularRow {
  pk_referente_curricular?: number
  /** A diferencia de 3.1 (`enfoque_valor: "EVALUATIVO" | "FORMATIVO"`), acá
   *  el enfoque llega como booleano directo. */
  es_evaluativo?: boolean
  tipo_evaluacion_valor?: string | null
}

const SIN_REFERENTE: UnidadReferente = {
  tieneReferente: false,
  esFormativo: false,
  tipoEvaluacion: null,
}

function toUnidadReferente(rows: ReferenteCurricularRow[]): UnidadReferente {
  const row = rows[0]
  if (!row) return SIN_REFERENTE
  return {
    tieneReferente: true,
    esFormativo: row.es_evaluativo === false,
    tipoEvaluacion: row.tipo_evaluacion_valor ?? null,
  }
}

export interface UseReferenteCurricularParams {
  gradoId: number
  asignaturaId?: number
}

export const referenteCurricularQueryKey = (params: UseReferenteCurricularParams) =>
  ["planeador", "referente-curricular", params] as const

async function fetchReferenteCurricular(
  params: UseReferenteCurricularParams,
): Promise<UnidadReferente> {
  const query = new URLSearchParams({ grado: String(params.gradoId) })
  if (params.asignaturaId != null) query.set("asignatura", String(params.asignaturaId))
  const rows = await evalCol.getRows<ReferenteCurricularRow>(
    `/planeador/referente-curricular?${query}`,
  )
  return toUnidadReferente(rows)
}

/**
 * `asignaturaId` es opcional (solo acota por área); `gradoId` es
 * obligatorio — sin grado no hay nivel de enseñanza del que derivar nada.
 */
export function useReferenteCurricularQuery(
  gradoId: number | undefined,
  asignaturaId: number | undefined,
) {
  const params: UseReferenteCurricularParams | null = gradoId != null ? { gradoId, asignaturaId } : null
  return useQuery({
    queryKey: params
      ? referenteCurricularQueryKey(params)
      : (["planeador", "referente-curricular", "none"] as const),
    queryFn: () => fetchReferenteCurricular(params!),
    enabled: params !== null,
    staleTime: 1000 * 60,
  })
}
