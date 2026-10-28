"use no memo"

import type { ColumnDef, Table } from "@tanstack/react-table"

import { DataTableColumnHeader } from "@/components/data-table"

import type { StudyPlanItem } from "@/features/establishment/academic-period/api/types/study-plan"
import { DeleteStudyPlanDialog } from "@/features/establishment/academic-period/components/dialogs/dialog-delete-study-plan"
import { CreateStudyPlanDialog } from "@/features/establishment/academic-period/components/dialogs/dialog-create-study-plan"
import { formatPeso } from "@/features/establishment/academic-period/components/table/columns-evaluation-periods"

interface CreateStudyPlanColumnsOptions {
  academicPeriodId?: number
  gradeId?: number
  isPreescolar?: boolean
  isFormativo?: boolean
  subjectLabel?: string
  /** Solo con el criterio "Cada [Área] tiene un porcentaje" (Regla 76). */
  showPercentage?: boolean
}

const yesNo = (value: boolean | undefined) => <span>{value ? "Sí" : "No"}</span>

// Plan de estudio del grado (Sección 5.3, Regla 60).
export function createStudyPlanColumns({
  academicPeriodId,
  gradeId,
  isPreescolar,
  isFormativo,
  subjectLabel = "Asignatura",
  showPercentage = false,
}: CreateStudyPlanColumnsOptions = {}): ColumnDef<StudyPlanItem>[] {
  return [
    {
      id: "asignatura",
      accessorKey: "asignatura",
      meta: { label: subjectLabel },
      header: ({ column }) => <DataTableColumnHeader column={column} title={subjectLabel} />,
      cell: ({ row }) => <span>{row.original.asignatura}</span>,
    },
    {
      id: "areaNombre",
      accessorKey: "areaNombre",
      meta: { label: "Área" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Área" />,
      cell: ({ row }) => <span>{row.original.areaNombre || "—"}</span>,
    },
    {
      id: "intensidadHoraria",
      accessorKey: "intensidadHoraria",
      meta: { label: "Intensidad horaria" },
      header: () => <span className="block text-center">Intensidad horaria</span>,
      cell: ({ row }) => (
        <span className="block text-center tabular-nums">{row.original.intensidadHoraria}</span>
      ),
    },
    // El Porcentaje solo se usa con "Cada [Área] tiene un porcentaje" (Regla 76).
    ...(showPercentage
      ? [
          {
            id: "influenciaArea",
            accessorKey: "influenciaArea",
            meta: { label: "Porcentaje" },
            header: () => <span className="block text-center">Porcentaje</span>,
            cell: ({ row }) => (
              <span className="block text-center tabular-nums">{formatPeso(row.original.influenciaArea)}</span>
            ),
          } satisfies ColumnDef<StudyPlanItem>,
        ]
      : []),
    // Preescolar no reprueba por rendimiento: la columna no aplica.
    ...(isPreescolar
      ? []
      : ([
          {
            id: "influyeDesempeno",
            accessorKey: "influyeDesempeno",
            meta: { label: "Influye en el rendimiento académico" },
            header: () => <span>Influye en el rendimiento académico</span>,
            cell: ({ row }) => yesNo(row.original.influyeDesempeno),
          },
        ] satisfies ColumnDef<StudyPlanItem>[])),
    {
      id: "matriculaObligatoria",
      accessorKey: "matriculaObligatoria",
      meta: { label: "Matrícula obligatoria" },
      header: () => <span>Matrícula obligatoria</span>,
      cell: ({ row }) => yesNo(row.original.matriculaObligatoria),
    },
    {
      id: "aprobacionObligatoria",
      accessorKey: "aprobacionObligatoria",
      meta: { label: "Aprobación obligatoria" },
      header: () => <span>Aprobación obligatoria</span>,
      cell: ({ row }) => yesNo(row.original.aprobacionObligatoria),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <CreateStudyPlanDialog
            item={row.original}
            academicPeriodId={academicPeriodId}
            gradeId={gradeId}
            isPreescolar={isPreescolar}
            isFormativo={isFormativo}
            subjectLabel={subjectLabel}
          />
          <DeleteStudyPlanDialog item={row.original} subjectLabel={subjectLabel} />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
      size: 96,
    },
  ]
}

export type StudyPlanTable = Table<StudyPlanItem>
