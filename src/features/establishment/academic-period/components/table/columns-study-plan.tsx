import type { ColumnDef, Table } from "@tanstack/react-table"

import { Checkbox } from "@/components/ui/checkbox"
import { DataTableColumnHeader } from "@/components/data-table"

import type { StudyPlanItem } from "@/features/establishment/academic-period/api/types/study-plan"
import { DeleteStudyPlanDialog } from "@/features/establishment/academic-period/components/dialogs/dialog-delete-study-plan"
import { CreateStudyPlanDialog } from "@/features/establishment/academic-period/components/dialogs/dialog-create-study-plan"
import { pluralizeSubjectLabel } from "@/features/establishment/academic-period/lib/pluralize-subject-label"

interface CreateStudyPlanColumnsOptions {
  academicPeriodId?: number
  gradeId?: number
  isPreescolar?: boolean
  isFormativo?: boolean
  subjectLabel?: string
}

export function createStudyPlanColumns({
  academicPeriodId,
  gradeId,
  isPreescolar,
  isFormativo,
  subjectLabel = "Asignatura",
}: CreateStudyPlanColumnsOptions = {}): ColumnDef<StudyPlanItem>[] {
  const subjectColumnLabel = pluralizeSubjectLabel(subjectLabel)
  const columns: ColumnDef<StudyPlanItem>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          aria-label="Seleccionar página"
          className="translate-y-0.5"
          checked={table.getIsAllPageRowsSelected()}
          indeterminate={!table.getIsAllPageRowsSelected() && table.getIsSomePageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          aria-label={`Seleccionar ${row.original.asignatura}`}
          className="translate-y-0.5"
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 32,
    },
    {
      id: "asignatura",
      accessorKey: "asignatura",
      meta: { label: subjectColumnLabel },
      header: ({ column }) => <DataTableColumnHeader column={column} title={subjectColumnLabel} />,
      cell: ({ row }) => <span className="font-medium">{row.original.asignatura}</span>,
    },
    {
      id: "intensidadHoraria",
      accessorKey: "intensidadHoraria",
      meta: { label: "Intensidad horaria" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Intensidad horaria" />,
      cell: ({ row }) => <span>{row.original.intensidadHoraria}</span>,
    },
    {
      id: "influenciaArea",
      accessorKey: "influenciaArea",
      meta: { label: "Influencia área" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Influencia área" />,
      cell: ({ row }) => <span>{row.original.influenciaArea}%</span>,
    },
    // En preescolar no aplican: no hay créditos ni desempeño académico que
    // influenciar, la asignatura ahí es una dimensión formativa.
    ...(isPreescolar
      ? []
      : ([
          {
            id: "numeroCreditos",
            accessorKey: "numeroCreditos",
            meta: { label: "Número de créditos" },
            header: ({ column }) => <DataTableColumnHeader column={column} title="Número de créditos" />,
            cell: ({ row }) => <span>{row.original.numeroCreditos}</span>,
          },
          {
            id: "influyeDesempeno",
            accessorKey: "influyeDesempeno",
            meta: { label: "Influye en el desempeño académico" },
            header: ({ column }) => (
              <DataTableColumnHeader column={column} title="Influye en el desempeño académico" />
            ),
            cell: ({ row }) => <span>{row.original.influyeDesempeno ? "S" : "N"}</span>,
          },
        ] satisfies ColumnDef<StudyPlanItem>[])),
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
  return columns
}

export type StudyPlanTable = Table<StudyPlanItem>
