import { useState, type ReactElement } from "react"

import { useNotify } from "@/components/notice/notice-context"
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
import { SpinnerIcon, TrashIcon } from "@/components/ui/icons"

import { useDeleteMenu } from "../api/mutations/delete-menu"
import type { MenuNode } from "../api/types/role-menu"

interface DialogDeleteMenuProps {
  menu: MenuNode
  /** Cuántos menús cuelgan de este, para avisarlo antes de borrar. */
  childrenCount: number
  trigger: ReactElement
}

export function DialogDeleteMenu({ menu, childrenCount, trigger }: DialogDeleteMenuProps) {
  const [open, setOpen] = useState(false)
  const { notify } = useNotify()

  const deleteMenu = useDeleteMenu({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          notify(result.message, { variant: "error" })
          return
        }
        setOpen(false)
        notify("El menú se eliminó correctamente.")
      },
    },
  })

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={trigger} />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar menú</AlertDialogTitle>
          <AlertDialogDescription>
            Se eliminará permanentemente «{menu.name}»
            {childrenCount > 0 &&
              ` y los ${childrenCount} menús que cuelgan de él`}{" "}
            para todos los roles. Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            color="destructive"
            disabled={deleteMenu.isPending}
            aria-busy={deleteMenu.isPending}
            onClick={() => deleteMenu.mutate({ id: menu.id })}
          >
            {deleteMenu.isPending ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <TrashIcon data-icon="inline-start" />
            )}
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
