import type { ColumnDef } from "@tanstack/react-table"

import { DropdownMenuItem } from "@/components/ui/dropdown-menu"

import { formatFecha } from "@/features/gestion-estudiantil/observador/api/ui-mappings"
import type { AtencionRow } from "@/features/gestion-estudiantil/inclusion/orientacion/api/types"
import { MenuFila } from "@/features/gestion-estudiantil/inclusion/orientacion/components/table/menu-fila"

interface Opciones {
  puedeRegistrar: boolean
  onVer: (a: AtencionRow) => void
  onModificar: (a: AtencionRow) => void
  onDescargar: (a: AtencionRow) => void
}

export function buildColumnsAtenciones({ puedeRegistrar, onVer, onModificar, onDescargar }: Opciones): ColumnDef<AtencionRow>[] {
  return [
    { id: "fecha", header: "Fecha", enableSorting: false, cell: ({ row }) => formatFecha(row.original.fecha) },
    { id: "estudiante", accessorKey: "estudiante_nombre", header: "Estudiante", enableSorting: false },
    { id: "modalidad", accessorKey: "modalidad_nombre", header: "Modalidad", enableSorting: false },
    { id: "origen", accessorKey: "origen_nombre", header: "Origen", enableSorting: false },
    { id: "motivo", accessorKey: "motivo_nombre", header: "Motivo", enableSorting: false },
    { id: "proxima", header: "Próxima cita", enableSorting: false, cell: ({ row }) => (row.original.proxima_cita ? formatFecha(row.original.proxima_cita) : "—") },
    {
      id: "actions",
      enableHiding: false,
      header: () => null,
      cell: ({ row }) => (
        <MenuFila etiqueta={`Acciones de la atención de ${row.original.estudiante_nombre}`}>
          <DropdownMenuItem onClick={() => onVer(row.original)}>Ver detalle</DropdownMenuItem>
          <DropdownMenuItem disabled={!puedeRegistrar} onClick={() => onModificar(row.original)}>Modificar</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onDescargar(row.original)}>Descargar ficha</DropdownMenuItem>
        </MenuFila>
      ),
    },
  ]
}
