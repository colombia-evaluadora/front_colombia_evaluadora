"use client"

import { Button } from "@/components/ui/button"
import { TrashIcon, XIcon } from "@/components/ui/icons"

import { DialogBulkDelete } from "./dialogs/dialog-bulk-delete"

interface BulkDeleteFabProps<T> {
  selectedIds: string[]
  selectedItems: T[]
  getItemId: (item: T) => string
  getItemLabel: (item: T) => string
  title: string
  description: (count: number, sample: string[]) => string
  onConfirm: (ids: string[]) => Promise<unknown>
  onClearSelection: () => void
  confirmLabel?: string
}

// Botón flotante (FAB) anclado a la esquina inferior derecha que aparece
// sólo cuando hay al menos un registro seleccionado en la tabla. Reutiliza
// `Button` y `DialogBulkDelete` del UI; lo único "custom" es el wrapper
// fixed que lo posiciona fuera del flujo del documento.
export function BulkDeleteFab<T>({
  selectedIds,
  selectedItems,
  getItemId,
  getItemLabel,
  title,
  description,
  onConfirm,
  onClearSelection,
  confirmLabel = "Eliminar selección",
}: BulkDeleteFabProps<T>) {
  if (selectedIds.length === 0) {
    return null
  }

  return (
    <div
      role="region"
      aria-label="Acciones para selección"
      className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-end px-6"
    >
      <div className="pointer-events-auto flex items-center gap-2 rounded-md border border-border bg-background p-2 shadow-md">
        <span className="px-2 text-sm text-muted-foreground tabular-nums">
          {selectedIds.length} seleccionado{selectedIds.length === 1 ? "" : "s"}
        </span>

        <Button
          type="button"
          variant="ghost"
          color="muted"
          size="sm"
          onClick={onClearSelection}
          aria-label="Limpiar selección"
        >
          <XIcon data-icon="inline-start" />
          Limpiar
        </Button>

        <DialogBulkDelete
          items={selectedItems}
          getItemId={getItemId}
          getItemLabel={getItemLabel}
          title={title}
          description={description}
          onConfirm={onConfirm}
          triggerLabel={confirmLabel}
        />
      </div>
    </div>
  )
}