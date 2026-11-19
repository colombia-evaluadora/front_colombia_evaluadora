import type { ColumnDef } from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"

import type { IndicadorGestionRow, IndicadorRow } from "@/features/gestion-estudiantil/prevencion/api/types"
import {
  formatPorcentaje,
  porcentajeBeneficiarios,
  porcentajeNoBeneficiarios,
  textoRetiros,
} from "@/features/gestion-estudiantil/prevencion/utils/indicadores"

/** Encabezado plano de las tablas de indicadores; las cifras van a la derecha. */
const columnaIndicador = (id: string, titulo: string, cifra = false) => ({
  id,
  enableSorting: false,
  meta: { label: titulo },
  header: () => <div className={cifra ? "text-right text-sm font-medium" : "text-sm font-medium"}>{titulo}</div>,
})

const cifra = (texto: string) => <span className="block text-right tabular-nums">{texto}</span>

/** Columnas del agrupamiento (G.8.IND.1): Sede/Grado/Responsable · Asistencia · Reprobación · En riesgo · Retiros (motivo). */
export function buildColumnsIndicadores(agrupacion: string): ColumnDef<IndicadorRow>[] {
  return [
    {
      ...columnaIndicador("etiqueta", agrupacion),
      accessorKey: "etiqueta",
      cell: ({ row }) => <span className="font-medium">{row.original.etiqueta ?? "—"}</span>,
    },
    {
      ...columnaIndicador("asistencia", "Asistencia", true),
      cell: ({ row }) => cifra(formatPorcentaje(row.original.asistencia_pct)),
    },
    {
      ...columnaIndicador("reprobacion", "Reprobación", true),
      cell: ({ row }) => cifra(formatPorcentaje(row.original.reprobacion_pct)),
    },
    {
      ...columnaIndicador("en_riesgo", "En riesgo", true),
      cell: ({ row }) => cifra(String(row.original.en_riesgo)),
    },
    {
      ...columnaIndicador("retiros", "Retiros (motivo)"),
      cell: ({ row }) => textoRetiros(row.original.retiros, row.original.motivo_principal),
    },
  ]
}

/** Efectividad de las estrategias (solo lectura): beneficiarios que siguen Cursando frente a los no beneficiarios. */
export const COLUMNAS_ESTRATEGIAS: ColumnDef<IndicadorRow>[] = [
  {
    ...columnaIndicador("etiqueta", "Estrategia"),
    cell: ({ row }) => <span className="font-medium">{row.original.etiqueta ?? "—"}</span>,
  },
  {
    ...columnaIndicador("beneficiarios", "Beneficiarios que siguen Cursando", true),
    accessorFn: (r) => porcentajeBeneficiarios(r.retenidos, r.retenidos_base),
    cell: ({ row }) => cifra(formatPorcentaje(porcentajeBeneficiarios(row.original.retenidos, row.original.retenidos_base))),
  },
  {
    ...columnaIndicador("no_beneficiarios", "No beneficiarios", true),
    accessorFn: (r) => porcentajeNoBeneficiarios(r.motivo_principal),
    cell: ({ row }) => cifra(formatPorcentaje(porcentajeNoBeneficiarios(row.original.motivo_principal))),
  },
]

const noAplica = (valor: string) => (valor === "NO_APLICA" ? "No aplica" : valor)

/** Indicadores de gestión de alertas (IE-01; IE-02 y SED-01 llegan NO_APLICA). */
export const COLUMNAS_GESTION: ColumnDef<IndicadorGestionRow>[] = [
  {
    ...columnaIndicador("nombre", "Establecimiento / Sede"),
    cell: ({ row }) =>
      row.original.nivel === "ESTABLECIMIENTO" ? (
        <span className="font-medium">{row.original.establecimiento_nombre} (total)</span>
      ) : (
        (row.original.sede_nombre ?? "—")
      ),
  },
  {
    ...columnaIndicador("esperadas", "Sesiones esperadas", true),
    cell: ({ row }) => cifra(String(row.original.esperadas)),
  },
  {
    ...columnaIndicador("a_tiempo", "Registradas a tiempo", true),
    cell: ({ row }) => cifra(String(row.original.a_tiempo)),
  },
  {
    ...columnaIndicador("porcentaje", "IE-01 · Cumplimiento del registro", true),
    cell: ({ row }) => cifra(formatPorcentaje(row.original.porcentaje)),
  },
  {
    ...columnaIndicador("meta", "Meta", true),
    cell: ({ row }) => cifra(formatPorcentaje(row.original.meta)),
  },
  {
    ...columnaIndicador("cumple", "Cumple"),
    cell: ({ row }) =>
      row.original.cumple == null ? (
        "—"
      ) : (
        <Badge variant="soft" color={row.original.cumple ? "success" : "destructive"}>
          <span>{row.original.cumple ? "Cumple" : "No cumple"}</span>
        </Badge>
      ),
  },
  {
    ...columnaIndicador("ie02", "IE-02 · Atención oportuna de alertas"),
    cell: ({ row }) => noAplica(row.original.ie02),
  },
  {
    ...columnaIndicador("sed01", "SED-01 · Instituciones que cumplen"),
    cell: ({ row }) => noAplica(row.original.sed01),
  },
]
