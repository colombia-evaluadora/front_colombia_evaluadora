import type { ColumnDef, Table } from "@tanstack/react-table"

import { Checkbox } from "@/components/ui/checkbox"
import { DataTableColumnHeader } from "@/components/data-table"

import type { StudyPlanItem } from "@/features/establishment/academic-period/api/types/study-plan"
import { DeleteStudyPlanDialog } from "@/features/establishment/academic-period/components/dialogs/dialog-delete-study-plan"
import { CreateStudyPlanDialog } from "@/features/establishment/academic-period/components/dialogs/dialog-create-study-plan"

interface CreateStudyPlanColumnsOptions {
  academicPeriodId?: number
  gradeId?: number
  isPreescolar?: boolean
}

export function createStudyPlanColumns({
  academicPeriodId,
  gradeId,
  isPreescolar,
}: CreateStudyPlanColumnsOptions = {}): ColumnDef<StudyPlanItem>[] {
  const subjectColumnLabel = isPreescolar ? "Dimensiones" : "Asignaturas"
  return [
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
      meta: { label: "Influye en el desempeño académico (S/N)" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Influye en el desempeño académico (S/N)" />
      ),
      cell: ({ row }) => <span>{row.original.influyeDesempeno ? "S" : "N"}</span>,
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
          />
          <DeleteStudyPlanDialog item={row.original} isPreescolar={isPreescolar} />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
      size: 96,
    },
  ]
}

export type StudyPlanTable = Table<StudyPlanItem>
