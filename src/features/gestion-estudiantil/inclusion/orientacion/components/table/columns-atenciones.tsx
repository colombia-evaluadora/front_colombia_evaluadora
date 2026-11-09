import type { ColumnDef } from "@tanstack/react-table"

import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { EyeIcon, FilePdfIcon, PencilIcon, ProhibitIcon } from "@/components/ui/icons"

import { formatFecha } from "@/features/gestion-estudiantil/observador/api/ui-mappings"
import type { AtencionRow } from "@/features/gestion-estudiantil/inclusion/orientacion/api/types"
import { MenuFila } from "@/features/gestion-estudiantil/inclusion/orientacion/components/table/menu-fila"

interface Opciones {
  puedeRegistrar: boolean
  onVer: (a: AtencionRow) => void
  onModificar: (a: AtencionRow) => void
  onDescargar: (a: AtencionRow) => void
  puedeAnular: boolean
  onAnular: (a: AtencionRow) => void
}

export function buildColumnsAtenciones({ puedeRegistrar, onVer, onModificar, onDescargar, puedeAnular, onAnular }: Opciones): ColumnDef<AtencionRow>[] {
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
          <DropdownMenuItem onClick={() => onVer(row.original)}><EyeIcon />Ver detalle</DropdownMenuItem>
          <DropdownMenuItem disabled={!puedeRegistrar} onClick={() => onModificar(row.original)}><PencilIcon />Modificar</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onDescargar(row.original)}><FilePdfIcon />Descargar ficha</DropdownMenuItem>
          {puedeAnular && <DropdownMenuItem onClick={() => onAnular(row.original)}><ProhibitIcon />Anular</DropdownMenuItem>}
        </MenuFila>
      ),
    },
  ]
}
