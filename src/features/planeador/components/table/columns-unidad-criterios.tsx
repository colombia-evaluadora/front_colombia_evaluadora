import type { ColumnDef } from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import { DataTableColumnHeader } from "@/components/data-table"
import { PencilIcon, TrashIcon } from "@/components/ui/icons"

import type { CriterioUnidad } from "@/features/planeador/api/types/unidad-tematica"
import { NIVELES_DESEMPENO_DEFAULT_NOMBRES } from "@/features/planeador/api/query/use-niveles-desempeno"
import { NivelTexto } from "@/features/planeador/components/table/criterio-nivel-texto"

/**
 * Columnas de la rúbrica de una unidad: el criterio y su descripción en
 * cada nivel de desempeño — TANTAS columnas de nivel como bandas tenga la
 * escala de valoración configurada, no un número fijo (antes eran siempre
 * 4: Bajo/Básico/Alto/Superior).
 *
 * `nombresNiveles` es esa lista de nombres — por default
 * `NIVELES_DESEMPENO_DEFAULT_NOMBRES`, pero el caller (`Rubricas` en
 * `unidad-detalle-panel.tsx`) le pasa los nombres reales de la escala
 * configurada para el nivel educativo de la unidad, si hay una
 * (`useNivelesDesempenoNombres`) — mismos nombres que ya usa
 * `DialogAgregarCriterio` para que la tabla y el modal de alta no queden
 * con nombres ni cantidad de niveles distinta para lo mismo. Cada columna
 * de nivel lee `criterio.niveles[index]` posicionalmente: el índice `i`
 * de `nombresNiveles` es el mismo nivel (banda) en toda la unidad.
 *
 * Sin columna `select`: la tabla vive dentro del panel de detalle y no tiene
 * operaciones en lote que justifiquen los checkboxes. La columna `actions` sí
 * va —es la que `DataTable` reconoce por id para montar el overlay que se
 * revela al pasar el puntero por la fila— con los botones `disabled`, como el
 * resto de las acciones de esta iteración.
 */
export function createUnidadCriteriosColumns(
  nombresNiveles: string[] = NIVELES_DESEMPENO_DEFAULT_NOMBRES,
): ColumnDef<CriterioUnidad>[] {
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
    ...nombresNiveles.map(
      (nombreNivel, index): ColumnDef<CriterioUnidad> => ({
        id: `nivel-${index}`,
        accessorFn: (row) => row.niveles[index]?.descripcion ?? "",
        meta: { label: nombreNivel },
        header: ({ column }) => <DataTableColumnHeader column={column} title={nombreNivel} />,
        cell: ({ row }) => <NivelTexto>{row.original.niveles[index]?.descripcion}</NivelTexto>,
      }),
    ),
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
