import type { ColumnDef } from "@tanstack/react-table"

import { DataTableColumnHeader } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { CheckCircleIcon, PencilIcon, ProhibitIcon, TrashIcon } from "@/components/ui/icons"

import { AccionesFila } from "@/features/gestion-estudiantil/commons/components/acciones-fila"
import type { ClasificacionRow, SancionRow } from "@/features/gestion-estudiantil/configuracion/api/types"

interface Acciones<T> {
  puedeEditar: boolean
  puedeEliminar: boolean
  onModificar: (fila: T) => void
  onCambiarEstado: (fila: T) => void
  onEliminar: (fila: T) => void
}

type Fila = { nombre: string; habilitado: boolean; en_uso: boolean }

function texto<T>(id: string, titulo: string, valor: (f: T) => string, extra: Partial<ColumnDef<T>> = {}): ColumnDef<T> {
  return {
    id,
    accessorFn: valor,
    enableSorting: false,
    meta: { label: titulo },
    header: ({ column }) => <DataTableColumnHeader column={column} title={titulo} />,
    ...extra,
  }
}

function estado<T extends Fila>(): ColumnDef<T> {
  return texto<T>("estado", "Estado", (f) => (f.habilitado ? "Activo" : "Inactivo"), {
    cell: ({ row }) => (
      <Badge variant="soft" color={row.original.habilitado ? "success" : "neutral"}>
        {row.original.habilitado ? "Activo" : "Inactivo"}
      </Badge>
    ),
  })
}

/** Modificar · Activar/Inactivar · Eliminar en el hover; sin permiso o en uso quedan deshabilitadas, no ocultas. */
function acciones<T extends Fila>({ puedeEditar, puedeEliminar, onModificar, onCambiarEstado, onEliminar }: Acciones<T>): ColumnDef<T> {
  return {
    id: "actions",
    header: () => <span className="sr-only">Acciones</span>,
    enableSorting: false,
    enableHiding: false,
    size: 120,
    cell: ({ row }) => {
      const f = row.original
      return (
        <AccionesFila
          etiqueta={`Acciones de ${f.nombre}`}
          acciones={[
            { id: "modificar", label: `Modificar ${f.nombre}`, icon: <PencilIcon />, disabled: !puedeEditar, onSelect: () => onModificar(f) },
            {
              id: "estado",
              label: `${f.habilitado ? "Inactivar" : "Activar"} ${f.nombre}`,
              icon: f.habilitado ? <ProhibitIcon /> : <CheckCircleIcon />,
              disabled: !puedeEditar,
              onSelect: () => onCambiarEstado(f),
            },
            {
              id: "eliminar",
              label: f.en_uso ? `${f.nombre} ya se usó en procesos disciplinarios: puede inactivarla` : `Eliminar ${f.nombre}`,
              icon: <TrashIcon />,
              disabled: !puedeEliminar || f.en_uso,
              onSelect: () => onEliminar(f),
            },
          ]}
        />
      )
    },
  }
}

/** G.10.PRD.CLA.1: Nombre · Descripción · Estado. */
export function buildColumnsClasificaciones(a: Acciones<ClasificacionRow>): ColumnDef<ClasificacionRow>[] {
  return [
    texto<ClasificacionRow>("nombre", "Nombre", (f) => f.nombre, {
      cell: ({ row }) => <span className="font-semibold">{row.original.nombre}</span>,
    }),
    texto<ClasificacionRow>("descripcion", "Descripción", (f) => f.descripcion ?? "", {
      cell: ({ row }) => <span className="whitespace-normal [overflow-wrap:anywhere]">{row.original.descripcion || "—"}</span>,
    }),
    estado<ClasificacionRow>(),
    acciones(a),
  ]
}

/** G.10.PRD.SAN.1: Nombre · Instancia que decide · Duración · Efecto de la sanción · Estado. */
export function buildColumnsSanciones(a: Acciones<SancionRow>): ColumnDef<SancionRow>[] {
  return [
    texto<SancionRow>("nombre", "Nombre", (f) => f.nombre, {
      cell: ({ row }) => <span className="font-semibold whitespace-normal [overflow-wrap:anywhere]">{row.original.nombre}</span>,
    }),
    texto<SancionRow>("instancia", "Instancia que decide", (f) => f.instancia_nombre),
    texto<SancionRow>("duracion", "Duración", (f) => (f.tiene_duracion ? "Sí" : "No")),
    texto<SancionRow>("efecto", "Efecto de la sanción", (f) => f.efecto_nombre ?? "—"),
    estado<SancionRow>(),
    acciones(a),
  ]
}
