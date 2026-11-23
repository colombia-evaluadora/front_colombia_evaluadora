import type { ColumnDef } from "@tanstack/react-table"

import { EyeIcon, FileDownloadOutlinedIcon, PencilIcon } from "@/components/ui/icons"

import { AccionesFila } from "@/features/gestion-estudiantil/commons/components/acciones-fila"
import { anchoAccionesFila } from "@/features/gestion-estudiantil/commons/utils/acciones-fila"
import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import type { IntervencionRow } from "@/features/gestion-estudiantil/reintegracion/api/types"
import { EnlaceEvidencia } from "@/features/gestion-estudiantil/reintegracion/components/detalle/enlace-evidencia"
import {
  fechaDeIntervencion,
  realizacionDe,
  resumenCompromisos,
} from "@/features/gestion-estudiantil/reintegracion/utils/intervenciones"

const ACCIONES = 3

export interface AccionesIntervencion {
  onVer: (fila: IntervencionRow) => void
  onModificar: (fila: IntervencionRow) => void
  onDescargar: (fila: IntervencionRow) => void
  /** pk de la intervención cuya ficha se está generando. */
  descargando: number | null
}

const columna = (id: string, titulo: string) => ({
  id,
  enableSorting: false,
  meta: { label: titulo },
  // Encabezado plano: el orden es el cronológico del backend.
  header: () => <div className="text-sm font-medium">{titulo}</div>,
})

/**
 * Columnas de Intervenciones (G.9.INT.2): Fecha · Tipo de intervención · Realización · Resultado · Compromisos y
 * evidencias, y las acciones en el hover (Ver detalle, Modificar, Descargar ficha), cada una con su bandera.
 */
export function buildColumnsIntervenciones({
  onVer,
  onModificar,
  onDescargar,
  descargando,
}: AccionesIntervencion): ColumnDef<IntervencionRow>[] {
  return [
    { ...columna("fecha", "Fecha"), accessorFn: (f) => formatFecha(fechaDeIntervencion(f)) },
    { ...columna("tipo", "Tipo de intervención"), accessorKey: "tipo_nombre" },
    { ...columna("realizacion", "Realización"), accessorFn: (f) => realizacionDe(f) },
    { ...columna("resultado", "Resultado"), accessorFn: (f) => f.resultado_nombre ?? "—" },
    {
      ...columna("compromisos_evidencias", "Compromisos y evidencias"),
      accessorFn: (f) => [resumenCompromisos(f.compromisos), ...f.evidencias.map((e) => e.nombre)].filter(Boolean).join(" "),
      cell: ({ row }) => {
        const { compromisos, evidencias } = row.original
        const resumen = resumenCompromisos(compromisos)
        if (!resumen && evidencias.length === 0) return <span className="text-muted-foreground">—</span>
        return (
          <div className="flex max-w-96 flex-col items-start gap-1 whitespace-normal">
            {resumen && <span className="text-sm">{resumen}</span>}
            {evidencias.map((e) => (
              <EnlaceEvidencia key={e.id} id={e.id} nombre={e.nombre} />
            ))}
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
        const f = row.original
        return (
          <AccionesFila
            etiqueta={`Acciones de la intervención ${f.tipo_nombre}`}
            acciones={[
              { id: "ver", label: "Ver detalle", icon: <EyeIcon />, onSelect: () => onVer(f) },
              { id: "modificar", label: "Modificar", icon: <PencilIcon />, disabled: !f.puede_modificar, onSelect: () => onModificar(f) },
              {
                id: "ficha",
                label: "Descargar ficha",
                icon: <FileDownloadOutlinedIcon />,
                disabled: !f.tiene_ficha || descargando === f.id,
                onSelect: () => onDescargar(f),
              },
            ]}
          />
        )
      },
    },
  ]
}
