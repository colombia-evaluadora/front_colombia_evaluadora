import { fetchSelectCategory } from "@/features/establishment/academic-period/api/query/fetch-select-category"
import type { EscalaValoracionTipo } from "@/features/planeador/api/types/actividad"

/**
 * Catálogo `TIPO_ESCALA` de `TLISTA_VALOR` — resuelve el `tipoEscala` que
 * pide `PUT /planeador/actividades/:id/instrumento` cuando el instrumento es
 * "Escala de valoración" (confirmado real, colección Postman
 * `planeador-instrumentos-tipos-completo`, 3.3/4.2: NUMERICA vs CUALITATIVA).
 *
 * Matchea por el código estable `valor` ("NUMERICA"/"CUALITATIVA"), NO por
 * substring de `nombre`: es el mismo código que ya usa todo el resto del
 * flujo de escala (`RawEscala.tipoEscala` en la precarga,
 * `variantes[].valor` de `campos_disponibles.evaluacion.instrumentosPermitidos`)
 * — matchear por `nombre` en cambio dependía de que el catálogo tuviera el
 * texto exacto esperado ("Numérica"/"Cualitativa", con tilde), y un nombre
 * distinto (u otra fila que calzara el mismo substring) devolvía el id
 * equivocado en silencio: el `<Select>` seguía mostrando "Numérica" elegido
 * porque eso vive aparte en el form, pero el `PUT` mandaba el `tipoEscala`
 * de la OTRA opción.
 */
function toEscalaTipo(valor: string): EscalaValoracionTipo | undefined {
  const upper = valor.toUpperCase()
  if (upper === "NUMERICA") return "Numérica"
  if (upper === "CUALITATIVA") return "Cualitativa"
  return undefined
}

export interface TipoEscalaOption {
  id: number
  tipo: EscalaValoracionTipo
}

/** No es un hook: se llama al armar el body de `PUT .../instrumento`. */
export async function fetchTipoEscalaOptions(): Promise<TipoEscalaOption[]> {
  const rows = await fetchSelectCategory("TIPO_ESCALA")
  return rows
    .map((row) => {
      const tipo = toEscalaTipo(row.valor)
      return tipo ? { id: row.pk_lista_valor, tipo } : undefined
    })
    .filter((option): option is TipoEscalaOption => option != null)
}

export async function resolveTipoEscalaId(tipo: EscalaValoracionTipo): Promise<number | undefined> {
  const options = await fetchTipoEscalaOptions()
  return options.find((o) => o.tipo === tipo)?.id
}
