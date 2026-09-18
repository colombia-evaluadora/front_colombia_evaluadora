import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

/**
 * `GET /planeador/unidades/:id/referente` (confirmado real, colección
 * Postman `planeador-guia-completa`, 3.1 / `planeador-flujo-unidad-
 * actividad`, paso 5) — reemplaza a `POST /referentes-curriculares/query`
 * (`useCurricularReferencesQuery`) como fuente del enfoque pedagógico de
 * una unidad: ese endpoint genérico responde 403 para `CEVAL-DOCENTE`
 * (confirmado en vivo), este, bajo el propio módulo Planeador, sí es
 * accesible al docente.
 *
 * El referente NO se elige a mano: se deriva del GRADO de la unidad → nivel
 * de enseñanza → referente de ese nivel — por eso esta ruta pide el `:id`
 * de una unidad YA EXISTENTE, no un grado suelto. Sin unidad creada
 * todavía (alta de unidad, o actividad sin unidad elegida) no hay forma de
 * consultarla; en esos casos se usa el default histórico ("Evaluativo",
 * no formativo) hasta que la unidad exista.
 *
 * Además de "¿es formativa?" (`enfoque_valor`), se mapean los enunciados
 * (nivel 1) que la unidad YA relacionó, con el `pk` de la RELACIÓN
 * (`pkTunidadEnunciado`, distinto del `pk` del enunciado): es lo que pide
 * `PATCH /planeador/unidades/enunciados/:pkTunidadEnunciado` para
 * desvincular uno cuando el docente lo saca del picker de "Derechos
 * Básicos de Aprendizaje" al editar la unidad (`unlink-enunciado-unidad.ts`).
 *
 * El árbol de EVIDENCIAS (nivel 2) para marcar en la actividad, y los
 * rótulos `nivel_1_etiqueta`/`nivel_2_etiqueta` ("Propósito"/"Imprescindible"
 * en Preescolar, "Enunciado"/"Evidencia" en Primaria), SÍ vienen en esta
 * misma respuesta — confirmados contra una respuesta real (cada enunciado
 * trae su propio array `evidencias`, y la fila trae ambas etiquetas). Antes
 * se pedían aparte, por GRADO + ASIGNATURA (`GET /planeador/referente-
 * curricular`, ver `use-referente-curricular-query.ts`) y se cruzaban
 * contra `unidad.enunciadosDba` para quedarse solo con los enunciados YA
 * adoptados — acá el propio `relacionadoConUnidad` de cada fila ya hace ese
 * filtro del lado del backend, así que no hace falta ni la segunda query ni
 * el cruce manual.
 */
interface UnidadReferenteEvidenciaRow {
  pk: number
  texto: string
}

interface UnidadReferenteEnunciadoRow {
  pk: number
  texto: string
  evidencias?: UnidadReferenteEvidenciaRow[]
  relacionadoConUnidad?: boolean
  pkTunidadEnunciado?: number | null
}

interface UnidadReferenteRow {
  referente?: { id: number } | null
  fk_referente_curricular?: number | null
  pk_referente_curricular?: number | null
  /** Nombre y finalidad del referente, tal como los captura Referente
   *  Curricular ("DBA", "Garantizar aprendizajes estructurantes…"). Los
   *  devuelve `fn_unidad_referente_detalle` (V255) desde siempre; es lo que
   *  rotula la sección de enunciados, en vez de un literal fijo. */
  referente_nombre?: string | null
  referente_descripcion?: string | null
  enfoque_valor?: "EVALUATIVO" | "FORMATIVO" | null
  es_evaluativo?: boolean | null
  tipo_evaluacion_valor?: string | null
  /** Rótulo dinámico de cada nivel del árbol — nunca hardcodear, ver el
   *  comentario de `ReferenteCurricularRow.nivel_1_etiqueta` en
   *  `use-referente-curricular-query.ts`. */
  nivel_1_etiqueta?: string | null
  nivel_2_etiqueta?: string | null
  enunciados?: UnidadReferenteEnunciadoRow[]
}

export interface UnidadReferenteEvidencia {
  id: number
  text: string
}

export interface UnidadReferenteEnunciado {
  id: number
  text: string
  evidencias: UnidadReferenteEvidencia[]
  /** `pkTunidadEnunciado` — el pk de la RELACIÓN unidad↔enunciado, no el
   *  del enunciado. Es lo que pide el `PATCH` de desvincular. */
  pkRelacion: number
}

export interface UnidadReferente {
  tieneReferente: boolean
  esFormativo: boolean
  tipoEvaluacion: string | null
  /** Rótulo y finalidad reales del referente. `null` cuando no hay referente
   *  vigente: ahí la UI cae a su texto por defecto. */
  nombre: string | null
  descripcion: string | null
  /** `pk_referente_curricular` — mismo dato y mismo uso que
   *  `ReferenteCurricular.id` (`use-referente-curricular-query.ts`):
   *  resolver el instrumento real (`instrumentoLabelFromReferente`) sin
   *  volver a pedir grado+asignatura. */
  id: number | null
  /** Default "Enunciado"/"Evidencia" cuando el backend no los manda — nunca
   *  un literal hardcodeado en la UI. */
  nivel1Etiqueta: string
  nivel2Etiqueta: string
  /** Solo los YA relacionados (`relacionadoConUnidad`) — los demás no
   *  tienen `pkTunidadEnunciado` con qué desvincularlos. */
  enunciados: UnidadReferenteEnunciado[]
}

const SIN_REFERENTE: UnidadReferente = {
  tieneReferente: false,
  esFormativo: false,
  tipoEvaluacion: null,
  nombre: null,
  descripcion: null,
  id: null,
  nivel1Etiqueta: "Enunciado",
  nivel2Etiqueta: "Evidencia",
  enunciados: [],
}

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
    nombre: row!.referente_nombre ?? null,
    descripcion: row!.referente_descripcion ?? null,
    id: row!.pk_referente_curricular ?? row!.referente?.id ?? null,
    nivel1Etiqueta: row!.nivel_1_etiqueta ?? "Enunciado",
    nivel2Etiqueta: row!.nivel_2_etiqueta ?? "Evidencia",
    enunciados: (row!.enunciados ?? [])
      .filter((e) => e.relacionadoConUnidad && e.pkTunidadEnunciado != null)
      .map((e) => ({
        id: e.pk,
        text: e.texto,
        evidencias: (e.evidencias ?? []).map((evidencia) => ({ id: evidencia.pk, text: evidencia.texto })),
        pkRelacion: e.pkTunidadEnunciado!,
      })),
  }
}

export const unidadReferenteQueryKey = (unidadId: number) =>
  ["planeador", "unidad", unidadId, "referente"] as const

/** Misma forma "objeto suelto, no `{rows}`" confirmada para
 *  `/referente-curricular` — se tolera igual acá por si esta ruta hermana
 *  comparte el mismo comportamiento (ver el comentario de `firstRow` en
 *  `use-referente-curricular-query.ts`). */
function firstRow(body: unknown): UnidadReferenteRow | undefined {
  if (Array.isArray(body)) return body[0] as UnidadReferenteRow | undefined
  if (body != null && typeof body === "object" && "rows" in body) {
    const rows = (body as { rows?: unknown }).rows
    return Array.isArray(rows) ? (rows[0] as UnidadReferenteRow | undefined) : undefined
  }
  return body as UnidadReferenteRow | undefined
}

async function fetchUnidadReferente(unidadId: number): Promise<UnidadReferente> {
  const body = await api.get(`/eval-col/planeador/unidades/${unidadId}/referente`)
  return toUnidadReferente(firstRow(body))
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
