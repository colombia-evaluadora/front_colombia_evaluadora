import { useState } from "react"

import { XSquareIcon } from "@phosphor-icons/react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

interface ClearSelectionSessionOperationsDialogProps {
  resetSelection: () => void
}

export function ClearSelectionSessionOperationsDialog({
  resetSelection,
}: ClearSelectionSessionOperationsDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button variant="outline" size="icon" aria-label="Deseleccionar" />
        }
      >
        <XSquareIcon />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Deseleccionar todo?</AlertDialogTitle>
          <AlertDialogDescription>
            Se deseleccionarán todas las operaciones marcadas.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              resetSelection()
              setOpen(false)
            }}
          >
            Deseleccionar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}