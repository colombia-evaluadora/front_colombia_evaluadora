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
  }))
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
  return [...toSymbols(caritas, "carita"), ...toSymbols(simbolos, "valoracion")]
}

export const ratingSymbolsQueryKey = () => ["rating-symbols"]

export function useRatingSymbolsQuery() {
  return useQuery({
    queryKey: ratingSymbolsQueryKey(),
    queryFn: fetchRatingSymbols,
    staleTime: Infinity,
  })
}
