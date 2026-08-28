import type { ColumnDef } from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import { DataTableColumnHeader } from "@/components/data-table"
import {
  CheckIcon,
  EyeIcon,
  LinkBreakIcon,
  PencilIcon,
} from "@/components/ui/icons"

import type { UnidadActividad } from "@/features/planeador/api/types/unidad-tematica"

/**
 * Columnas de las actividades vinculadas a una unidad, con su peso dentro de
 * ella.
 *
 * Sin columna `select` —no hay operaciones en lote acá—, pero sí `actions`:
 * ese id es el que `DataTable` reconoce para montar el overlay de botones que
 * se revela al pasar el puntero por la fila. Van `disabled`, como el resto de
 * las acciones de esta iteración.
 */
export function createUnidadActividadesColumns(): ColumnDef<UnidadActividad>[] {
  return [
    {
      id: "nombre",
      accessorKey: "nombre",
      meta: { label: "Actividad" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Actividad" />,
      cell: ({ row }) => <span className="font-semibold">{row.original.nombre}</span>,
    },
    {
      id: "tipo",
      accessorKey: "tipo",
      meta: { label: "Tipo" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo" />,
      cell: ({ row }) => <span>{row.original.tipo}</span>,
    },
    {
      id: "instrumento",
      accessorKey: "instrumento",
      meta: { label: "Instrumento" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Instrumento" />,
      cell: ({ row }) => <span>{row.original.instrumento}</span>,
    },
    {
      id: "grupo",
      accessorKey: "grupo",
      meta: { label: "Grupo" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Grupo" />,
      cell: ({ row }) => <span>{row.original.grupo}</span>,
    },
    {
      id: "ponderacion",
      accessorKey: "ponderacion",
      meta: { label: "(%)" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="(%)" />,
      cell: ({ row }) => <span>{row.original.ponderacion}</span>,
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Acciones</span>,
      cell: () => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" color="neutral" size="icon-sm" disabled aria-label="Ver actividad">
            <EyeIcon />
          </Button>
          <Button variant="ghost" color="neutral" size="icon-sm" disabled aria-label="Editar actividad">
            <PencilIcon />
          </Button>
          <Button variant="ghost" color="neutral" size="icon-sm" disabled aria-label="Marcar actividad">
            <CheckIcon />
          </Button>
          <Button variant="ghost" color="neutral" size="icon-sm" disabled aria-label="Desvincular actividad">
            <LinkBreakIcon />
          </Button>
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
      size: 176,
    },
  ]
}
