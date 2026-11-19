import type { ColumnDef } from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

import { anchoAccionesFila } from "@/features/gestion-estudiantil/commons/utils/acciones-fila"
import type { TableroRow } from "@/features/gestion-estudiantil/prevencion/api/types"
import {
  ESTADO_PLAN_COLOR,
  ESTADO_PLAN_ETIQUETA,
  NIVEL_COLOR,
  SEVERIDAD_SALUD_MENTAL_ETIQUETA,
} from "@/features/gestion-estudiantil/prevencion/api/ui-mappings"
import { etiquetasAlertas } from "@/features/gestion-estudiantil/prevencion/utils/alertas"
import {
  ACCIONES_TABLERO,
  MenuAccionesTablero,
  type AccionTablero,
} from "@/features/gestion-estudiantil/prevencion/components/tablero/menu-acciones-tablero"

interface ColumnasOpciones {
  /** Nombre de la sede y de la jornada por grupo (la fila solo trae el pk de la sede y del grupo). */
  sedePorGrupo: ReadonlyMap<number, string>
  jornadaPorGrupo: ReadonlyMap<number, string>
  onAccion: (fila: TableroRow, accion: AccionTablero) => void
}

const columna = (id: string, titulo: string) => ({
  id,
  enableSorting: false,
  meta: { label: titulo },
  // Encabezado plano: el backend no tiene parámetro de orden, así que no se ofrece el menú con flechas.
  header: () => <div className="text-sm font-medium">{titulo}</div>,
})

/** Columnas del Tablero de alertas (G.8.TAB.1). Sede y Jornada van ocultas de entrada. */
export function buildColumnsTablero({ sedePorGrupo, jornadaPorGrupo, onAccion }: ColumnasOpciones): ColumnDef<TableroRow>[] {
  return [
    {
      ...columna("estudiante", "Estudiante"),
      accessorKey: "estudiante_nombre",
      cell: ({ row }) => (
        <Button variant="link" size="sm" onClick={() => onAccion(row.original, "historial")}>
          {row.original.estudiante_nombre}
        </Button>
      ),
    },
    { ...columna("grado_grupo", "Grado/Grupo"), accessorKey: "grado_grupo" },
    {
      ...columna("sede", "Sede"),
      accessorFn: (r) => sedePorGrupo.get(r.fk_tgrupo) ?? "",
      cell: ({ row }) => sedePorGrupo.get(row.original.fk_tgrupo) ?? "—",
    },
    {
      ...columna("jornada", "Jornada"),
      accessorFn: (r) => jornadaPorGrupo.get(r.fk_tgrupo) ?? "",
      cell: ({ row }) => jornadaPorGrupo.get(row.original.fk_tgrupo) ?? "—",
    },
    {
      ...columna("senales", "Señales activas"),
      id: "senales",
      accessorFn: (r) => etiquetasAlertas(r.senales, r.condiciones).join(" · "),
      cell: ({ row }) => etiquetasAlertas(row.original.senales, row.original.condiciones).join(" · ") || "—",
    },
    {
      ...columna("riesgo", "Riesgo"),
      id: "riesgo",
      accessorFn: (r) => r.nivel_riesgo_nombre ?? "",
      cell: ({ row }) => {
        const { nivel_riesgo_valor: nivel, nivel_riesgo_nombre: nombre, severidad_salud_mental: severidad } = row.original
        return (
          <span className="flex flex-wrap items-center gap-2">
            {nivel ? (
              <Badge variant="soft" color={NIVEL_COLOR[nivel]}>
                <span>{nombre ?? nivel}</span>
              </Badge>
            ) : (
              <span>—</span>
            )}
            {severidad && (
              <span className="text-xs text-muted-foreground">
                Salud mental:{" "}
                <Badge variant="soft" color={severidad === "VITAL" || severidad === "CRITICO" ? "destructive" : "warning"}>
                  <span>{SEVERIDAD_SALUD_MENTAL_ETIQUETA[severidad]}</span>
                </Badge>
              </span>
            )}
          </span>
        )
      },
    },
    {
      ...columna("plan", "Plan"),
      id: "plan",
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
      id: "actions",
      header: () => <span className="sr-only">Acciones</span>,
      enableSorting: false,
      enableHiding: false,
      size: anchoAccionesFila(ACCIONES_TABLERO),
      cell: ({ row }) => <MenuAccionesTablero fila={row.original} onAccion={(accion) => onAccion(row.original, accion)} />,
    },
  ]
}
