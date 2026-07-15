import { useState } from "react"

import { XIcon } from "@phosphor-icons/react"

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

interface ClearSelectionTableOperationsDialogProps {
  resetSelection: () => void
}

export function ClearSelectionTableOperationsDialog({ resetSelection }: ClearSelectionTableOperationsDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={<Button variant="outline" aria-label="Limpiar selección" />}
      >
        <XIcon />
        <span className="sr-only md:not-sr-only">Limpiar</span>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Limpiar la selección?</AlertDialogTitle>
          <AlertDialogDescription>
            Se deseleccionarán todas las operaciones seleccionadas.
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
            Limpiar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
