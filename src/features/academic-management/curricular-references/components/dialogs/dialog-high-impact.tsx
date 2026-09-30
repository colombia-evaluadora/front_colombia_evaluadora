import { useEffect, useState } from "react"

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { CheckIcon, SpinnerIcon, XIcon } from "@/components/ui/icons"

import type { HighImpactAlert } from "@/features/academic-management/curricular-references/api/high-impact-alerts"

interface HighImpactDialogProps {
  open: boolean
  alerts: HighImpactAlert[]
  isPending?: boolean
  onConfirm: () => void
  onCancel: () => void
}

// Modal bloqueante: solo confirma con la casilla marcada.
export function HighImpactDialog({ open, alerts, isPending = false, onConfirm, onCancel }: HighImpactDialogProps) {
  const [understood, setUnderstood] = useState(false)

  useEffect(() => {
    if (open) setUnderstood(false)
  }, [open])

  const title = alerts.length === 1 ? alerts[0].title : "Cambios de alto impacto"

  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && !isPending && onCancel()}>
      <AlertDialogContent className="sm:max-w-xl">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription render={<div />} className="flex flex-col gap-3 text-left">
            {alerts.map((alert) => (
              <div key={alert.field}>
                {alerts.length > 1 ? <p className="font-bold text-foreground">{alert.title}</p> : null}
                <p>{alert.message}</p>
              </div>
            ))}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={understood} onCheckedChange={(checked) => setUnderstood(checked === true)} />
          Entiendo el impacto de este cambio
        </label>

        <AlertDialogFooter>
          <Button
            size="sm"
            variant="fill"
            color="primary"
            disabled={!understood || isPending}
            aria-busy={isPending}
            onClick={onConfirm}
          >
            {isPending ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <CheckIcon data-icon="inline-start" />
            )}
            Confirmar cambio
          </Button>
          <Button size="sm" variant="fill" color="neutral" disabled={isPending} onClick={onCancel}>
            <XIcon data-icon="inline-start" />
            Cancelar
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
