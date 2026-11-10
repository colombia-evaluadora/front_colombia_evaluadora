import { useQuery } from "@tanstack/react-query"

import {
  selectCategoryQueryOptions,
  type SelectCategoryRow,
} from "@/features/establishment/academic-period/api/query/fetch-select-category"

export interface OpcionCatalogo {
  value: string
  label: string
  /** TLISTA_VALOR.VALOR: las reglas se deciden por código, no por etiqueta ni pk. */
  codigo: string
}

const toOpciones = (rows: SelectCategoryRow[]): OpcionCatalogo[] =>
  rows.map((r) => ({ value: String(r.pk_lista_valor), label: r.nombre, codigo: r.valor }))

/** `GET /eval-col/select/:CATEGORIA` como opciones de combo. */
export function useCatalogo(categoria: string) {
  const q = useQuery({ ...selectCategoryQueryOptions(categoria), select: toOpciones })
  return q.data ?? []
}

export const codigoDe = (opciones: OpcionCatalogo[], value: string | number | null | undefined) =>
  value == null || value === "" ? undefined : opciones.find((o) => o.value === String(value))?.codigo

export const nombreDe = (opciones: OpcionCatalogo[], value: string | number | null | undefined) =>
  value == null || value === "" ? undefined : opciones.find((o) => o.value === String(value))?.label
