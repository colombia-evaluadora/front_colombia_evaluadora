import type { ColumnDef } from "@tanstack/react-table"

import { Button } from "@/components/ui/button"

import { abreviarPersona } from "@/features/gestion-estudiantil/commons/utils/formatos"
import { anchoAccionesFila } from "@/features/gestion-estudiantil/commons/utils/acciones-fila"
import type { EstrategiaRow } from "@/features/gestion-estudiantil/prevencion/api/types"
import {
  ACCIONES_ESTRATEGIA,
  type AccionEstrategia,
} from "@/features/gestion-estudiantil/prevencion/components/estrategias/acciones-estrategia"
import { BadgeEstadoEstrategia } from "@/features/gestion-estudiantil/prevencion/components/estrategias/badge-estado-estrategia"
import { MenuAccionesEstrategia } from "@/features/gestion-estudiantil/prevencion/components/estrategias/menu-acciones-estrategia"
import { formatBeneficiarios, formatRangoFechas } from "@/features/gestion-estudiantil/prevencion/utils/formularios-estrategias"

interface ColumnasOpciones {
  /** Nombre de la jornada por pk (la fila solo trae `fk_tlv_jornada`). */
  jornadaPorId: ReadonlyMap<number, string>
  onAccion: (fila: EstrategiaRow, accion: AccionEstrategia) => void
}

// Todas las columnas (menos Acciones) llevan accessorKey/accessorFn y `meta.label`: así «Columnas visibles» las lista.
const columna = (id: string, titulo: string) => ({
  id,
  enableSorting: false,
  meta: { label: titulo },
  // Encabezado plano: el backend no tiene parámetro de orden.
  header: () => <div className="text-sm font-medium">{titulo}</div>,
})

/** Columnas de Estrategias (G.8.EST.1): Estrategia · Tipo · Responsable · Fechas · Beneficiarios · Estado; Sede y Jornada ocultas. */
export function buildColumnsEstrategias({ jornadaPorId, onAccion }: ColumnasOpciones): ColumnDef<EstrategiaRow>[] {
  return [
    {
      ...columna("nombre", "Estrategia"),
      accessorKey: "nombre",
      cell: ({ row }) => (
        <Button variant="link" size="sm" onClick={() => onAccion(row.original, "ver")}>
          {row.original.nombre}
        </Button>
      ),
    },
    { ...columna("tipo", "Tipo"), accessorKey: "tipo_nombre" },
    { ...columna("sede", "Sede"), accessorKey: "sede_nombre" },
    { ...columna("jornada", "Jornada"), accessorFn: (f) => jornadaPorId.get(f.fk_tlv_jornada) ?? "—" },
    { ...columna("responsable", "Responsable"), accessorFn: (f) => abreviarPersona(f.responsable_nombre) },
    {
      ...columna("fechas", "Fechas"),
      accessorFn: (f) => formatRangoFechas(f.fecha_inicio, f.fecha_fin),
    },
    {
      ...columna("beneficiarios", "Beneficiarios"),
      accessorFn: (f) => formatBeneficiarios(f.beneficiarios, f.meta),
      cell: ({ row }) => (
        <span className="tabular-nums">{formatBeneficiarios(row.original.beneficiarios, row.original.meta)}</span>
      ),
    },
    {
      ...columna("estado", "Estado"),
      accessorKey: "estado_nombre",
      cell: ({ row }) => <BadgeEstadoEstrategia estado={row.original.estado} nombre={row.original.estado_nombre} />,
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Acciones</span>,
      enableSorting: false,
      enableHiding: false,
      size: anchoAccionesFila(ACCIONES_ESTRATEGIA),
      cell: ({ row }) => (
        <MenuAccionesEstrategia fila={row.original} onAccion={(accion) => onAccion(row.original, accion)} />
      ),
    },
  ]
}
