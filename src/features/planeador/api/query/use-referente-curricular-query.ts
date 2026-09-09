import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { UnidadReferente } from "@/features/planeador/api/query/use-unidad-referente-query"

/**
 * `GET /planeador/referente-curricular?grado=&asignatura=` (confirmado
 * real, colección Postman `planeador-guia-completa`, 3.0) — el mismo árbol
 * que `GET /unidades/:id/referente` (3.1), pero derivable de GRADO +
 * ASIGNATURA directo, SIN que exista una unidad todavía. Sirve para
 * "¿es formativa?" en una actividad huérfana (sin unidad) o antes de crear
 * la unidad: `useUnidadReferenteQuery` por sí solo asumía "no formativa"
 * en ese caso por no tener de dónde derivarlo — esta ruta es justamente
 * ese "de dónde".
 *
 * Devuelve un ARRAY (la relación referente↔nivel es N:N), ya ordenado por
 * especificidad: los acotados al área de la asignatura primero
 * (`especificidad` 0), los universales después (1) — se usa el primero sin
 * volver a ordenar acá. `?asignatura=` es opcional (filtra por área, no es
 * llave) pero se manda siempre que se conozca: sin ella se devuelven todos
 * los referentes del nivel de enseñanza, no solo el del área que aplica.
 *
 * La descripción de 3.0 documenta las mismas dos banderas que 3.1
 * (`enfoque_valor`/`es_evaluativo`) — acá se tolera cualquiera de las dos
 * formas por si esta ruta solo expone una.
 */
interface ReferenteEvidenciaRow {
  pk: number
  texto: string
}

interface ReferenteEnunciadoRow {
  pk: number
  texto: string
  evidencias?: ReferenteEvidenciaRow[]
}

interface ReferenteCurricularRow {
  pk_referente_curricular?: number
  especificidad?: number
  es_evaluativo?: boolean
  enfoque_valor?: "EVALUATIVO" | "FORMATIVO" | null
  tipo_evaluacion_valor?: string | null
  /** Confirmado contra una respuesta real: el texto de cada enunciado (y de
   *  cada evidencia anidada) viene en `texto`, no `nombre`/`descripcion`. */
  enunciados?: ReferenteEnunciadoRow[]
}

export interface ReferenteEvidencia {
  id: number
  text: string
}

export interface ReferenteEnunciado {
  id: number
  text: string
  evidencias: ReferenteEvidencia[]
}

export interface ReferenteCurricular extends UnidadReferente {
  enunciados: ReferenteEnunciado[]
}

const SIN_REFERENTE: ReferenteCurricular = {
  tieneReferente: false,
  esFormativo: false,
  tipoEvaluacion: null,
  enunciados: [],
}

function toReferente(row: ReferenteCurricularRow | undefined): ReferenteCurricular {
  if (!row) return SIN_REFERENTE
  const esFormativo =
    typeof row.es_evaluativo === "boolean" ? !row.es_evaluativo : row.enfoque_valor === "FORMATIVO"
  return {
    tieneReferente: true,
    esFormativo,
    tipoEvaluacion: row.tipo_evaluacion_valor ?? null,
    enunciados: (row.enunciados ?? []).map((enunciado) => ({
      id: enunciado.pk,
      text: enunciado.texto,
      evidencias: (enunciado.evidencias ?? []).map((evidencia) => ({
        id: evidencia.pk,
        text: evidencia.texto,
      })),
    })),
  }
}

export const referenteCurricularQueryKey = (gradoId: number, asignaturaId: number | undefined) =>
  ["planeador", "referente-curricular", gradoId, asignaturaId ?? null] as const

async function fetchReferenteCurricular(
  gradoId: number,
  asignaturaId: number | undefined,
): Promise<ReferenteCurricular> {
  const query = new URLSearchParams({ grado: String(gradoId) })
  if (asignaturaId != null) query.set("asignatura", String(asignaturaId))
  const rows = await evalCol.getRows<ReferenteCurricularRow>(`/planeador/referente-curricular?${query}`)
  return toReferente(rows[0])
}

/**
 * `gradoId` en `undefined` deshabilita la consulta — así el llamador puede
 * apagarla sin condicional propio cuando ya tiene el referente por otra vía
 * (p. ej. `useUnidadReferenteQuery` cuando sí hay unidad elegida).
 */
export function useReferenteCurricularQuery(gradoId: number | undefined, asignaturaId: number | undefined) {
  return useQuery({
    queryKey:
      gradoId != null
        ? referenteCurricularQueryKey(gradoId, asignaturaId)
        : (["planeador", "referente-curricular", "none"] as const),
    queryFn: () => fetchReferenteCurricular(gradoId!, asignaturaId),
    enabled: gradoId != null,
    staleTime: 1000 * 60,
    // Sin esto, cambiar de Asignatura hace que `data` pase por `undefined`
    // mientras se resuelve la nueva — y como el default de "¿es
    // formativo?" es `false`, la pestaña "Rúbricas" parpadeaba (aparecía
    // con el default y desaparecía de nuevo apenas llegaba el dato real).
    // Mantener el anterior visible evita ese flash intermedio.
    placeholderData: (previousData) => previousData,
  })
}
