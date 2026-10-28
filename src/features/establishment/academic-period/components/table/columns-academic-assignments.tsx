"use no memo"

import type { ColumnDef } from "@tanstack/react-table"

import { DataTableColumnHeader } from "@/components/data-table"
import { ConfirmRemoveButton } from "@/components/confirm-remove-button"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PauseCircleIcon, PencilIcon, PlayCircleIcon, TrashIcon } from "@/components/ui/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

import type { AcademicAssignment } from "@/features/establishment/academic-period/api/types/academic-assignment"

interface CreateColumnsOptions {
  readOnly: boolean
  onEdit: (assignment: AcademicAssignment) => void
  onToggleStatus: (assignment: AcademicAssignment) => void
  onDelete: (assignment: AcademicAssignment) => Promise<boolean>
}

// Botón de acción con tooltip; las automáticas (Regla 108) lo muestran
// deshabilitado con "Se gestiona desde el grupo [Grupo]".
function ActionButton({
  label,
  hint,
  disabled,
  onClick,
  children,
}: {
  label: string
  hint: string
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger render={<span tabIndex={disabled ? 0 : -1} />}>
        <Button
          variant="ghost"
          color="neutral"
          size="icon-sm"
          disabled={disabled}
          onClick={onClick}
        >
          <span className="sr-only">{label}</span>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{hint}</TooltipContent>
    </Tooltip>
  )
}

export function createAcademicAssignmentColumns({
  readOnly,
  onEdit,
  onToggleStatus,
  onDelete,
}: CreateColumnsOptions): ColumnDef<AcademicAssignment>[] {
  const columns: ColumnDef<AcademicAssignment>[] = [
    {
      id: "docente",
      accessorKey: "docente",
      meta: { label: "Docente" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Docente" />,
      cell: ({ row }) => (
        <span className="flex flex-wrap items-center gap-2">
          {row.original.docente}
          {row.original.automatica && (
            <Badge variant="soft" color="info" className="text-xs">
              Automática
            </Badge>
          )}
        </span>
      ),
    },
    {
      id: "grado",
      accessorKey: "grado",
      meta: { label: "Grado" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Grado" />,
    },
    {
      id: "grupo",
      accessorKey: "grupo",
      meta: { label: "Grupo" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Grupo" />,
    },
    {
      id: "asignatura",
      accessorKey: "asignatura",
      meta: { label: "Asignatura" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Asignatura" />,
    },
    {
      id: "estado",
      accessorKey: "status",
      meta: { label: "Estado" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) =>
        row.original.status === "A" ? (
          <Badge variant="soft" color="success" className="border border-current/30">
            <span aria-hidden className="size-1.5 rounded-full bg-current" />
            Activa
          </Badge>
        ) : (
          <Badge variant="outline" color="neutral">
            <span aria-hidden className="size-1.5 rounded-full bg-current" />
            Inactiva
          </Badge>
        ),
    },
  ]
  if (readOnly) return columns

  return [
    ...columns,
    {
      id: "actions",
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) => {
        const a = row.original
        const name = `${a.asignatura} en ${a.grupo}`
        const locked = a.automatica ? `Se gestiona desde el grupo ${a.grupo}` : null
        const active = a.status === "A"
        return (
          <div className="flex items-center justify-end gap-1">
            <ActionButton
              label={`Modificar ${name}`}
              hint={locked ?? "Modificar"}
              disabled={a.automatica}
              onClick={() => onEdit(a)}
            >
              <PencilIcon />
            </ActionButton>
            <ActionButton
              label={`${active ? "Inactivar" : "Activar"} ${name}`}
              hint={locked ?? (active ? "Inactivar" : "Activar")}
              disabled={a.automatica}
              onClick={() => onToggleStatus(a)}
            >
              {active ? <PauseCircleIcon /> : <PlayCircleIcon />}
            </ActionButton>
            {a.automatica ? (
              <ActionButton label={`Eliminar ${name}`} hint={locked!} disabled onClick={() => {}}>
                <TrashIcon />
              </ActionButton>
            ) : (
              <ConfirmRemoveButton
                label={`Eliminar ${name}`}
                title={`Eliminar la asignación de ${name}`}
                description="Esta información quedará sin propietario y los Responsables de enseñanza no podrán consultarla hasta que se haga una nueva asignación."
                onConfirm={() => onDelete(a)}
              />
            )}
          </div>
        )
      },
      enableSorting: false,
      enableHiding: false,
      size: 144,
    },
  ]
}
