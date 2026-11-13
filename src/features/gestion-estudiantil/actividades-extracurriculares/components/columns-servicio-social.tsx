import type { ColumnDef } from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { EyeIcon } from "@/components/ui/icons"

import { formatNumero } from "@/features/gestion-estudiantil/actividades-extracurriculares/utils/formatos-actividad"
import { AccionesFila } from "@/features/gestion-estudiantil/commons/components/acciones-fila"
import { anchoAccionesFila } from "@/features/gestion-estudiantil/commons/utils/acciones-fila"
import type { ServicioSocialRow } from "@/features/gestion-estudiantil/actividades-extracurriculares/api/types"
import {
  ESTADO_SERVICIO_SOCIAL_COLOR,
  ESTADO_SERVICIO_SOCIAL_ETIQUETA,
} from "@/features/gestion-estudiantil/actividades-extracurriculares/api/ui-mappings"

interface ColumnasOpciones {
  onVer: (fila: ServicioSocialRow) => void
}

const columna = (id: string, titulo: string) => ({
  id,
  enableSorting: false,
  meta: { label: titulo },
  header: () => <div className="text-sm font-medium">{titulo}</div>,
})

/** Columnas del listado de servicio social (G.5.SOC.LIS): Estudiante · Grado/Grupo · Horas · Estado; Sede y Jornada no vienen en la salida. */
export function buildColumnsServicioSocial({ onVer }: ColumnasOpciones): ColumnDef<ServicioSocialRow>[] {
  return [
    {
      ...columna("estudiante", "Estudiante"),
      accessorFn: (f) => f.estudiante_nombre,
      cell: ({ row }) => (
        <div className="flex flex-col items-start">
          <Button variant="link" size="sm" onClick={() => onVer(row.original)}>
            {row.original.estudiante_nombre}
          </Button>
          <span className="px-2 text-xs text-muted-foreground">{row.original.estudiante_documento}</span>
        </div>
      ),
    },
    { ...columna("grado_grupo", "Grado/Grupo"), accessorKey: "grado_grupo" },
    {
      ...columna("horas", "Horas"),
      accessorFn: (f) => `${formatNumero(f.horas)} de ${formatNumero(f.horas_requeridas)}`,
      cell: ({ row }) => {
        const { horas, horas_requeridas: requeridas } = row.original
        return (
          <Progress
            value={Math.min(horas, requeridas)}
            max={requeridas || 1}
            className="flex-nowrap items-center gap-3"
          >
            <span className="order-last text-sm tabular-nums">
              {formatNumero(horas)} de {formatNumero(requeridas)}
            </span>
          </Progress>
        )
      },
    },
    {
      ...columna("estado", "Estado"),
      accessorFn: (f) => ESTADO_SERVICIO_SOCIAL_ETIQUETA[f.estado],
      cell: ({ row }) => (
        <Badge variant="soft" color={ESTADO_SERVICIO_SOCIAL_COLOR[row.original.estado]}>
          <span>{ESTADO_SERVICIO_SOCIAL_ETIQUETA[row.original.estado]}</span>
        </Badge>
      ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Acciones</span>,
      enableSorting: false,
      enableHiding: false,
      size: anchoAccionesFila(1),
      cell: ({ row }) => (
        <AccionesFila
          etiqueta={`Acciones de ${row.original.estudiante_nombre}`}
          acciones={[{ id: "ver", label: "Ver detalle", icon: <EyeIcon />, onSelect: () => onVer(row.original) }]}
        />
      ),
    },
  ]
}
