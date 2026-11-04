import type { ColumnDef } from "@tanstack/react-table"

import { DataTableColumnHeader } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CheckCircleIcon, DotsThreeVerticalIcon, PencilIcon, ProhibitIcon, TrashIcon } from "@/components/ui/icons"

import { colorDeTipo } from "@/features/gestion-estudiantil/observador/api/ui-mappings"
import type { CodigoRow } from "@/features/gestion-estudiantil/catalogo-anotaciones/api/types"

interface Opciones {
  puedeEditar: boolean
  puedeEliminar: boolean
  onModificar: (c: CodigoRow) => void
  onCambiarEstado: (c: CodigoRow) => void
  onEliminar: (c: CodigoRow) => void
}

/** Listado de 2.1: Código · Descripción · Tipo · Tipo de situación · Estado. */
export function buildColumnsCodigos({ puedeEditar, puedeEliminar, onModificar, onCambiarEstado, onEliminar }: Opciones): ColumnDef<CodigoRow>[] {
  return [
    {
      id: "codigo",
      accessorKey: "codigo",
      enableSorting: false,
      enableHiding: false,
      meta: { label: "Código" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Código" />,
      cell: ({ row }) => <span className="font-semibold">{row.original.codigo}</span>,
    },
    {
      id: "descripcion",
      accessorKey: "descripcion",
      enableSorting: false,
      enableHiding: false,
      meta: { label: "Descripción" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Descripción" />,
      cell: ({ row }) => <span className="whitespace-normal">{row.original.descripcion}</span>,
    },
    {
      id: "tipo",
      accessorKey: "tipo_nombre",
      enableSorting: false,
      meta: { label: "Tipo" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo" />,
      cell: ({ row }) => (
        <Badge variant="soft" color={colorDeTipo(row.original.tipo_nombre)}>
          {row.original.tipo_nombre}
        </Badge>
      ),
    },
    {
      id: "situacion",
      accessorKey: "situacion_nombre",
      enableSorting: false,
      meta: { label: "Tipo de situación" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo de situación" />,
      cell: ({ row }) => row.original.situacion_nombre ?? "—",
    },
    {
      id: "estado",
      accessorKey: "habilitado",
      enableSorting: false,
      meta: { label: "Estado" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) => (
        <Badge variant="soft" color={row.original.habilitado ? "success" : "muted"}>
          {row.original.habilitado ? "Activo" : "Inactivo"}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Acciones</span>,
      enableSorting: false,
      enableHiding: false,
      size: 48,
      cell: ({ row }) => {
        const c = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" color="neutral" size="icon-sm" aria-label={`Acciones del código ${c.codigo}`} />}>
              <DotsThreeVerticalIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem disabled={!puedeEditar} onClick={() => onModificar(c)}>
                <PencilIcon />
                Modificar
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!puedeEditar} onClick={() => onCambiarEstado(c)}>
                {c.habilitado ? <ProhibitIcon /> : <CheckCircleIcon />}
                {c.habilitado ? "Inactivar" : "Activar"}
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!puedeEliminar || c.en_uso} onClick={() => onEliminar(c)}>
                <TrashIcon />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
}
