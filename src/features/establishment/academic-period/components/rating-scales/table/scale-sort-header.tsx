import {
  TableSortableHeader,
  compareBySortKey,
  sortBySortKey,
  type TableSort,
} from "@/components/table-sort-header"

/**
 * El encabezado ordenable genérico, atado a las columnas de la tabla de
 * escalas. La mecánica (menú Asc/Desc, iconos, estilo) vive en
 * `@/components/table-sort-header`, compartida con las demás tablas que se
 * arman a mano dentro de un diálogo.
 */
export type ScaleSortKey =
  | "nombre"
  | "abreviacion"
  | "notaMaxima"
  | "notaMinima"
  | "notaEquivalente"
  | "tipo"
  | "iconografia"

export type ScaleSort = TableSort<ScaleSortKey>

export const compareByScaleKey = compareBySortKey

export function sortByScaleKey<T extends Record<ScaleSortKey, unknown>>(
  rows: T[],
  sort: ScaleSort,
): T[] {
  return sortBySortKey(rows, sort)
}

interface ScaleSortableHeaderProps {
  title: string
  sortKey: ScaleSortKey
  sort: ScaleSort
  onSortChange: (next: ScaleSort) => void
}

export function ScaleSortableHeader(props: ScaleSortableHeaderProps) {
  return <TableSortableHeader<ScaleSortKey> {...props} />
}
