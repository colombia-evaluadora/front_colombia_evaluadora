import { useQuery } from "@tanstack/react-query"

import { selectCategoryQueryOptions, type SelectCategoryRow } from "@/features/establishment/academic-period/api/query/fetch-select-category"
import { resolveCatalogId } from "@/features/establishment/academic-period/api/query/resolve-catalog-id"
import type { InstrumentoPermitido } from "@/features/planeador/api/types/actividad"

// Se resuelve por `valor`: el back llama "Otro (personalizado)" al que el form compara como "Otro".
export const INSTRUMENTO_EVALUACION_POR_CODIGO: Record<string, string> = {
  RUBRICA: "Rúbrica",
  LISTA_COTEJO: "Lista de cotejo",
  ESCALA_VALORACION: "Escala de valoración",
  OTRO: "Otro",
}

function toInstrumentoEvaluacionCatalog(rows: SelectCategoryRow[]): string[] {
  return rows.map((row) => INSTRUMENTO_EVALUACION_POR_CODIGO[row.valor] ?? row.nombre)
}

export function useInstrumentoEvaluacionCatalogQuery() {
  return useQuery({ ...selectCategoryQueryOptions("INSTRUMENTO_EVALUACION"), select: toInstrumentoEvaluacionCatalog })
}

export interface InstrumentoEvaluacionOption {
  id: number
  nombre: string
}

/** Label con el que el form compara un instrumento permitido (por `valor`). */
export function instrumentoPermitidoLabel(
  item: Pick<InstrumentoPermitido, "valor" | "etiqueta" | "nombre">,
): string {
  return INSTRUMENTO_EVALUACION_POR_CODIGO[item.valor] ?? item.etiqueta ?? item.nombre
}

type InstrumentoPermitidoRaw = {
  pk?: number
  valor?: string
  etiqueta?: string
  nombre?: string
  variantes?: InstrumentoPermitido["variantes"]
  campos?: InstrumentoPermitido["campos"]
}

/** `instrumentosPermitidos` llega como objetos; tolera strings del mock viejo. */
export function normalizeInstrumentosPermitidos(
  rows: (string | InstrumentoPermitidoRaw)[] | undefined,
): InstrumentoPermitido[] {
  return (rows ?? []).map((row, index) =>
    typeof row === "string"
      ? { pk: index, valor: row, nombre: row, etiqueta: row, variantes: [], campos: null }
      : {
          pk: row.pk ?? index,
          valor: row.valor ?? "",
          nombre: row.nombre ?? row.etiqueta ?? row.valor ?? "",
          etiqueta: row.etiqueta ?? row.nombre ?? row.valor ?? "",
          variantes: row.variantes ?? [],
          campos: row.campos ?? null,
        },
  )
}

/** `FK_TLV_INSTRUMENTO_EVALUACION` y `metodoValoracion` del instrumento "Otro". */
export async function resolveInstrumentoEvaluacionId(nombre: string): Promise<number | undefined> {
  return resolveCatalogId(undefined, "INSTRUMENTO_EVALUACION", nombre, {
    normalize: (row) => INSTRUMENTO_EVALUACION_POR_CODIGO[row.valor] ?? row.nombre,
  })
}

/** Filtro "Instrumento": `value` es el pk, que es lo que filtra `?instrumento=`. */
function toInstrumentoFiltroOptions(rows: SelectCategoryRow[]) {
  return rows.map((row) => ({
    value: String(row.pk_lista_valor),
    label: INSTRUMENTO_EVALUACION_POR_CODIGO[row.valor] ?? row.nombre,
  }))
}

export function useInstrumentoFiltroOptions() {
  return useQuery({ ...selectCategoryQueryOptions("INSTRUMENTO_EVALUACION"), select: toInstrumentoFiltroOptions })
}
