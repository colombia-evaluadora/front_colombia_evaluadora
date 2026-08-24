import type { ColumnDef } from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DataTableColumnHeader } from "@/components/data-table"
import { Checkbox } from "@/components/ui/checkbox"
import { EyeIcon, PencilIcon, CheckCircleIcon, XCircleIcon } from "@/components/ui/icons"

import { formatGrade } from "@/features/coverage/api/ui-mappings"
import type { PreMatricula, PreMatriculaStatus } from "@/features/coverage/api/types/pre-matricula"
import { DeletePreMatriculaDialog } from "@/features/coverage/components/dialogs/dialog-delete-pre-matricula"

const PRE_MATRICULA_STATUS_LABEL: Record<PreMatriculaStatus, string> = {
  con_cupo: "Con cupo",
  sin_cupo: "Sin asignar cupo",
  pendiente: "Pendiente",
}

const PRE_MATRICULA_STATUS_BADGE: Record<
  PreMatriculaStatus,
  { variant: "soft"; color: "success" | "warning" | "orange" }
> = {
  con_cupo: { variant: "soft", color: "success" },
  sin_cupo: { variant: "soft", color: "orange" },
  pendiente: { variant: "soft", color: "warning" },
}

export const columnsPreMatricula: ColumnDef<PreMatricula>[] = [
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
    id: "campus",
    accessorKey: "campus",
    meta: { label: "Sede" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Sede" />,
    cell: ({ row }) => <span>{row.original.campus}</span>,
  },
  {
    id: "grade",
    accessorKey: "grade",
    meta: { label: "Grado" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Grado" />,
    cell: ({ row }) => <span className="tabular-nums">{formatGrade(row.original.grade)}</span>,
  },
  {
    id: "targetGrade",
    accessorKey: "targetGrade",
    meta: { label: "Grado al que aspira" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Grado al que aspira" />,
    cell: ({ row }) => {
      const { grade, targetGrade, failed } = row.original
      if (targetGrade === null) {
        return <span className="text-muted-foreground">—</span>
      }
      // Si el estudiante perdió el grado, aspira a repetir el mismo grado.
      const effectiveTargetGrade = failed ? grade : targetGrade
      // Check si aprobó; X si reprobó (el cupo se indica en la columna Estado).
      const approved = !failed
      return (
        <span className="flex items-center gap-1.5 tabular-nums">
          {formatGrade(effectiveTargetGrade)}
          {approved ? (
            <CheckCircleIcon className="size-4 text-green" />
          ) : (
            <XCircleIcon className="size-4 text-red" />
          )}
        </span>
      )
    },
  },
  {
    id: "status",
    accessorKey: "status",
    meta: { label: "Estado" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ row }) => {
      const status = row.original.status
      return (
        <Badge {...PRE_MATRICULA_STATUS_BADGE[status]}>{PRE_MATRICULA_STATUS_LABEL[status]}</Badge>
      )
    },
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
          aria-label={`Ver detalle de ${row.original.firstName} ${row.original.lastName}`}
          onClick={() => {
            // TODO: abrir sheet/dialog de detalle
          }}
        >
          <EyeIcon />
        </Button>
        <Button
          type="button"
          variant="ghost"
          color="neutral"
          size="icon-sm"
          aria-label={`Editar ${row.original.firstName} ${row.original.lastName}`}
          onClick={() => {
            // TODO: abrir sheet/dialog de edición
          }}
        >
          <PencilIcon />
        </Button>
        <DeletePreMatriculaDialog preMatricula={row.original} />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
    size: 112,
  },
]
