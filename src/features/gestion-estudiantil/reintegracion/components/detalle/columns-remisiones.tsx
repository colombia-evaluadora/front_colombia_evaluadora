import type { ColumnDef } from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"
import { ChatTextIcon, ClipboardTextIcon, EyeIcon, FileDownloadOutlinedIcon } from "@/components/ui/icons"

import { AccionesFila } from "@/features/gestion-estudiantil/commons/components/acciones-fila"
import { anchoAccionesFila } from "@/features/gestion-estudiantil/commons/utils/acciones-fila"
import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import type { RemisionRow } from "@/features/gestion-estudiantil/reintegracion/api/types"

const ACCIONES = 4

export interface AccionesRemision {
  onVer: (fila: RemisionRow) => void
  onResponder: (fila: RemisionRow) => void
  onGestion: (fila: RemisionRow) => void
  onDescargar: (fila: RemisionRow) => void
  /** pk de la remisión cuyo documento se está generando. */
  descargando: number | null
}

const columna = (id: string, titulo: string) => ({
  id,
  enableSorting: false,
  meta: { label: titulo },
  header: () => <div className="text-sm font-medium">{titulo}</div>,
})

/**
 * Columnas de Remisiones (G.9.REM.2): Fecha de remisión · Entidad · Motivo · Fecha esperada de respuesta · Estado
 * (con la marca de plazo vencido) y cuatro acciones en el hover, las de escritura según las banderas de la fila.
 */
export function buildColumnsRemisiones({
  onVer,
  onResponder,
  onGestion,
  onDescargar,
  descargando,
}: AccionesRemision): ColumnDef<RemisionRow>[] {
  return [
    { ...columna("fecha_remision", "Fecha de remisión"), accessorFn: (f) => formatFecha(f.fecha_remision) },
    { ...columna("entidad", "Entidad"), accessorKey: "entidad_nombre" },
    {
      ...columna("motivo", "Motivo"),
      accessorKey: "motivo",
      cell: ({ row }) => <span className="block max-w-96 whitespace-normal">{row.original.motivo}</span>,
    },
    {
      ...columna("fecha_esperada", "Fecha esperada de respuesta"),
      accessorFn: (f) => formatFecha(f.fecha_esperada) || "—",
    },
    {
      ...columna("estado", "Estado"),
      accessorKey: "estado_etiqueta",
      cell: ({ row }) => {
        const r = row.original
        return (
          <div className="flex flex-wrap items-center gap-1">
            <Badge variant="soft" color={r.estado === "RESPONDIDA" ? "success" : "info"}>
              <span>{r.estado_etiqueta}</span>
            </Badge>
            {r.vencida && (
              <Badge variant="soft" color="destructive">
                <span>Respuesta pendiente — plazo vencido</span>
              </Badge>
            )}
          </div>
        )
      },
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Acciones</span>,
      enableSorting: false,
      enableHiding: false,
      size: anchoAccionesFila(ACCIONES),
      cell: ({ row }) => {
        const r = row.original
        return (
          <AccionesFila
            etiqueta={`Acciones de la remisión a ${r.entidad_nombre}`}
            acciones={[
              { id: "ver", label: "Ver detalle", icon: <EyeIcon />, onSelect: () => onVer(r) },
              { id: "responder", label: "Registrar respuesta", icon: <ChatTextIcon />, disabled: !r.puede_responder, onSelect: () => onResponder(r) },
              {
                id: "gestion",
                label: "Registrar gestión",
                icon: <ClipboardTextIcon />,
                disabled: !r.puede_registrar_gestion,
                onSelect: () => onGestion(r),
              },
              {
                id: "descargar",
                label: "Descargar remisión externa",
                icon: <FileDownloadOutlinedIcon />,
                disabled: descargando === r.id,
                onSelect: () => onDescargar(r),
              },
            ]}
          />
        )
      },
    },
  ]
}
