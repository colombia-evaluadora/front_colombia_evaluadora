import { getErrorMessage } from "@/lib/api-client"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import { useNotify } from "@/components/notice/notice-context"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { LockIcon, SpinnerIcon, WarningIcon, XIcon } from "@/components/ui/icons"

import { useCloseAcademicPeriod } from "@/features/establishment/academic-period/api/mutations/reopen-academic-period"

interface CloseAcademicPeriodDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  periodId: number
  periodTitle: string
}

// Regla 16: cerrar un período reabierto antes de su fecha "Cerrar de nuevo el".
export function CloseAcademicPeriodDialog({
  open,
  onOpenChange,
  periodId,
  periodTitle,
}: CloseAcademicPeriodDialogProps) {
  const { notify } = useNotify()
  const closePeriod = useCloseAcademicPeriod()
  const isSaving = closePeriod.isPending

  function handleConfirm() {
    closePeriod.mutate(
      { id: periodId },
      {
        onSuccess: () => {
          onOpenChange(false)
          notify(SUCCESS_MESSAGES.academicPeriod.closed)
        },
        onError: (error) => {
          onOpenChange(false)
          notify(getErrorMessage(error), { variant: "error" })
        },
      },
    )
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => !isSaving && onOpenChange(next)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <WarningIcon className="size-5 shrink-0 text-orange" aria-hidden />
            Cerrar el período académico
          </AlertDialogTitle>
          <AlertDialogDescription>
            El período {periodTitle} volverá a Cerrado y quedará en solo lectura.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel variant="outline" color="neutral" disabled={isSaving}>
            <XIcon data-icon="inline-start" />
            Cancelar
          </AlertDialogCancel>
          <Button color="primary" onClick={handleConfirm} disabled={isSaving} aria-busy={isSaving}>
            {isSaving ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <LockIcon data-icon="inline-start" />
            )}
            Cerrar
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
