import { useState } from "react"

import { EyeIcon, XIcon } from "@/components/ui/icons"

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"

import { useOperationChangesQuery } from "../../api/query/use-operation-changes-query"
import { useAuditOperationTypesQuery } from "../../api/query/use-audit-operation-types-query"
import { OPERATION_TYPE_BADGE } from "../../api/ui-mappings"
import { OperationChangesTable } from "../table/operation-changes-table"
import { DialogConfirmRevertChanges } from "./dialog-confirm-revert-changes"
import { useParams } from "@tanstack/react-router"

interface ViewOperationChangesDialogProps {
  operationId: string
  // Opcional: cuando se usa dentro de un contexto donde la ruta no expone
  // `tableSlug` (ej. la sheet de operaciones de una sesión, donde las ops
  // pueden ser de varias tablas), se pasa explícito. Si no, se toma del
  // route via useParams.
  tableSlug?: string
}
export function ViewOperationChangesDialog({
  operationId,
  tableSlug: tableSlugProp,
}: ViewOperationChangesDialogProps) {
  const [open, setOpen] = useState(false)
  const routeParams = useParams({ strict: false }) as { tableSlug?: string }
  const tableSlug = tableSlugProp ?? routeParams.tableSlug ?? ""

  const [showAll, setShowAll] = useState(false)

  const { data, isPending, isError } = useOperationChangesQuery({
    tableSlug,
    operationId,
    showAll,
    enabled: open,
  })

  // El label del tipo de operación lo entrega el backend (`{ key, label }`).
  // Si la query todavía no llegó, caemos al `key` como fallback.
  const { data: operationOptions = [] } = useAuditOperationTypesQuery()
  const operationLabel =
    data != null
      ? (operationOptions.find((o) => o.key === data.operation)?.label ?? data.operation)
      : null

  const revertibleIndexes = data
    ? data.changes
        .filter((change) => change.before !== change.after)
        .map((change) => change.fieldIndex)
    : []

  const summary = data
    ? `${data.changedFields} campo(s) modificado(s) de ${data.totalFields}`
    : "Cargando cambios…"

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            color="neutral"
            size="icon-sm"
            aria-label="Ver cambios de la operación"
          />
        }
      >
        <EyeIcon weight="bold" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle>{data ? data.entityName : "Detalle de cambios"}</DialogTitle>
            {data && <Badge {...OPERATION_TYPE_BADGE[data.operation]}>{operationLabel}</Badge>}
          </div>
          <DialogDescription>{data ? `${data.entityId}` : "Cargando…"}</DialogDescription>
          <div className="flex justify-between gap-2">
            <p className="text-muted-foreground text-sm">{summary}</p>

            <label className="flex cursor-pointer items-center gap-2 text-xs">
              <Checkbox
                checked={showAll}
                onCheckedChange={(value) => setShowAll(value === true)}
                aria-label="Mostrar todos los campos"
              />
              <span className="text-muted-foreground">Mostrar todos</span>
            </label>
          </div>
        </DialogHeader>

        {isPending && (
          <div className="text-muted-foreground flex items-center justify-center gap-2 px-6 py-8 text-sm">
            <Spinner /> Cargando cambios…
          </div>
        )}

        {isError && (
          <div className="text-red px-6 py-8 text-center text-sm">
            Ocurrió un error al cargar los cambios.
          </div>
        )}

        {data && data.changes.length === 0 && (
          <div className="text-muted-foreground px-6 py-8 text-center text-sm">
            Esta operación no tiene campos para mostrar.
          </div>
        )}

        {data && data.changes.length > 0 && (
          <div className="relative max-h-50 overflow-auto">
            <OperationChangesTable changes={data.changes} />
          </div>
        )}

        <DialogFooter>
          <DialogConfirmRevertChanges
            tableSlug={tableSlug}
            operationId={operationId}
            fieldIndexes={revertibleIndexes}
          />
          <DialogClose
            render={<Button size="sm" type="button" variant="fill" color="neutral" />}
          >
            <XIcon data-icon="inline-start" />
            Cerrar
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
