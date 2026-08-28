import type * as React from "react"
import type { ColumnDef } from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import { DataTableColumnHeader } from "@/components/data-table"
import { PencilIcon, TrashIcon } from "@/components/ui/icons"

import type { CriterioUnidad } from "@/features/planeador/api/types/unidad-tematica"

/**
 * Descripción de un nivel de desempeño.
 *
 * Las celdas de `DataTable` van `whitespace-nowrap` —bien para valores cortos,
 * no para prosa: las cuatro descripciones en una sola línea daban una tabla
 * mucho más ancha que el panel, que solo se leía scrolleando en horizontal—,
 * así que acá se reactiva el salto de línea.
 *
 * `max-w` y no `w`: es un techo, no un ancho fijo. Con `table-layout: auto` el
 * navegador reparte el sobrante hasta ese límite y, si el panel es más
 * angosto, encoge las columnas en vez de desbordar.
 */
function NivelTexto({ children }: { children: React.ReactNode }) {
  return <span className="block max-w-[16rem] whitespace-normal">{children}</span>
}

/**
 * Columnas de la rúbrica de una unidad: el criterio y su descripción en los
 * cuatro niveles de desempeño.
 *
 * Sin columna `select`: la tabla vive dentro del panel de detalle y no tiene
 * operaciones en lote que justifiquen los checkboxes. La columna `actions` sí
 * va —es la que `DataTable` reconoce por id para montar el overlay que se
 * revela al pasar el puntero por la fila— con los botones `disabled`, como el
 * resto de las acciones de esta iteración.
 */
export function createUnidadCriteriosColumns(): ColumnDef<CriterioUnidad>[] {
  return [
    {
      id: "nombre",
      accessorKey: "nombre",
      meta: { label: "Criterio" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Criterio" />,
      cell: ({ row }) => (
        <span className="block max-w-[12rem] font-semibold whitespace-normal">
          {row.original.nombre}
        </span>
      ),
    },
    {
      id: "bajo",
      accessorKey: "bajo",
      meta: { label: "Bajo" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Bajo" />,
      cell: ({ row }) => <NivelTexto>{row.original.bajo}</NivelTexto>,
    },
    {
      id: "basico",
      accessorKey: "basico",
      meta: { label: "Básico" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Básico" />,
      cell: ({ row }) => <NivelTexto>{row.original.basico}</NivelTexto>,
    },
    {
      id: "alto",
      accessorKey: "alto",
      meta: { label: "Alto" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Alto" />,
      cell: ({ row }) => <NivelTexto>{row.original.alto}</NivelTexto>,
    },
    {
      id: "superior",
      accessorKey: "superior",
      meta: { label: "Superior" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Superior" />,
      cell: ({ row }) => <NivelTexto>{row.original.superior}</NivelTexto>,
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Acciones</span>,
      cell: () => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" color="neutral" size="icon-sm" disabled aria-label="Editar criterio">
            <PencilIcon />
          </Button>
          <Button variant="ghost" color="neutral" size="icon-sm" disabled aria-label="Eliminar criterio">
            <TrashIcon />
          </Button>
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
      size: 96,
    },
  ]
}
