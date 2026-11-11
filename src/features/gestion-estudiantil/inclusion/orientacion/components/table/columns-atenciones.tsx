import type { ColumnDef } from "@tanstack/react-table"

import { EyeIcon, FilePdfIcon, PencilIcon, ProhibitIcon } from "@/components/ui/icons"

import { AccionesFila } from "@/features/gestion-estudiantil/commons/components/acciones-fila"
import { anchoAccionesFila } from "@/features/gestion-estudiantil/commons/utils/acciones-fila"
import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import type { AtencionRow } from "@/features/gestion-estudiantil/inclusion/orientacion/api/types"

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
      size: anchoAccionesFila(4),
      cell: ({ row }) => (
        <AccionesFila
          etiqueta={`Acciones de la atención de ${row.original.estudiante_nombre}`}
          acciones={[
            { id: "ver", label: "Ver detalle", icon: <EyeIcon />, onSelect: () => onVer(row.original) },
            { id: "modificar", label: "Modificar", icon: <PencilIcon />, disabled: !puedeRegistrar, onSelect: () => onModificar(row.original) },
            { id: "descargar", label: "Descargar ficha", icon: <FilePdfIcon />, onSelect: () => onDescargar(row.original) },
            { id: "anular", label: "Anular", icon: <ProhibitIcon />, disabled: !puedeAnular, onSelect: () => onAnular(row.original) },
          ]}
        />
      ),
    },
  ]
}
