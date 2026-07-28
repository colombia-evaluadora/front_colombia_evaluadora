import type { ColumnDef, Table } from "@tanstack/react-table"
import { CaretDownIcon, CaretRightIcon } from "@/components/ui/icons"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DataTableColumnHeader } from "@/components/data-table"

import type {
  Teacher,
  TeacherStatus,
} from "../../../api/types/academic-period/teacher"

const STATUS_BADGE: Record<
  TeacherStatus,
  { variant: "soft"; color: "success" | "muted" }
> = {
  ACTIVO: { variant: "soft", color: "success" },
  INACTIVO: { variant: "soft", color: "muted" },
}

interface CreateColumnsOptions {
  expandedDoc: string | null
  onToggleExpand: (teacher: Teacher) => void
}

export function createAcademicAssignmentColumns({
  expandedDoc,
  onToggleExpand,
}: CreateColumnsOptions): ColumnDef<Teacher>[] {
  return [
    {
      id: "expand",
      header: () => <span className="sr-only">Expandir</span>,
      cell: ({ row }) => {
        const isOpen = expandedDoc === row.original.documento
        return (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={isOpen ? "Contraer" : "Expandir"}
            aria-expanded={isOpen}
            onClick={() => onToggleExpand(row.original)}
          >
            {isOpen ? (
              <CaretDownIcon weight="bold" />
            ) : (
              <CaretRightIcon weight="bold" />
            )}
          </Button>
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
          aria-label={`Seleccionar ${row.original.apellido}`}
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
      id: "documento",
      accessorKey: "documento",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Documento" />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.original.documento}</span>
      ),
    },
    {
      id: "apellido",
      accessorKey: "apellido",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Apellido" />
      ),
      cell: ({ row }) => (
        <span className="font-semibold">{row.original.apellido}</span>
      ),
    },
    {
      id: "nombre",
      accessorKey: "nombre",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Nombre" />
      ),
      cell: ({ row }) => (
        <span className="font-semibold">{row.original.nombre}</span>
      ),
    },
    {
      id: "estado",
      accessorKey: "estado",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Estado" />
      ),
      cell: ({ row }) => (
        <Badge {...STATUS_BADGE[row.original.estado]}>{row.original.estado}</Badge>
      ),
    },
  ]
}

export type AcademicAssignmentTable = Table<Teacher>
