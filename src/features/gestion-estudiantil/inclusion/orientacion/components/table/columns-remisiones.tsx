import type { ColumnDef } from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"
import { ClipboardAddIcon, FilePdfIcon, ProhibitIcon } from "@/components/ui/icons"

import { AccionesFila } from "@/features/gestion-estudiantil/commons/components/acciones-fila"
import { anchoAccionesFila } from "@/features/gestion-estudiantil/commons/utils/acciones-fila"
import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import type { RemisionRow } from "@/features/gestion-estudiantil/inclusion/orientacion/api/types"
import type { MapaOrden } from "@/features/gestion-estudiantil/commons/utils/orden-servidor"

/** Columnas que el backend ordena (`BODY.ORDEN`): id de columna → clave de ORDEN. */
export const ORDEN_REMISIONES: MapaOrden = {
  fecha: "fecha",
  estudiante: "estudiante",
  motivo: "motivo",
  remite: "responsable",
  estado: "estado",
}

interface Opciones {
  onRegistrar: (r: RemisionRow) => void
  onDescargar: (r: RemisionRow) => void
  onAnular: (r: RemisionRow) => void
}

export function buildColumnsRemisiones({ onRegistrar, onDescargar, onAnular }: Opciones): ColumnDef<RemisionRow>[] {
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
      size: anchoAccionesFila(3),
      cell: ({ row }) => (
        <AccionesFila
          etiqueta={`Acciones de la remisión de ${row.original.estudiante_nombre}`}
          acciones={[
            {
              id: "registrar",
              label: "Registrar atención",
              icon: <ClipboardAddIcon />,
              disabled: !row.original.puede_registrar_atencion || row.original.estado_codigo === "ATENDIDA",
              onSelect: () => onRegistrar(row.original),
            },
            { id: "descargar", label: "Descargar remisión", icon: <FilePdfIcon />, disabled: !row.original.puede_descargar, onSelect: () => onDescargar(row.original) },
            { id: "anular", label: "Anular", icon: <ProhibitIcon />, disabled: !row.original.puede_anular, onSelect: () => onAnular(row.original) },
          ]}
        />
      ),
    },
  ]
}
