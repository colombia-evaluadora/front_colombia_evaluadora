import type { ColumnDef } from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { ClipboardAddIcon, FilePdfIcon, ProhibitIcon } from "@/components/ui/icons"

import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import type { RemisionRow } from "@/features/gestion-estudiantil/inclusion/orientacion/api/types"
import { MenuFila } from "@/features/gestion-estudiantil/inclusion/orientacion/components/table/menu-fila"

interface Opciones {
  puedeRegistrar: boolean
  onRegistrar: (r: RemisionRow) => void
  onDescargar: (r: RemisionRow) => void
  puedeAnular: boolean
  onAnular: (r: RemisionRow) => void
}

export function buildColumnsRemisiones({ puedeRegistrar, onRegistrar, onDescargar, puedeAnular, onAnular }: Opciones): ColumnDef<RemisionRow>[] {
  return [
    { id: "fecha", header: "Fecha", enableSorting: false, cell: ({ row }) => formatFecha(row.original.fecha) },
    { id: "estudiante", accessorKey: "estudiante_nombre", header: "Estudiante", enableSorting: false },
    { id: "motivo", accessorKey: "motivo_nombre", header: "Motivo", enableSorting: false },
    { id: "remite", header: "Responsable de enseñanza", enableSorting: false, cell: ({ row }) => row.original.remite_nombre ?? "—" },
    {
      id: "estado",
      header: "Estado",
      enableSorting: false,
      cell: ({ row }) => (
        <Badge variant="soft" color={row.original.estado_codigo === "ATENDIDA" ? "success" : "warning"}>
          <span>{row.original.estado_nombre}</span>
        </Badge>
      ),
    },
    {
      id: "actions",
      enableHiding: false,
      header: () => null,
      cell: ({ row }) => (
        <MenuFila etiqueta={`Acciones de la remisión de ${row.original.estudiante_nombre}`}>
          <DropdownMenuItem disabled={!puedeRegistrar || row.original.estado_codigo === "ATENDIDA"} onClick={() => onRegistrar(row.original)}>
            <ClipboardAddIcon />
            Registrar atención
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onDescargar(row.original)}><FilePdfIcon />Descargar remisión</DropdownMenuItem>
          {puedeAnular && <DropdownMenuItem onClick={() => onAnular(row.original)}><ProhibitIcon />Anular</DropdownMenuItem>}
        </MenuFila>
      ),
    },
  ]
}
