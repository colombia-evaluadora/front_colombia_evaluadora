import type { ColumnDef } from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import { anchoAccionesFila } from "@/features/gestion-estudiantil/commons/utils/acciones-fila"
import type { ValoracionRow } from "@/features/gestion-estudiantil/prevencion/api/types"
import {
  ESTADO_PLAN_COLOR,
  ESTADO_PLAN_ETIQUETA,
  NIVEL_COLOR,
} from "@/features/gestion-estudiantil/prevencion/api/ui-mappings"
import {
  ACCIONES_VALORACION,
  MenuAccionesValoracion,
  type AccionValoracion,
} from "@/features/gestion-estudiantil/prevencion/components/valoraciones/menu-acciones-valoracion"

interface ColumnasOpciones {
  onAccion: (fila: ValoracionRow, accion: AccionValoracion) => void
}

const columna = (id: string, titulo: string) => ({
  id,
  enableSorting: false,
  meta: { label: titulo },
  // Encabezado plano: el backend no tiene parámetro de orden.
  header: () => <div className="text-sm font-medium">{titulo}</div>,
})

/** Columnas de Valoraciones y planes (G.8.VAL.1): Fecha · Estudiante · Nivel de riesgo · Plan · Acciones vencidas. */
export function buildColumnsValoraciones({ onAccion }: ColumnasOpciones): ColumnDef<ValoracionRow>[] {
  return [
    {
      ...columna("fecha", "Fecha de valoración"),
      accessorKey: "fecha",
      cell: ({ row }) => formatFecha(row.original.fecha),
    },
    {
      ...columna("estudiante", "Estudiante"),
      accessorKey: "estudiante_nombre",
      cell: ({ row }) => (
        <span className="flex flex-wrap items-center gap-2">
          <Button variant="link" size="sm" onClick={() => onAccion(row.original, "ver")}>
            {row.original.estudiante_nombre}
          </Button>
          {row.original.anulada && (
            <Badge variant="soft" color="muted">
              <span>Anulada</span>
            </Badge>
          )}
        </span>
      ),
    },
    { ...columna("grado_grupo", "Grado/Grupo"), accessorKey: "grado_grupo" },
    {
      ...columna("nivel", "Nivel de riesgo"),
      accessorFn: (r) => r.nivel_riesgo_nombre ?? "",
      cell: ({ row }) => {
        const { nivel_riesgo_valor: nivel, nivel_riesgo_nombre: nombre } = row.original
        return nivel ? (
          <Badge variant="soft" color={NIVEL_COLOR[nivel]}>
            <span>{nombre ?? nivel}</span>
          </Badge>
        ) : (
          "—"
        )
      },
    },
    {
      ...columna("plan", "Plan"),
      accessorFn: (r) => (r.estado_plan ? ESTADO_PLAN_ETIQUETA[r.estado_plan] : ""),
      cell: ({ row }) => {
        const estado = row.original.estado_plan
        return estado ? (
          <Badge variant="soft" color={ESTADO_PLAN_COLOR[estado]}>
            <span>{ESTADO_PLAN_ETIQUETA[estado]}</span>
          </Badge>
        ) : (
          "—"
        )
      },
    },
    {
      ...columna("acciones_vencidas", "Acciones vencidas"),
      accessorFn: (r) => r.acciones_vencidas ?? 0,
      cell: ({ row }) => (row.original.acciones_vencidas ? row.original.acciones_vencidas : "—"),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Acciones</span>,
      enableSorting: false,
      enableHiding: false,
      size: anchoAccionesFila(ACCIONES_VALORACION),
      cell: ({ row }) => <MenuAccionesValoracion fila={row.original} onAccion={(accion) => onAccion(row.original, accion)} />,
    },
  ]
}
