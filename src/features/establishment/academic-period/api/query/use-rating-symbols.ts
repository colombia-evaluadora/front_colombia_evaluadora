import { useQuery } from "@tanstack/react-query"

import type { RatingSymbol } from "@/features/establishment/academic-period/api/types/rating-scales"
import {
  fetchSelectCategory,
  type SelectCategoryRow,
} from "@/features/establishment/academic-period/api/query/fetch-select-category"

// Igual chequeo que `isImageValue` en components/rating-symbol.tsx (duplicado
// a propósito: api/ no importa de components/, ver convención del resto de
// hooks de este módulo) — VALOR es imagen (URL/data URI) o texto (emoji).
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
    // ACCION guarda "<COLOR>_<NIVEL>_<N>" (ver migración V94 en SSO), p.ej.
    // "AMARILLO_ALTO_1" — se parsea en `parseAccion` para ordenar el picker
    // sin hardcodear ids.
    color: row.accion ?? undefined,
  }))
}

// Nivel de desempeño que codifica cada carita — define el orden de columnas
// dentro de cada fila (una fila = un color). Mismo orden que ya se veía en
// el picker real antes de tener ACCION poblado.
const NIVEL_ORDER = ["SUPERIOR", "ALTO", "BASICO", "BAJO"]

// Orden de colores — una fila por color en el picker.
const COLOR_ORDER = ["AMARILLO", "VERDE", "CELESTE", "NARANJA", "ROJO"]

interface ParsedAccion {
  color?: string
  nivel?: string
  n?: number
}

// "AMARILLO_ALTO_1" -> { color: "AMARILLO", nivel: "ALTO", n: 1 }. Tolera
// valores incompletos (p.ej. los símbolos de letra, que no llevan "_N" por
// no tener dos caritas del mismo nivel/color).
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

// Orden del picker: fila por color, y dentro de cada fila cada nivel junto a
// su par (SUPERIOR_1, SUPERIOR_2, ALTO_1, ALTO_2, ...).
function caritaRank(symbol: RatingSymbol): [number, number, number] {
  const { color, nivel, n } = parseAccion(symbol.color)
  return [rank(COLOR_ORDER, color), rank(NIVEL_ORDER, nivel), n ?? Number.POSITIVE_INFINITY]
}

function compareCaritaRank(a: RatingSymbol, b: RatingSymbol): number {
  const ra = caritaRank(a)
  const rb = caritaRank(b)
  return ra[0] - rb[0] || ra[1] - rb[1] || ra[2] - rb[2]
}

// Catálogo genérico de TLISTA_VALOR: dos categorías separadas en la base
// (`GRAFICA_CARITA`, `GRAFICA_SIMBOLO`) que el front combina en una sola
// lista — `fn_escala_guardar_bulk` necesita saber de cuál de las dos vino el
// VALOR elegido (`iconoCategoria`), por eso se guarda `categoria` por símbolo
// (ver resolve-rating-scale-refs.ts).
async function fetchRatingSymbols(): Promise<RatingSymbol[]> {
  const [caritas, simbolos] = await Promise.all([
    fetchSelectCategory("GRAFICA_CARITA"),
    fetchSelectCategory("GRAFICA_SIMBOLO"),
  ])
  // Se ordena parseando ACCION (color + nivel + consecutivo) para que el
  // picker pinte cada color en su propia fila, en vez del orden crudo del
  // catálogo.
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
