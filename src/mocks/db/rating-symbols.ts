import type { RatingSymbol } from "@/features/establishment/api/types/academic-period/rating-scales"

export const ratingSymbolsDb: RatingSymbol[] = [
  {
    id: "carita-muy-feliz",
    categoria: "carita",
    kind: "emoji",
    valor: "😄",
    label: "Muy feliz",
  },
  {
    id: "carita-feliz",
    categoria: "carita",
    kind: "emoji",
    valor: "🙂",
    label: "Feliz",
  },
  {
    id: "carita-neutral",
    categoria: "carita",
    kind: "emoji",
    valor: "😐",
    label: "Neutral",
  },
  {
    id: "carita-triste",
    categoria: "carita",
    kind: "emoji",
    valor: "🙁",
    label: "Triste",
  },
  {
    id: "carita-muy-triste",
    categoria: "carita",
    kind: "emoji",
    valor: "😢",
    label: "Muy triste",
  },
  {
    id: "valoracion-superior",
    categoria: "valoracion",
    kind: "emoji",
    valor: "🏆",
    label: "Superior",
  },
  {
    id: "valoracion-destacado",
    categoria: "valoracion",
    kind: "emoji",
    valor: "⭐",
    label: "Destacado",
  },
  {
    id: "valoracion-aprobado",
    categoria: "valoracion",
    kind: "emoji",
    valor: "👍",
    label: "Aprobado",
  },
]
