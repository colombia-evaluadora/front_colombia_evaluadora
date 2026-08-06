import { ArrowDownIcon, ArrowUpIcon, CaretUpDownIcon } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export type ScaleSortKey =
  | "nombre"
  | "abreviacion"
  | "notaMaxima"
  | "notaMinima"
  | "notaEquivalente"
  | "tipo"

export type ScaleSort = { key: ScaleSortKey; dir: "asc" | "desc" } | null

export function compareByScaleKey(av: unknown, bv: unknown): number {
  if (typeof av === "number" && typeof bv === "number") return av - bv
  return String(av).localeCompare(String(bv))
}

export function sortByScaleKey<T extends Record<ScaleSortKey, unknown>>(
  rows: T[],
  sort: ScaleSort,
): T[] {
  if (!sort) return rows
  const { key, dir } = sort
  const copy = [...rows].sort((a, b) => compareByScaleKey(a[key], b[key]))
  return dir === "desc" ? copy.reverse() : copy
}

interface ScaleSortableHeaderProps {
  title: string
  sortKey: ScaleSortKey
  sort: ScaleSort
  onSortChange: (next: ScaleSort) => void
}

export function ScaleSortableHeader({
  title,
  sortKey,
  sort,
  onSortChange,
}: ScaleSortableHeaderProps) {
  const active = sort?.key === sortKey ? sort.dir : null
  return (
    <div className="flex items-center">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="sm" className="-ml-3 h-8 data-[state=open]:bg-accent" />
          }
        >
          <span>{title}</span>
          {active === "desc" ? (
            <ArrowDownIcon data-icon="inline-end" />
          ) : active === "asc" ? (
            <ArrowUpIcon data-icon="inline-end" />
          ) : (
            <CaretUpDownIcon data-icon="inline-end" />
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuGroup>
            <DropdownMenuCheckboxItem
              closeOnClick
              checked={active === "asc"}
              onCheckedChange={() =>
                onSortChange(active === "asc" ? null : { key: sortKey, dir: "asc" })
              }
            >
              <ArrowUpIcon data-icon="inline-start" />
              Asc
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              closeOnClick
              checked={active === "desc"}
              onCheckedChange={() =>
                onSortChange(active === "desc" ? null : { key: sortKey, dir: "desc" })
              }
            >
              <ArrowDownIcon data-icon="inline-start" />
              Desc
            </DropdownMenuCheckboxItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
