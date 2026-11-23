import type { ColumnDef } from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"
import { CheckCircleIcon, PencilIcon, ProhibitIcon, TrashIcon } from "@/components/ui/icons"

import { columnaOrden } from "@/features/gestion-estudiantil/commons/components/encabezado-orden"
import type { MapaOrden } from "@/features/gestion-estudiantil/commons/utils/orden-servidor"
import { AccionesFila } from "@/features/gestion-estudiantil/commons/components/acciones-fila"
import { colorDeTipo } from "@/features/gestion-estudiantil/observador/api/ui-mappings"
import type { CodigoRow } from "@/features/gestion-estudiantil/catalogo-anotaciones/api/types"

/** Columnas que el backend ordena (`BODY.ORDEN`): id de columna → valor de ORDEN. */
export const ORDEN_CODIGOS: MapaOrden = {
  codigo: "codigo",
  descripcion: "descripcion",
  tipo: "tipo",
  estado: "estado",
}

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
      ...columnaOrden<CodigoRow>(ORDEN_CODIGOS, "codigo", "Código"),
      accessorKey: "codigo",
      cell: ({ row }) => <span className="font-semibold">{row.original.codigo}</span>,
    },
    {
      ...columnaOrden<CodigoRow>(ORDEN_CODIGOS, "descripcion", "Descripción"),
      accessorKey: "descripcion",
      cell: ({ row }) => <span className="whitespace-normal">{row.original.descripcion}</span>,
    },
    {
      ...columnaOrden<CodigoRow>(ORDEN_CODIGOS, "tipo", "Tipo"),
      accessorKey: "tipo_nombre",
      cell: ({ row }) => (
        <Badge variant="soft" color={colorDeTipo(row.original.tipo_nombre)}>
          {row.original.tipo_nombre}
        </Badge>
      ),
    },
    {
      ...columnaOrden<CodigoRow>(ORDEN_CODIGOS, "situacion", "Tipo de situación"),
      accessorKey: "situacion_nombre",
      cell: ({ row }) => row.original.situacion_nombre ?? "—",
    },
    {
      ...columnaOrden<CodigoRow>(ORDEN_CODIGOS, "estado", "Estado"),
      accessorKey: "habilitado",
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
