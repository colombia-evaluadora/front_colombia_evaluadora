import { useOnlineOnly } from "@/lib/offline/use-online-only"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"
import { useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { Link } from "@tanstack/react-router"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileTextIcon, PencilIcon } from "@/components/ui/icons"
import { DataTableColumnHeader } from "@/components/data-table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useTruncated } from "@/hooks/use-truncated"
import { paths } from "@/config/paths"

import type { CurricularReference } from "@/features/academic-management/curricular-references/api/types/curricular-reference"
import {
  curricularReferenceStatusBadge,
  curricularReferenceStatusLabel,
  curricularReferenceStatusPeriod,
  formatLastModifiedDate,
  toSentenceCase,
} from "@/features/academic-management/curricular-references/api/ui-mappings"
import { ToggleStatusButton } from "@/features/academic-management/curricular-references/components/table/toggle-status-button"

interface CurricularReferenceColumnsOptions {
  onEdit: (curricularReference: CurricularReference) => void
}

const MAX_LINES_CLASS = "line-clamp-5"

function ActionsCell({
  curricularReference,
  onEdit,
}: {
  curricularReference: CurricularReference
  onEdit: (curricularReference: CurricularReference) => void
}) {
  const label = curricularReference.name || "referente"
  const soloEnLinea = useOnlineOnly()
  const { puedeEditar } = useMenuPermission("REFERENTES_CURRICULARES")

  return (
    <div className="flex items-center justify-end gap-1">
      {puedeEditar ? (
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              color="neutral"
              size="icon-sm"
              aria-label={`Editar ${label}`}
              disabled={soloEnLinea.disabled}
              onClick={() => onEdit(curricularReference)}
            />
          }
        >
          <PencilIcon />
        </TooltipTrigger>
        <TooltipContent>{soloEnLinea.tooltip ?? `Editar ${label}`}</TooltipContent>
      </Tooltip>
      ) : null}
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              color="neutral"
              size="icon-sm"
              aria-label={`Gestionar contenido de ${label}`}
              render={
                <Link
                  to={paths.app.gestionAcademicaReferentesCurricularesDetalle.getHref(curricularReference.id)}
                  search={(prev) => prev}
                />
              }
              nativeButton={false}
            />
          }
        >
          <FileTextIcon />
        </TooltipTrigger>
        <TooltipContent>Gestionar contenido</TooltipContent>
      </Tooltip>
      {puedeEditar ? <ToggleStatusButton curricularReference={curricularReference} /> : null}
    </div>
  )
}

// Cantidad de grados del Gestor de Contenido; sin grados aplica a todos.
function gradosVinculadosLabel(count: number) {
  if (count === 0) return "Todos"
  return `${count} ${count === 1 ? "grado" : "grados"}`
}

function TitleWithDescriptionCell({ title, description }: { title: string; description: string }) {
  const { ref, isTruncated } = useTruncated<HTMLDivElement>()
  const [open, setOpen] = useState(false)

  const content = (
    <div ref={ref} className={`max-w-[10rem] whitespace-normal ${MAX_LINES_CLASS}`}>
      <span className="font-bold">{title}</span>
      {description ? <span className="text-muted-foreground block text-xs">{description}</span> : null}
    </div>
  )

  return (
    <Tooltip open={isTruncated && open} onOpenChange={setOpen}>
      <TooltipTrigger render={content} />
      <TooltipContent>
        <p className="font-bold">{title}</p>
        {description ? <p>{description}</p> : null}
      </TooltipContent>
    </Tooltip>
  )
}

function WrappedTextCell({ text }: { text: string }) {
  const { ref, isTruncated } = useTruncated<HTMLSpanElement>()
  const [open, setOpen] = useState(false)

  const content = (
    <span ref={ref} className={`block max-w-[9rem] whitespace-normal text-sm text-foreground ${MAX_LINES_CLASS}`}>
      {text}
    </span>
  )

  return (
    <Tooltip open={isTruncated && open} onOpenChange={setOpen}>
      <TooltipTrigger render={content} />
      <TooltipContent>{text}</TooltipContent>
    </Tooltip>
  )
}

function StatusCell({ reference }: { reference: CurricularReference }) {
  const period = curricularReferenceStatusPeriod(reference)

  return (
    <div className="flex flex-col items-start">
      <Badge {...curricularReferenceStatusBadge(reference.active)} className="normal-case tracking-normal">
        {curricularReferenceStatusLabel(reference.active)}
      </Badge>
      <p className="text-muted-foreground mt-1 text-xs">{period.from}</p>
      {period.to ? <p className="text-muted-foreground text-xs">{period.to}</p> : null}
    </div>
  )
}

function LastModifiedCell({ reference }: { reference: CurricularReference }) {
  const date = formatLastModifiedDate(reference.lastModifiedAt)
  if (!date && !reference.lastModifiedBy) return <span className="text-sm">—</span>

  return (
    <div className="flex flex-col items-start">
      {date ? <span className="text-sm">{date}</span> : null}
      {reference.lastModifiedBy ? (
        <WrappedTextCell text={reference.lastModifiedBy} />
      ) : null}
    </div>
  )
}

export function createColumns({ onEdit }: CurricularReferenceColumnsOptions): ColumnDef<CurricularReference>[] {
  return [
    {
      accessorKey: "name",
      id: "name",
      meta: { label: "Nombre" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
      cell: ({ row }) => (
        <TitleWithDescriptionCell title={row.original.name} description={row.original.description} />
      ),
      enableHiding: false,
    },
    {
      accessorKey: "educationLevel",
      id: "educationLevel",
      meta: { label: "Nivel educativo" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Nivel educativo" />,
      cell: ({ row }) => (
        <WrappedTextCell
          text={row.original.educationLevels.map((level) => toSentenceCase(level.name)).join(", ") || "—"}
        />
      ),
    },
    {
      accessorKey: "pedagogicalApproach",
      id: "pedagogicalApproach",
      meta: { label: "Enfoque" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Enfoque" />,
      cell: ({ row }) => (
        <WrappedTextCell
          text={row.original.pedagogicalApproach ? toSentenceCase(row.original.pedagogicalApproach.name) : "—"}
        />
      ),
    },
    {
      accessorKey: "evaluationType",
      id: "evaluationType",
      meta: { label: "Tipo de evaluación" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo de evaluación" />,
      cell: ({ row }) => (
        <WrappedTextCell text={row.original.evaluationType ? toSentenceCase(row.original.evaluationType.name) : "—"} />
      ),
    },
    {
      accessorKey: "gradosVinculados",
      id: "gradosVinculados",
      meta: { label: "Grados vinculados" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Grados vinculados" />,
      cell: ({ row }) => (
        <WrappedTextCell
          text={gradosVinculadosLabel(row.original.gradosVinculados.length)}
        />
      ),
    },
    {
      accessorKey: "active",
      id: "active",
      meta: { label: "Estado" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) => <StatusCell reference={row.original} />,
    },
    {
      accessorKey: "lastModifiedAt",
      id: "lastModifiedAt",
      meta: { label: "Última modificación" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Última modificación" />,
      cell: ({ row }) => <LastModifiedCell reference={row.original} />,
      // El listado del backend no ordena por esta columna.
      enableSorting: false,
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) => <ActionsCell curricularReference={row.original} onEdit={onEdit} />,
      enableSorting: false,
      enableHiding: false,
      // Tres botones: editar, gestionar contenido y activar/inactivar (no se eliminan).
      size: 120,
    },
  ]
}
