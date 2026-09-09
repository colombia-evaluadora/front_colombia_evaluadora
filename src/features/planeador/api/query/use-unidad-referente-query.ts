import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

/**
 * `GET /planeador/unidades/:id/referente` (confirmado real, colección
 * Postman `planeador-guia-completa`, 3.1) — reemplaza a
 * `POST /referentes-curriculares/query` (`useCurricularReferencesQuery`)
 * como fuente del enfoque pedagógico de una unidad: ese endpoint genérico
 * responde 403 para `CEVAL-DOCENTE` (confirmado en vivo), este, bajo el
 * propio módulo Planeador, sí es accesible al docente.
 *
 * El referente NO se elige a mano: se deriva del GRADO de la unidad → nivel
 * de enseñanza → referente de ese nivel — por eso esta ruta pide el `:id`
 * de una unidad YA EXISTENTE, no un grado suelto. Sin unidad creada
 * todavía (alta de unidad, o actividad sin unidad elegida) no hay forma de
 * consultarla; en esos casos se usa el default histórico ("Evaluativo",
 * no formativo) hasta que la unidad exista.
 *
 * Solo se mapea acá lo que hace falta para "¿es formativa?" (`enfoque_valor`).
 * El árbol de enunciados/evidencias para marcar en la actividad NO sale de
 * acá: sale de `GET /planeador/referente-curricular` (grado + asignatura),
 * confirmado con una respuesta real — ver `use-referente-curricular-
 * query.ts` y `EnunciadosEvidenciasChecklist`.
 */
interface UnidadReferenteRow {
  referente?: { id: number } | null
  fk_referente_curricular?: number | null
  enfoque_valor?: "EVALUATIVO" | "FORMATIVO" | null
  es_evaluativo?: boolean | null
  tipo_evaluacion_valor?: string | null
}

export interface UnidadReferente {
  tieneReferente: boolean
  esFormativo: boolean
  tipoEvaluacion: string | null
}

const SIN_REFERENTE: UnidadReferente = { tieneReferente: false, esFormativo: false, tipoEvaluacion: null }

function toUnidadReferente(row: UnidadReferenteRow | undefined): UnidadReferente {
  const tieneReferente =
    row != null &&
    (row.referente != null ||
      row.fk_referente_curricular != null ||
      row.enfoque_valor != null ||
      row.es_evaluativo != null)
  if (!tieneReferente) return SIN_REFERENTE
  // Misma tolerancia a las dos banderas que `use-referente-curricular-
  // query.ts` (3.0): esta ruta (3.1) documenta el mismo par
  // `enfoque_valor`/`es_evaluativo`, y una unidad real puede traer solo
  // `es_evaluativo` — quedarse solo con `enfoque_valor` dejaba `esFormativo`
  // en `false` para esas respuestas y el "¿Es evaluación sumativa?" nunca
  // se bloqueaba ni se autocorregía.
  const esFormativo =
    typeof row!.es_evaluativo === "boolean" ? !row!.es_evaluativo : row!.enfoque_valor === "FORMATIVO"
  return {
    tieneReferente: true,
    esFormativo,
    tipoEvaluacion: row!.tipo_evaluacion_valor ?? null,
  }
}

export const unidadReferenteQueryKey = (unidadId: number) =>
  ["planeador", "unidad", unidadId, "referente"] as const

async function fetchUnidadReferente(unidadId: number): Promise<UnidadReferente> {
  const rows = await evalCol.getRows<UnidadReferenteRow>(`/planeador/unidades/${unidadId}/referente`)
  return toUnidadReferente(rows[0])
}

export function useUnidadReferenteQuery(unidadId: number | undefined) {
  return useQuery({
    queryKey:
      unidadId != null ? unidadReferenteQueryKey(unidadId) : (["planeador", "unidad", "none", "referente"] as const),
    queryFn: () => fetchUnidadReferente(unidadId!),
    enabled: unidadId != null,
    staleTime: 1000 * 60,
  })
}
