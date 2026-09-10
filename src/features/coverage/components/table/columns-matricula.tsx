import { Link } from "@tanstack/react-router"
import type { ColumnDef } from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DataTableColumnHeader } from "@/components/data-table"
import { EyeIcon, PencilIcon } from "@/components/ui/icons"

import { paths } from "@/config/paths"
import { EDUCATION_LEVEL_LABELS } from "@/features/coverage/api/ui-mappings"
import { useMatriculaGradeLabel } from "@/features/coverage/hooks/use-matricula-grade-label"
import type { Matricula, MatriculaStatus } from "@/features/coverage/api/types/matricula"
import { DeleteMatriculaDialog } from "@/features/coverage/components/dialogs/dialog-delete-matricula"
import { FilesMatriculaDialog } from "@/features/coverage/components/dialogs/dialog-files-matricula"
import { RetirarMatriculaDialog } from "@/features/coverage/components/dialogs/dialog-retirar-matricula"
import { ReingresarMatriculaDialog } from "@/features/coverage/components/dialogs/dialog-reingresar-matricula"

function formatEnrollmentDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", { year: "numeric", month: "2-digit", day: "2-digit" })
}

function MatriculaGradeCell({ grade }: { grade: number }) {
  const gradeLabel = useMatriculaGradeLabel()
  return <span className="tabular-nums">{gradeLabel(grade)}</span>
}

const NOT_EDITABLE_STATUSES: MatriculaStatus[] = ["Reubicado", "Promovido"]

export const MATRICULA_EXPORT_COLUMN_KEYS: Partial<Record<string, string>> = {
  documentNumber: "document_number",
  firstName: "first_name",
  lastName: "last_name",
  institution: "institution",
  campus: "campus",
  shift: "shift",
  educationLevel: "education_level",
  grade: "grade",
  group: "grupo",
  enrollmentDate: "enrollment_date",
  guardian: "guardian",
  status: "status",
}

export const columnsMatricula: ColumnDef<Matricula>[] = [
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
        aria-label={`Seleccionar ${row.original.firstName} ${row.original.lastName}`}
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
    id: "documentNumber",
    accessorKey: "documentNumber",
    meta: { label: "ID" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="ID" />,
    cell: ({ row }) => <span className="tabular-nums">{row.original.documentNumber}</span>,
  },
  {
    id: "firstName",
    accessorKey: "firstName",
    meta: { label: "Nombres" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Nombres" />,
    cell: ({ row }) => <span className="font-medium">{row.original.firstName}</span>,
  },
  {
    id: "lastName",
    accessorKey: "lastName",
    meta: { label: "Apellidos" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Apellidos" />,
    cell: ({ row }) => <span className="font-medium">{row.original.lastName}</span>,
  },
  {
    id: "institution",
    accessorKey: "institution",
    meta: { label: "Institución" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Institución" />,
    cell: ({ row }) => <span className="max-w-xs truncate">{row.original.institution}</span>,
  },
  {
    id: "campus",
    accessorKey: "campus",
    meta: { label: "Sede" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Sede" />,
    cell: ({ row }) => <span>{row.original.campus}</span>,
  },
  {
    id: "shift",
    accessorKey: "shift",
    meta: { label: "Jornada" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Jornada" />,
    // Ya viene como nombre legible del catálogo de `TLISTA_VALOR` — no es el
    // `Shift` fijo de reservas, no necesita mapeo de labels.
    cell: ({ row }) => <span>{row.original.shift}</span>,
  },
  {
    id: "educationLevel",
    accessorKey: "educationLevel",
    meta: { label: "Nivel educativo" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Nivel educativo" />,
    cell: ({ row }) => <span>{EDUCATION_LEVEL_LABELS[row.original.educationLevel]}</span>,
  },
  {
    id: "grade",
    accessorKey: "grade",
    meta: { label: "Grado" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Grado" />,
    cell: ({ row }) => <MatriculaGradeCell grade={row.original.grade} />,
  },
  {
    id: "group",
    accessorKey: "group",
    meta: { label: "Grupo" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Grupo" />,
    cell: ({ row }) => <span>{row.original.group}</span>,
  },
  {
    id: "enrollmentDate",
    accessorKey: "enrollmentDate",
    meta: { label: "Fecha de matrícula" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha de matrícula" />,
    cell: ({ row }) => (
      <span className="tabular-nums">{formatEnrollmentDate(row.original.enrollmentDate)}</span>
    ),
  },
  {
    id: "guardian",
    accessorKey: "guardian",
    meta: { label: "Acudiente" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Acudiente" />,
    cell: ({ row }) => <span className="max-w-xs truncate">{row.original.guardian}</span>,
  },
  {
    id: "status",
    accessorKey: "status",
    meta: { label: "Estado" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ row }) => <span className="text-sm text-foreground">{row.original.status}</span>,
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Acciones</span>,
    cell: ({ row }) => (
      <div className="flex items-center justify-end gap-1">
        <Button
          type="button"
          variant="ghost"
          color="neutral"
          size="icon-sm"
          aria-label={`Ver ${row.original.firstName} ${row.original.lastName}`}
          render={<Link to={paths.app.coberturaMatriculaDetalle.getHref(row.original.id)} />}
          nativeButton={false}
        >
          <EyeIcon />
        </Button>
        {!NOT_EDITABLE_STATUSES.includes(row.original.status) && (
          <Button
            type="button"
            variant="ghost"
            color="neutral"
            size="icon-sm"
            aria-label={`Editar ${row.original.firstName} ${row.original.lastName}`}
            render={<Link to={paths.app.coberturaMatriculaEditar.getHref(row.original.id)} />}
            nativeButton={false}
          >
            <PencilIcon />
          </Button>
        )}
        <FilesMatriculaDialog matricula={row.original} />
        <RetirarMatriculaDialog matricula={row.original} />
        <ReingresarMatriculaDialog matricula={row.original} />
        <DeleteMatriculaDialog matricula={row.original} />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
    size: 160,
  },
]
