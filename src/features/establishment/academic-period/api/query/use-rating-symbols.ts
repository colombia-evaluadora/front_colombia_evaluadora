import { useQuery } from "@tanstack/react-query"

import type { RatingSymbol } from "@/features/establishment/academic-period/api/types/rating-scales"
import {
  fetchSelectCategory,
  type SelectCategoryRow,
} from "@/features/establishment/academic-period/api/query/fetch-select-category"

function isImageValue(value: string): boolean {
  return (
    /^data:image\//i.test(value) ||
    /^(https?:)?\/\//.test(value) ||
    value.startsWith("/") ||
    /\.(png|jpe?g|svg|webp|gif|avif)$/i.test(value)
  )
}

function toSymbols(
  rows: SelectCategoryRow[],
  categoria: RatingSymbol["categoria"]
): RatingSymbol[] {
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

async function fetchRatingSymbols(): Promise<RatingSymbol[]> {
  const [caritas, simbolos] = await Promise.all([
    fetchSelectCategory("GRAFICA_CARITA"),
    fetchSelectCategory("GRAFICA_SIMBOLO"),
  ])
  const caritaSymbols = toSymbols(caritas, "carita").sort(compareCaritaRank)
  return [...caritaSymbols, ...toSymbols(simbolos, "valoracion")]
}

export const ratingSymbolsQueryKey = () => ["rating-symbols"]

export function useRatingSymbolsQuery() {
  return useQuery({
    queryKey: ratingSymbolsQueryKey(),
    queryFn: fetchRatingSymbols,
    staleTime: Infinity,
  })
}
