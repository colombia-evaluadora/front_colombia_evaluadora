import { useState } from "react"

import { SpinnerIcon, TrashIcon } from "@/components/ui/icons"
import { toast } from "sonner"

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

import { useDeleteEmployee } from "../../api/mutations/use-delete-employee"
import type { EmployeeListItem } from "../../api/types/employee"

interface DeleteEmployeeDialogProps {
  employee: EmployeeListItem
}

export function DeleteEmployeeDialog({ employee }: DeleteEmployeeDialogProps) {
  const [open, setOpen] = useState(false)

  const deleteMutation = useDeleteEmployee({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          toast.error(result.message)
          return
        }

        toast.success(result.message)
        setOpen(false)
      },
      onError: (error) => {
        toast.error(error.message)
      },
    },
  })

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button
            type="button"
            variant="fill"
            color="destructive"
            size="icon"
            className="size-8"
            aria-label={`Eliminar ${employee.name}`}
          />
        }
      >
        <TrashIcon />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            ¿Está seguro de que desea eliminar el funcionario seleccionado?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Se eliminará permanentemente {employee.name}. Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            disabled={deleteMutation.isPending}
            aria-busy={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate(employee.id)}
          >
            {deleteMutation.isPending ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <TrashIcon data-icon="inline-start" />
            )}
            Si
          </AlertDialogAction>
          <AlertDialogCancel disabled={deleteMutation.isPending}>
            No
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
