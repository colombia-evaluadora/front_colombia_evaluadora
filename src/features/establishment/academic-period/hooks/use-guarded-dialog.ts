import { useState } from "react"

interface GuardedDialogOptions {
  isSaving: boolean
  // Se evalúa al intentar cerrar, no en cada render.
  isDirty: () => boolean
  onOpen: () => void
  onClose: () => void
}

// Cierre de diálogos con confirmación si hay cambios sin guardar.
export function useGuardedDialog({ isSaving, isDirty, onOpen, onClose }: GuardedDialogOptions) {
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false)

  function requestClose() {
    if (isSaving) return
    if (isDirty()) {
      setConfirmDiscardOpen(true)
      return
    }
    onClose()
  }

  function onOpenChange(next: boolean) {
    if (next) onOpen()
    else requestClose()
  }

  const discardDialogProps = {
    open: confirmDiscardOpen,
    onOpenChange: setConfirmDiscardOpen,
    onConfirm: () => {
      setConfirmDiscardOpen(false)
      onClose()
    },
  }

  return { confirmDiscardOpen, requestClose, onOpenChange, discardDialogProps }
}
