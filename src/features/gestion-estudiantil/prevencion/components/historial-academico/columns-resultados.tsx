import type { ColumnDef } from "@tanstack/react-table"

import type { HistorialAcademicoAsignatura } from "@/features/gestion-estudiantil/prevencion/api/types"
import { CeldaNota } from "@/features/gestion-estudiantil/prevencion/components/historial-academico/celda-nota"
import type { FilaObservacion } from "@/features/gestion-estudiantil/prevencion/utils/historial-academico"
import { formatNota, textoNota } from "@/features/gestion-estudiantil/prevencion/utils/historial-academico"

// Todas las columnas llevan accessorFn y `meta.label`: así «Columnas visibles» las lista.
const columna = (id: string, titulo: string) => ({
  id,
  enableSorting: false,
  meta: { label: titulo },
  header: () => <div className="text-sm font-medium">{titulo}</div>,
})

const SIN_REGISTRO = <span className="text-muted-foreground">Sin registro</span>

const periodoDe = (a: HistorialAcademicoAsignatura, id: number) => a.periodos.find((p) => p.fk_tperiodo_evaluacion === id)

/**
 * Columnas del enfoque Evaluativo (G.8.HIS.1): Asignatura · un período por columna · Nota final · Valoración; el Área
 * va oculta de entrada. Los períodos y la final salen de lo consultado.
 */
export function buildColumnsEvaluativo(
  periodos: { id: number; nombre: string }[],
  conFinal: boolean,
): ColumnDef<HistorialAcademicoAsignatura>[] {
  const columnas: ColumnDef<HistorialAcademicoAsignatura>[] = [
    { ...columna("asignatura", "Asignatura"), accessorFn: (a) => a.nombre },
    { ...columna("area", "Área"), accessorFn: (a) => a.area ?? "—" },
    ...periodos.map<ColumnDef<HistorialAcademicoAsignatura>>((p) => ({
      ...columna(`periodo-${p.id}`, p.nombre),
      accessorFn: (a) => textoNota(periodoDe(a, p.id)),
      cell: ({ row }) => <CeldaNota p={periodoDe(row.original, p.id)} />,
    })),
  ]
  if (conFinal) {
    columnas.push(
      {
        ...columna("nota-final", "Nota final del Período Académico"),
        accessorFn: (a) => (a.final && !a.final.sin_registro ? formatNota(a.final.nota) : "Sin registro"),
        cell: ({ row }) => {
          const f = row.original.final
          return f && !f.sin_registro ? formatNota(f.nota) : SIN_REGISTRO
        },
      },
      {
        ...columna("valoracion", "Valoración"),
        accessorFn: (a) => a.final?.valoracion ?? "—",
      },
    )
  }
  return columnas
}

/** Columnas del enfoque Formativo (G.8.HIS.2): Asignatura («General»: el backend no la separa) · Período · Observación. */
export function buildColumnsFormativo(): ColumnDef<FilaObservacion>[] {
  return [
    { ...columna("asignatura", "Asignatura"), accessorFn: (f) => f.asignatura },
    { ...columna("periodo", "Período"), accessorFn: (f) => f.periodo },
    {
      ...columna("observacion", "Observación"),
      accessorFn: (f) => (f.sinRegistro ? "Sin registro" : f.observacion),
      cell: ({ row }) =>
        row.original.sinRegistro ? SIN_REGISTRO : <span className="whitespace-normal">{row.original.observacion}</span>,
    },
  ]
}
