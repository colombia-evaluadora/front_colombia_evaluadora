import type { ColumnDef } from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"
import { EyeIcon, FilePdfIcon, PencilIcon, ProhibitIcon, PushPinIcon } from "@/components/ui/icons"

import { AccionesFila } from "@/features/gestion-estudiantil/commons/components/acciones-fila"
import { anchoAccionesFila } from "@/features/gestion-estudiantil/commons/utils/acciones-fila"
import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import type { AtencionRow } from "@/features/gestion-estudiantil/inclusion/orientacion/api/types"
import type { MapaOrden } from "@/features/gestion-estudiantil/commons/utils/orden-servidor"

/** Columnas que el backend ordena (`BODY.ORDEN`): id de columna → clave de ORDEN. */
export const ORDEN_ATENCIONES: MapaOrden = {
  fecha: "fecha",
  estudiante: "estudiante",
  modalidad: "modalidad",
  origen: "origen",
  motivo: "motivo",
  proxima: "proxima_cita",
}

interface Opciones {
  onVer: (a: AtencionRow) => void
  onModificar: (a: AtencionRow) => void
  onDescargar: (a: AtencionRow) => void
  onDescargarExterna: (a: AtencionRow) => void
  onMarcarBap: (a: AtencionRow) => void
  onAnular: (a: AtencionRow) => void
}

export function buildColumnsAtenciones({ onVer, onModificar, onDescargar, onDescargarExterna, onMarcarBap, onAnular }: Opciones): ColumnDef<AtencionRow>[] {
  return [
    { id: "fecha", header: "Fecha", enableSorting: false, cell: ({ row }) => formatFecha(row.original.fecha) },
    {
      id: "estudiante",
      accessorKey: "estudiante_nombre",
      header: "Estudiante",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex flex-col items-start gap-1">
          <span>{row.original.estudiante_nombre}</span>
          {row.original.presuncion_bap && (
            <Badge variant="soft" color="warning">
              <span>Presunción de BAP</span>
            </Badge>
          )}
        </div>
      ),
    },
    { id: "modalidad", accessorKey: "modalidad_nombre", header: "Modalidad", enableSorting: false },
    { id: "origen", accessorKey: "origen_nombre", header: "Origen", enableSorting: false },
    { id: "motivo", accessorKey: "motivo_nombre", header: "Motivo", enableSorting: false },
    { id: "proxima", header: "Próxima cita", enableSorting: false, cell: ({ row }) => (row.original.proxima_cita ? formatFecha(row.original.proxima_cita) : "—") },
    {
      id: "actions",
      enableHiding: false,
      header: () => null,
      size: anchoAccionesFila(6),
      cell: ({ row }) => (
        <AccionesFila
          etiqueta={`Acciones de la atención de ${row.original.estudiante_nombre}`}
          acciones={[
            { id: "ver", label: "Ver detalle", icon: <EyeIcon />, onSelect: () => onVer(row.original) },
            { id: "modificar", label: "Modificar", icon: <PencilIcon />, disabled: !row.original.puede_modificar, onSelect: () => onModificar(row.original) },
            { id: "descargar", label: "Descargar ficha", icon: <FilePdfIcon />, disabled: !row.original.puede_descargar, onSelect: () => onDescargar(row.original) },
            { id: "externa", label: "Descargar remisión externa", icon: <FilePdfIcon />, separada: true, disabled: !row.original.puede_descargar, onSelect: () => onDescargarExterna(row.original) },
            {
              id: "bap",
              label: "Marcar presunción de BAP",
              icon: <PushPinIcon />,
              disabled: !row.original.puede_marcar_presuncion || Boolean(row.original.presuncion_bap),
              onSelect: () => onMarcarBap(row.original),
            },
            { id: "anular", label: "Anular", icon: <ProhibitIcon />, disabled: !row.original.puede_anular, onSelect: () => onAnular(row.original) },
          ]}
        />
      ),
    },
  ]
}
