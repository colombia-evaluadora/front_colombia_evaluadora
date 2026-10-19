import {
  TableSortableHeader,
  compareBySortKey,
  type TableSort,
} from "@/components/table-sort-header"

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

interface ScaleSortableHeaderProps {
  title: string
  sortKey: ScaleSortKey
  sort: ScaleSort
  onSortChange: (next: ScaleSort) => void
}

export function ScaleSortableHeader(props: ScaleSortableHeaderProps) {
  return <TableSortableHeader<ScaleSortKey> {...props} />
}
