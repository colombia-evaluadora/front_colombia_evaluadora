"use no memo"

import type { ColumnDef } from "@tanstack/react-table"

import { ConfirmRemoveButton } from "@/components/confirm-remove-button"
import { DataTableColumnHeader } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { LockIcon } from "@/components/ui/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

import type {
  Categoria,
  ListaValor,
} from "@/features/administration/listas-valor/api/types/lista-valor"
import { DialogSaveValor } from "@/features/administration/listas-valor/components/dialog-save-valor"

interface CreateColumnsOptions {
  categoria: Categoria
  categorias: Categoria[]
  puedeEditar: boolean
  puedeEliminar: boolean
  onIrALista: (categoria: string) => void
  onEliminar: (valor: ListaValor) => Promise<void>
}

export function createValoresColumns({
  categoria,
  categorias,
  puedeEditar,
  puedeEliminar,
  onIrALista,
  onEliminar,
}: CreateColumnsOptions): ColumnDef<ListaValor>[] {
  const columns: ColumnDef<ListaValor>[] = [
    {
      id: "nombre",
      accessorKey: "nombre",
      meta: { label: "Nombre" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
      cell: ({ row }) => (
        <span className="flex items-center gap-1.5 font-medium">
          {row.original.nombre}
          {row.original.esSistema && (
            <Tooltip>
              <TooltipTrigger render={<span className="inline-flex text-muted-foreground" />}>
                <LockIcon className="size-3.5" />
                <span className="sr-only">Valor del sistema</span>
              </TooltipTrigger>
              <TooltipContent>
                Valor del sistema: solo el super administrador lo elimina o renombra.
              </TooltipContent>
            </Tooltip>
          )}
        </span>
      ),
    },
    {
      id: "valor",
      accessorKey: "valor",
      meta: { label: "Código" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Código" />,
      cell: ({ row }) => <span className="font-mono text-[0.8125rem]">{row.original.valor}</span>,
    },
    {
      id: "accion",
      accessorKey: "accion",
      meta: { label: "Acción" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Acción" />,
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.accion ?? "—"}</span>
      ),
    },
    {
      id: "padre",
      accessorFn: (row) => row.padre?.nombre ?? "",
      meta: { label: "Depende de" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Depende de" />,
      cell: ({ row }) => {
        const padre = row.original.padre
        if (!padre) return <span className="text-muted-foreground">—</span>
        return (
          <Badge
            variant="soft"
            color="neutral"
            render={
              <button
                type="button"
                title={`Ir a ${padre.categoria}`}
                onClick={() => onIrALista(padre.categoria)}
              />
            }
          >
            {padre.nombre}
          </Badge>
        )
      },
    },
  ]

  if (puedeEditar || puedeEliminar) {
    columns.push({
      id: "actions",
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          {puedeEditar && (
            <DialogSaveValor
              key={`${row.original.pkListaValor}-${row.original.nombre}-${row.original.padre?.pkListaValor}`}
              categoria={categoria}
              categorias={categorias}
              valor={row.original}
            />
          )}
          {puedeEliminar && (
            <ConfirmRemoveButton
              label="Eliminar valor"
              title="Eliminar valor"
              description={
                <>
                  Se eliminará «{row.original.nombre}» de {categoria.categoria}. No se puede si
                  está en uso o tiene valores que dependen de él.
                </>
              }
              onConfirm={() => onEliminar(row.original)}
            />
          )}
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
      size: 96,
    })
  }

  return columns
}
