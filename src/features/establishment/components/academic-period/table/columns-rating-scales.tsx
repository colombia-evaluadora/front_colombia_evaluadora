import type { ColumnDef, Table } from "@tanstack/react-table"
import { CaretDownIcon, CaretRightIcon } from "@phosphor-icons/react"

import { Checkbox } from "@/components/ui/checkbox"
import { DataTableColumnHeader } from "@/components/data-table"

import type { TeachingLevel } from "../../../api/types/academic-period/rating-scales"

interface CreateColumnsOptions {
  expandedId: number | null
  onToggleExpand: (level: TeachingLevel) => void
}

export function createRatingScaleLevelColumns({
  expandedId,
  onToggleExpand,
}: CreateColumnsOptions): ColumnDef<TeachingLevel>[] {
  return [
    {
      id: "expand",
      header: () => <span className="sr-only">Expandir</span>,
      cell: ({ row }) => {
        const isOpen = expandedId === row.original.id
        return (
          <button
            type="button"
            aria-label={isOpen ? "Contraer" : "Expandir"}
            aria-expanded={isOpen}
            onClick={() => onToggleExpand(row.original)}
            className="flex items-center text-muted-foreground"
          >
            {isOpen ? (
              <CaretDownIcon className="size-4" />
            ) : (
              <CaretRightIcon className="size-4" />
            )}
          </button>
        )
      },
      enableSorting: false,
      enableHiding: false,
      size: 40,
    },
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          color="neutral"
          aria-label="Seleccionar página"
          className="translate-y-0.5"
          checked={table.getIsAllPageRowsSelected()}
          indeterminate={
            !table.getIsAllPageRowsSelected() &&
            table.getIsSomePageRowsSelected()
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          color="neutral"
          aria-label={`Seleccionar ${row.original.nombre}`}
          className="translate-y-0.5"
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 32,
    },
    {
      id: "nombre",
      accessorKey: "nombre",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Niveles de enseñanza" />
      ),
      cell: ({ row }) => (
        <span className="font-semibold uppercase">{row.original.nombre}</span>
      ),
      enableHiding: false,
    },
  ]
}

export type RatingScaleLevelTable = Table<TeachingLevel>
