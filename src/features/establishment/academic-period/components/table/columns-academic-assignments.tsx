import type { ColumnDef, Table } from "@tanstack/react-table"
import { CaretDownIcon, CaretRightIcon } from "@/components/ui/icons"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DataTableColumnHeader } from "@/components/data-table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

import { renderStatusCell } from "@/features/establishment/employees/components/table/columns-employees"
import type { EmployeeListItem } from "@/features/establishment/employees/api/types/employee"

interface CreateColumnsOptions {
  expandedId: number | null
  onToggleExpand: (employee: EmployeeListItem) => void
}

export function createAcademicAssignmentColumns({
  expandedId,
  onToggleExpand,
}: CreateColumnsOptions): ColumnDef<EmployeeListItem>[] {
  return [
    {
      id: "expand",
      header: () => <span className="sr-only">Expandir</span>,
      cell: ({ row }) => {
        const isOpen = expandedId === row.original.id
        return (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={isOpen ? "Contraer" : "Expandir"}
                  aria-expanded={isOpen}
                  onClick={() => onToggleExpand(row.original)}
                />
              }
            >
              {isOpen ? <CaretDownIcon weight="bold" /> : <CaretRightIcon weight="bold" />}
            </TooltipTrigger>
            <TooltipContent>{isOpen ? "Contraer" : "Expandir"}</TooltipContent>
          </Tooltip>
        )
      },
      enableSorting: false,
      enableHiding: false,
      size: 40,
    },
    {
      // `-ml-4` en ambos checkboxes: pega la casilla contra el chevron de
      // "expandir", cancelando el `px-4` que trae la celda por defecto (así
      // no depende de que `cellClassName` a nivel tabla logre pisar ese
      // padding vía twMerge, que no estaba surtiendo efecto acá).
      id: "select",
      header: ({ table }) => (
        <Checkbox
          aria-label="Seleccionar página"
          className="-ml-7 translate-y-0.5"
          checked={table.getIsAllPageRowsSelected()}
          indeterminate={!table.getIsAllPageRowsSelected() && table.getIsSomePageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          aria-label={`Seleccionar ${row.original.name}`}
          className="-ml-7 translate-y-0.5"
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 32,
    },
    {
      id: "documentNumber",
      accessorKey: "documentNumber",
      meta: { label: "Documento" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Documento" />,
      cell: ({ row }) => <span className="tabular-nums">{row.original.documentNumber}</span>,
    },
    {
      id: "name",
      accessorKey: "name",
      meta: { label: "Nombre" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
      cell: ({ row }) => <div className="max-w-md truncate font-medium">{row.original.name}</div>,
    },
    {
      id: "status",
      accessorKey: "status",
      meta: { label: "Estado" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) => (
        <span className="text-sm text-foreground">{renderStatusCell(row.original.statuses)}</span>
      ),
    },
  ]
}

export type AcademicAssignmentTable = Table<EmployeeListItem>
