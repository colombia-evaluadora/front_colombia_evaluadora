import { useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { Link } from "@tanstack/react-router"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EyeIcon, PencilIcon } from "@/components/ui/icons"
import { DataTableColumnHeader } from "@/components/data-table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useTruncated } from "@/hooks/use-truncated"
import { paths } from "@/config/paths"

import type { CurricularReference } from "@/features/academic-management/curricular-references/api/types/curricular-reference"
import {
  curricularReferenceStatusBadge,
  curricularReferenceStatusLabel,
  curricularReferenceStatusPeriod,
} from "@/features/academic-management/curricular-references/api/ui-mappings"
import { DeleteCurricularReferenceDialog } from "@/features/academic-management/curricular-references/components/dialogs/dialog-delete"

interface CurricularReferenceColumnsOptions {
  onEdit: (curricularReference: CurricularReference) => void
}

// Columnas angostas, pero sin recortar de más: en vez de una sola línea con
// "…", el texto puede pasar a una segunda o tercera línea — el tope real de
// la fila es este, no el de cada celda por separado.
const MAX_LINES_CLASS = "line-clamp-5"

function ActionsCell({
  curricularReference,
  onEdit,
}: {
  curricularReference: CurricularReference
  onEdit: (curricularReference: CurricularReference) => void
}) {
  const label = curricularReference.name || "referente"

  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        type="button"
        variant="ghost"
        color="neutral"
        size="icon-sm"
        aria-label={`Ver ${label}`}
        render={
          <Link
            to={paths.app.gestionAcademicaReferentesCurricularesDetalle.getHref(curricularReference.id)}
          />
        }
        nativeButton={false}
      >
        <EyeIcon />
      </Button>
      <Button
        type="button"
        variant="ghost"
        color="neutral"
        size="icon-sm"
        aria-label={`Editar ${label}`}
        onClick={() => onEdit(curricularReference)}
      >
        <PencilIcon />
      </Button>
      <DeleteCurricularReferenceDialog curricularReference={curricularReference} />
    </div>
  )
}

/**
 * Título + bajada en una columna angosta: envuelve hasta `MAX_LINES_CLASS`
 * líneas (no una sola con "…") y el tooltip trae el texto completo para
 * cuando aun así no alcanza — mismo patrón que "Rol"/"Jornada" en la tabla de
 * funcionarios (`columns-employees.tsx`), pero permitiendo varias líneas.
 */
function TitleWithDescriptionCell({ title, description }: { title: string; description: string }) {
  const { ref, isTruncated } = useTruncated<HTMLDivElement>()
  const [open, setOpen] = useState(false)

  const content = (
    <div ref={ref} className={`max-w-[10rem] whitespace-normal ${MAX_LINES_CLASS}`}>
      <span className="font-bold">{title}</span>
      {description ? <span className="text-muted-foreground text-xs"> — {description}</span> : null}
    </div>
  )

  return (
    // Siempre montado y controlado (nunca alterna con/sin `Tooltip`
    // envolviendo, ni entre `open` controlado y no controlado): el nodo
    // medido tiene que seguir siendo el mismo entre renders, si no el
    // `ResizeObserver` del hook queda mirando un nodo que ya no existe.
    <Tooltip open={isTruncated && open} onOpenChange={setOpen}>
      <TooltipTrigger render={content} />
      <TooltipContent>
        <p className="font-bold">{title}</p>
        {description ? <p>{description}</p> : null}
      </TooltipContent>
    </Tooltip>
  )
}

/** Celda de texto simple en una columna angosta, con tooltip solo si se recorta. */
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

/** Badge de estado + vigencia (desde arriba, hasta abajo). */
function StatusCell({ reference }: { reference: CurricularReference }) {
  const period = curricularReferenceStatusPeriod(reference)

  return (
    <div className="flex flex-col items-start">
      <Badge {...curricularReferenceStatusBadge(reference.active)}>
        {curricularReferenceStatusLabel(reference.active)}
      </Badge>
      <p className="text-muted-foreground mt-1 text-xs">{period.from}</p>
      {period.to ? <p className="text-muted-foreground text-xs">{period.to}</p> : null}
    </div>
  )
}

export function createColumns({ onEdit }: CurricularReferenceColumnsOptions): ColumnDef<CurricularReference>[] {
  return [
    {
      accessorKey: "name",
      id: "name",
      meta: { label: "Nombre del referente" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre del referente" />,
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
      cell: ({ row }) => <WrappedTextCell text={row.original.educationLevel?.name ?? "—"} />,
      enableHiding: false,
    },
    {
      accessorKey: "instrument",
      id: "instrument",
      meta: { label: "Instrumento" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Instrumento" />,
      cell: ({ row }) => (
        <TitleWithDescriptionCell
          title={row.original.instrument}
          description={row.original.instrumentDescription}
        />
      ),
      enableHiding: false,
    },
    {
      accessorKey: "pedagogicalApproach",
      id: "pedagogicalApproach",
      meta: { label: "Enfoque pedagógico" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Enfoque pedagógico" />,
      cell: ({ row }) => <WrappedTextCell text={row.original.pedagogicalApproach?.name ?? "—"} />,
      enableHiding: false,
    },
    {
      accessorKey: "evaluationType",
      id: "evaluationType",
      meta: { label: "Tipo de evaluación" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo de evaluación" />,
      cell: ({ row }) => <WrappedTextCell text={row.original.evaluationType?.name ?? "—"} />,
      enableHiding: false,
    },
    {
      accessorKey: "active",
      id: "active",
      meta: { label: "Estado" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) => <StatusCell reference={row.original} />,
      enableHiding: false,
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) => <ActionsCell curricularReference={row.original} onEdit={onEdit} />,
      enableSorting: false,
      enableHiding: false,
      size: 96,
    },
  ]
}
