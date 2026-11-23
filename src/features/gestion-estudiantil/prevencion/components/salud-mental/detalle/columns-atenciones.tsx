import type { ColumnDef } from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"
import { ChatTextIcon, ClipboardTextIcon, EyeIcon, FileDownloadOutlinedIcon } from "@/components/ui/icons"

import { AccionesFila } from "@/features/gestion-estudiantil/commons/components/acciones-fila"
import { anchoAccionesFila } from "@/features/gestion-estudiantil/commons/utils/acciones-fila"
import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import type { SenalSMAtencion } from "@/features/gestion-estudiantil/prevencion/api/types"

export type AccionAtencion = "ver" | "descargar" | "gestion" | "respuesta"

interface Opciones {
  onAccion: (fila: SenalSMAtencion, accion: AccionAtencion) => void
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
 * Columnas de la Atención (G.8.SAL.8): Fecha · Acción realizada · Entidad remitida · Fecha esperada · Estado de la
 * remisión; las filas sin remisión muestran «—» en las de remisión. Acciones en el hover según las banderas.
 */
export function buildColumnsAtenciones({ onAccion, descargando }: Opciones): ColumnDef<SenalSMAtencion>[] {
  return [
    { ...columna("fecha", "Fecha"), accessorFn: (a) => formatFecha(a.fecha) },
    {
      ...columna("accion", "Acción realizada"),
      accessorKey: "accion",
      cell: ({ row }) => <span className="block max-w-96 whitespace-normal">{row.original.accion}</span>,
    },
    { ...columna("entidad", "Entidad remitida"), accessorFn: (a) => a.entidad_nombre ?? "—" },
    {
      ...columna("fecha_esperada", "Fecha esperada"),
      accessorFn: (a) => (a.remision ? formatFecha(a.remision.fecha_esperada) || "—" : "—"),
    },
    {
      ...columna("estado", "Estado de la remisión"),
      accessorFn: (a) => a.remision?.estado_etiqueta ?? "—",
      cell: ({ row }) => {
        const r = row.original.remision
        if (!r) return "—"
        return (
          <div className="flex flex-wrap items-center gap-1">
            <Badge variant="soft" color={r.estado === "RESPONDIDA" ? "success" : "info"}>
              <span>{r.estado_etiqueta}</span>
            </Badge>
            {r.estado === "ENVIADA" && r.vencida && (
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
      size: anchoAccionesFila(4),
      cell: ({ row }) => {
        const a = row.original
        const r = a.remision
        return (
          <AccionesFila
            etiqueta={`Acciones de la atención del ${formatFecha(a.fecha)}`}
            acciones={[
              { id: "ver", label: "Ver detalle", icon: <EyeIcon />, disabled: !r, onSelect: () => onAccion(a, "ver") },
              {
                id: "descargar",
                label: "Descargar remisión externa",
                icon: <FileDownloadOutlinedIcon />,
                disabled: !r || descargando === r.id,
                onSelect: () => onAccion(a, "descargar"),
              },
              {
                id: "gestion",
                label: "Registrar gestión",
                icon: <ClipboardTextIcon />,
                disabled: !r?.puede_registrar_gestion,
                onSelect: () => onAccion(a, "gestion"),
              },
              {
                id: "respuesta",
                label: "Registrar respuesta",
                icon: <ChatTextIcon />,
                disabled: !r?.puede_responder,
                onSelect: () => onAccion(a, "respuesta"),
              },
            ]}
          />
        )
      },
    },
  ]
}
