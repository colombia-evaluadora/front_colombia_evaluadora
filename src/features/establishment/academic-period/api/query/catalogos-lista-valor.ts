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

// ---- Símbolos de valoración (GRAFICA_CARITA + GRAFICA_SIMBOLO) ----

function isImageValue(value: string): boolean {
  return (
    /^data:image\//i.test(value) ||
    /^(https?:)?\/\//.test(value) ||
    value.startsWith("/") ||
    /\.(png|jpe?g|svg|webp|gif|avif)$/i.test(value)
  )
}

function toSymbols(rows: SelectCategoryRow[], categoria: RatingSymbol["categoria"]): RatingSymbol[] {
  return rows.map((row) => ({
    id: String(row.pk_lista_valor),
    categoria,
    kind: isImageValue(row.valor) ? "imagen" : "emoji",
    valor: row.valor,
    label: row.nombre,
    color: row.accion ?? undefined,
  }))
}

const NIVEL_ORDER = ["SUPERIOR", "ALTO", "BASICO", "BAJO"]
const COLOR_ORDER = ["AMARILLO", "VERDE", "CELESTE", "NARANJA", "ROJO"]

interface ParsedAccion {
  color?: string
  nivel?: string
  n?: number
}

function parseAccion(accion: string | undefined): ParsedAccion {
  if (!accion) return {}
  const parts = accion.split("_")
  const last = parts[parts.length - 1]
  const hasSuffix = parts.length > 1 && /^\d+$/.test(last)
  const n = hasSuffix ? Number(last) : undefined
  const nivelParts = hasSuffix ? parts.slice(1, -1) : parts.slice(1)
  return {
    color: parts[0],
    nivel: nivelParts.length > 0 ? nivelParts.join("_") : undefined,
    n,
  }
}

function rank(order: string[], value: string | undefined): number {
  if (!value) return order.length
  const index = order.indexOf(value)
  return index === -1 ? order.length : index
}

function caritaRank(symbol: RatingSymbol): [number, number, number] {
  const { color, nivel, n } = parseAccion(symbol.color)
  return [rank(COLOR_ORDER, color), rank(NIVEL_ORDER, nivel), n ?? Number.POSITIVE_INFINITY]
}

function compareCaritaRank(a: RatingSymbol, b: RatingSymbol): number {
  const ra = caritaRank(a)
  const rb = caritaRank(b)
  return ra[0] - rb[0] || ra[1] - rb[1] || ra[2] - rb[2]
}

const SIMBOLO_ACCION_ORDER = [
  "CELESTE_ALTO",
  "MORADO_ACEPTABLE",
  "ROSADO_INSUFICIENTE",
  "AMARILLO_SUPERIOR",
  "NARANJA_SOBRESALIENTE",
  "ROJO_DEFICIENTE",
  "VERDE_EXCELENTE",
  "ROSADO_BASICO",
  "ROJO_BAJO",
]

const simboloRank = (symbol: RatingSymbol) => rank(SIMBOLO_ACCION_ORDER, symbol.color)

function combineSymbols([caritas, simbolos]: UseQueryResult<SelectCategoryRow[]>[]) {
  const isPending = caritas.isPending || simbolos.isPending
  if (isPending) return { isPending, data: undefined }
  const caritaSymbols = toSymbols(caritas.data ?? [], "carita").sort(compareCaritaRank)
  const simboloSymbols = toSymbols(simbolos.data ?? [], "valoracion").sort((a, b) => simboloRank(a) - simboloRank(b))
  return { isPending, data: [...caritaSymbols, ...simboloSymbols] }
}

export function useRatingSymbolsQuery() {
  return useQueries({
    queries: [selectCategoryQueryOptions("GRAFICA_CARITA"), selectCategoryQueryOptions("GRAFICA_SIMBOLO")],
    combine: combineSymbols,
  })
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
