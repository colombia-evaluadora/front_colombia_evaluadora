import { fetchSelectCategory } from "@/features/establishment/academic-period/api/query/fetch-select-category"
import { findCatalogId } from "@/features/establishment/academic-period/api/query/resolve-catalog-id"

export interface RatingScaleRefs {
  tipoId: number | null
  iconoId: number | null
  iconoCategoria: "GRAFICA_CARITA" | "GRAFICA_SIMBOLO" | null
}

// `fn_escala_guardar_bulk` pide `tipoId` e `iconoId`+`iconoCategoria` (PK de
// TLISTA_VALOR, categorías TIPO_VALORACION / GRAFICA_CARITA / GRAFICA_SIMBOLO),
// pero el front solo tiene el VALOR (string) que ya lee/elige (`RatingScale.tipo`,
// `.iconografia` — ver use-rating-scale-types.ts / use-rating-symbols.ts). Sin
// esto la función SIEMPRE tiraba excepción ("El tipo de valoracion <null> no
// existe"): `tipoId` nunca llegaba en el body, así que crear/editar escalas
// de valoración estaba completamente roto. Se re-resuelve justo antes de
// guardar, catálogos compartidos entre todas las escalas del lote (no un
// fetch por escala).
export async function resolveRatingScaleRefs(
  scales: { tipo: string; iconografia: string }[]
): Promise<RatingScaleRefs[]> {
  const [tipos, caritas, simbolos] = await Promise.all([
    fetchSelectCategory("TIPO_VALORACION"),
    fetchSelectCategory("GRAFICA_CARITA"),
    fetchSelectCategory("GRAFICA_SIMBOLO"),
  ])
  return scales.map((scale) => {
    const caritaId = findCatalogId(caritas, scale.iconografia, { match: "valor" })
    const simboloId = findCatalogId(simbolos, scale.iconografia, { match: "valor" })
    return {
      tipoId: findCatalogId(tipos, scale.tipo, { match: "valorOrNombre" }) ?? null,
      iconoId: caritaId ?? simboloId ?? null,
      iconoCategoria: caritaId != null
        ? "GRAFICA_CARITA"
        : simboloId != null
          ? "GRAFICA_SIMBOLO"
          : null,
    }
  })
}
