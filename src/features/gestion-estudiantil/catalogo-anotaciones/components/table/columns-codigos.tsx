import type { ColumnDef } from "@tanstack/react-table"

import { DataTableColumnHeader } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { CheckCircleIcon, PencilIcon, ProhibitIcon, TrashIcon } from "@/components/ui/icons"

import { AccionesFila } from "@/features/gestion-estudiantil/commons/components/acciones-fila"
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
      meta: { label: "Código" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Código" />,
      cell: ({ row }) => <span className="font-semibold">{row.original.codigo}</span>,
    },
    {
      id: "descripcion",
      accessorKey: "descripcion",
      enableSorting: false,
      meta: { label: "Descripción" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Descripción" />,
      // Se parte solo si la tabla no cabe (DataTable ajusta el ancho al contenido); `overflow-wrap:anywhere` parte también
      // una palabra sin espacios, que si no se montaba sobre la columna Tipo.
      cell: ({ row }) => <span className="whitespace-normal [overflow-wrap:anywhere]">{row.original.descripcion}</span>,
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
        <Badge variant="soft" color={row.original.habilitado ? "success" : "neutral"}>
          {row.original.habilitado ? "Activo" : "Inactivo"}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Acciones</span>,
      enableSorting: false,
      enableHiding: false,
      // Tres acciones en el hover de la fila; sin permiso o con el código en uso quedan deshabilitadas, no ocultas.
      size: 120,
      cell: ({ row }) => {
        const c = row.original
        return (
          <AccionesFila
            etiqueta={`Acciones del código ${c.codigo}`}
            acciones={[
              { id: "modificar", label: `Modificar ${c.codigo}`, icon: <PencilIcon />, disabled: !puedeEditar, onSelect: () => onModificar(c) },
              {
                id: "estado",
                label: `${c.habilitado ? "Inactivar" : "Activar"} ${c.codigo}`,
                icon: c.habilitado ? <ProhibitIcon /> : <CheckCircleIcon />,
                disabled: !puedeEditar,
                onSelect: () => onCambiarEstado(c),
              },
              {
                id: "eliminar",
                label: c.en_uso ? `${c.codigo} ya se usó en anotaciones: puede inactivarlo` : `Eliminar ${c.codigo}`,
                icon: <TrashIcon />,
                disabled: !puedeEliminar || c.en_uso,
                onSelect: () => onEliminar(c),
              },
            ]}
          />
        )
      },
    },
  ]
}
