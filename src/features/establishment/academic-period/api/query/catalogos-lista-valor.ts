import { useQueries, useQuery, type UseQueryResult } from "@tanstack/react-query"

import type { AcademicPeriodStatus, AcademicPeriodStatusOption } from "@/features/establishment/academic-period/api/types/academic-period"
import type { EvaluationCriteriaOptions } from "@/features/establishment/academic-period/api/types/evaluation-criteria"
import type { EvaluationPeriodStatus, EvaluationPeriodStatusOption } from "@/features/establishment/academic-period/api/types/evaluation-period"
import type { Jornada } from "@/features/establishment/academic-period/api/types/jornada"
import type { MetodologiaOption } from "@/features/establishment/academic-period/api/types/metodologia"
import type { RatingScaleType, RatingScaleTypeOption, RatingSymbol } from "@/features/establishment/academic-period/api/types/rating-scales"
import { selectCategoryQueryOptions, type SelectCategoryRow } from "@/features/establishment/academic-period/api/query/fetch-select-category"

// ---- Una categoría ----

const toJornadas = (rows: SelectCategoryRow[]): Jornada[] =>
  rows.map((row) => ({ id: row.pk_lista_valor, name: row.nombre }))

export function useJornadasQuery() {
  return useQuery({ ...selectCategoryQueryOptions("JORNADA"), select: toJornadas })
}

const toMetodologias = (rows: SelectCategoryRow[]): MetodologiaOption[] =>
  rows.map((row) => ({ key: row.valor, label: row.nombre }))

export function useMetodologiasQuery() {
  return useQuery({ ...selectCategoryQueryOptions("MODELO_PEDAGOGICO"), select: toMetodologias })
}

// `key` es el VALOR: lo que guarda `RatingScale.tipo`.
const toRatingScaleTypes = (rows: SelectCategoryRow[]): RatingScaleTypeOption[] =>
  rows.map((row) => ({ key: row.valor as RatingScaleType, label: row.nombre }))

export function useRatingScaleTypesQuery() {
  return useQuery({ ...selectCategoryQueryOptions("TIPO_VALORACION"), select: toRatingScaleTypes })
}

const toAcademicPeriodStatuses = (rows: SelectCategoryRow[]): AcademicPeriodStatusOption[] =>
  rows.map((row) => ({ id: row.pk_lista_valor, key: row.valor as AcademicPeriodStatus, label: row.nombre }))

export function useAcademicPeriodStatusesQuery() {
  return useQuery({ ...selectCategoryQueryOptions("ESTADOPERIODO"), select: toAcademicPeriodStatuses })
}

const toEvaluationPeriodStatuses = (rows: SelectCategoryRow[]): EvaluationPeriodStatusOption[] =>
  rows.map((row) => ({ id: row.pk_lista_valor, key: row.valor as EvaluationPeriodStatus, label: row.nombre }))

export function useEvaluationPeriodStatusesQuery() {
  return useQuery({ ...selectCategoryQueryOptions("ESTADOPERIODOEVALUACION"), select: toEvaluationPeriodStatuses })
}

// `fn_grado_crear` valida el nombre del grado contra este catálogo.
export interface GradoCatalogOption {
  id: number
  valor: string
  nombre: string
}

// Orden por VALOR con `numeric` para que "10" no quede antes de "2".
const gradoOrderCollator = new Intl.Collator("es", { numeric: true })

const toGradosCatalog = (rows: SelectCategoryRow[]): GradoCatalogOption[] =>
  rows
    .map((row) => ({ id: row.pk_lista_valor, valor: row.valor, nombre: row.nombre }))
    .sort((a, b) => gradoOrderCollator.compare(a.valor, b.valor))

export function useGradosCatalogQuery() {
  return useQuery({ ...selectCategoryQueryOptions("GRADOS"), select: toGradosCatalog })
}

// ---- Íconos de valoración: la Iconografía (lista ICONOGRAFIA) ----
// VALOR es la clave S3 del archivo; el back la entrega en el ORDEN que se fijó
// arrastrando en Administración, así que no se reordena aquí.

const toSymbols = (rows: SelectCategoryRow[]): RatingSymbol[] =>
  rows.map((row) => ({
    id: String(row.pk_lista_valor),
    categoria: "iconografia",
    kind: "imagen",
    valor: row.valor,
    label: row.nombre,
  }))

export function useRatingSymbolsQuery() {
  return useQuery({ ...selectCategoryQueryOptions("ICONOGRAFIA"), select: toSymbols })
}

// ---- Opciones de criterios de evaluación ----

// Categoría de cada `FK_TLV_*` de TCRITERIO_EVALUACION. `initialGrade` y
// `maxRecoveryGrade` no son catálogos: quedan vacías.
const CATEGORY_BY_FIELD = {
  gradingFormat: "FORMATO_CALIFICACION",
  periodCalculationElements: "ELEMENTO_CALCULO_DEF",
  subjectGradeCriteria: "TIPO_CALCULO",
  finalGradeCriteria: "CRITERIO_FINAL_PERACA",
  areaGradeCriteria: "CRITERIO_AREA",
  studentWithoutGradesPerformance: "DESEMPENIOSUGERIR",
  roundingMode: "MODO_REDONDEAR",
  ratingScaleMode: "ESCALA_VALORACION",
  recoveryMode: "MODO_RECUPERACION",
} as const

const criteriaEntries = Object.entries(CATEGORY_BY_FIELD) as [keyof typeof CATEGORY_BY_FIELD, string][]

function combineCriteriaOptions(results: UseQueryResult<SelectCategoryRow[]>[]) {
  const isPending = results.some((r) => r.isPending)
  if (isPending) return { isPending, data: undefined }
  const data = {} as EvaluationCriteriaOptions
  criteriaEntries.forEach(([field], index) => {
    // El form guarda el FK (BIGINT en el back) como string.
    data[field] = (results[index].data ?? []).map((row) => ({ key: String(row.pk_lista_valor), label: row.nombre }))
  })
  data.initialGrade = []
  data.maxRecoveryGrade = []
  return { isPending, data }
}

export function useEvaluationCriteriaOptionsQuery() {
  return useQueries({
    queries: criteriaEntries.map(([, categoria]) => selectCategoryQueryOptions(categoria)),
    combine: combineCriteriaOptions,
  })
}
