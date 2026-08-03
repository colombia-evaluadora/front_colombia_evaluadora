import type { ColumnDef, Table } from "@tanstack/react-table"
import { CaretDownIcon, CaretRightIcon } from "@/components/ui/icons"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DataTableColumnHeader } from "@/components/data-table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

import {
  EMPLOYEE_STATUS_BADGE,
  EMPLOYEE_STATUS_LABELS,
} from "@/features/establishment/api/employee-ui-mappings"
import type { EmployeeListItem } from "@/features/establishment/api/types/employee"
import type { PermissionStatus } from "@/features/establishment/api/types/permission"

interface CreateColumnsOptions {
  expandedId: string | null
  onToggleExpand: (employee: EmployeeListItem) => void
}

/**
 * Une las etiquetas legibles de los estados del funcionario con comas.
 * Vacío cuando el funcionario aún no tiene permisos asociados. Replica
 * el patrón del módulo de establecimiento para mantener la misma UX.
 */
function formatStatusLabels(statuses: EmployeeListItem["statuses"]) {
  if (statuses.length === 0) {
    return "—"
  }
  return statuses.map((status) => EMPLOYEE_STATUS_LABELS[status]).join(", ")
}

/**
 * Color del badge cuando hay varios estados mezclados: si alguno es
 * `SUSPENDED` mostramos destructive; si todos son `ACTIVE`, success.
 */
function pickStatusColor(
  statuses: EmployeeListItem["statuses"]
): "success" | "destructive" {
  return statuses.includes("SUSPENDED" satisfies PermissionStatus)
    ? "destructive"
    : "success"
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
          aria-label={`Seleccionar ${row.original.name}`}
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
      id: "documentNumber",
      accessorKey: "documentNumber",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Documento" />
      ),
      cell: ({ row }) => (
        <span className="tabular-nums">{row.original.documentNumber}</span>
      ),
    },
    {
      id: "name",
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Nombre" />
      ),
      cell: ({ row }) => (
        <div className="max-w-md truncate font-medium">
          {row.original.name}
        </div>
      ),
    },
    {
      id: "status",
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Estado" />
      ),
      cell: ({ row }) => {
        const statuses = row.original.statuses
        const fullText = formatStatusLabels(statuses)

        if (statuses.length === 0) {
          return (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Badge variant="outline" color="neutral" className="font-normal">
                    {fullText}
                  </Badge>
                }
              />
              <TooltipContent>Sin permisos asignados</TooltipContent>
            </Tooltip>
          )
        }

        return (
          <Tooltip>
            <TooltipTrigger
              render={
                <Badge
                  {...EMPLOYEE_STATUS_BADGE[statuses[0]]}
                  color={pickStatusColor(statuses)}
                  className="max-w-[14rem] truncate font-normal"
                >
                  {fullText}
                </Badge>
              }
            />
            <TooltipContent>{fullText}</TooltipContent>
          </Tooltip>
        )
      },
    },
  ]
}

export type AcademicAssignmentTable = Table<EmployeeListItem>
