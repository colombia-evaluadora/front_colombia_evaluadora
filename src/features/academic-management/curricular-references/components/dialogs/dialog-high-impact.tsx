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
import { useOnlineOnly } from "@/lib/offline/use-online-only"
import { Checkbox } from "@/components/ui/checkbox"
import { CheckIcon, SpinnerIcon, XIcon } from "@/components/ui/icons"

import type { HighImpactAlert } from "@/features/academic-management/curricular-references/utils/high-impact-alerts"

interface HighImpactDialogProps {
  open: boolean
  alerts: HighImpactAlert[]
  isPending?: boolean
  onConfirm: () => void
  onCancel: () => void
  /** Título fijo (p. ej. "Inactivar referente"); por defecto sale de las alertas. */
  title?: string
  confirmLabel?: string
  /** Texto cuando no hay alertas que mostrar. */
  description?: string
}

// Modal bloqueante: solo confirma con la casilla marcada.
// Con alertas "block" no se puede confirmar: solo se cierra.
export function HighImpactDialog({
  open,
  alerts,
  isPending = false,
  onConfirm,
  onCancel,
  title: fixedTitle,
  confirmLabel = "Confirmar cambio",
  description,
}: HighImpactDialogProps) {
  const [understood, setUnderstood] = useState(false)
  // Confirmar siempre escribe (activar/inactivar o guardar el referente).
  const soloEnLinea = useOnlineOnly()

  useEffect(() => {
    if (open) setUnderstood(false)
  }, [open])

  const isBlocked = alerts.some((alert) => alert.kind === "block")
  // Sin alertas no hay impacto que aceptar: basta con confirmar.
  const needsAck = alerts.length > 0
  const title =
    fixedTitle ??
    (alerts.length === 1 ? alerts[0].title : isBlocked ? "No es posible aplicar el cambio" : "Cambios de alto impacto")

  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && !isPending && onCancel()}>
      <AlertDialogContent className="sm:max-w-xl">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription render={<div />} className="flex flex-col gap-3 text-left">
            {alerts.length === 0 && description ? <p>{description}</p> : null}
            {alerts.map((alert) => (
              <div key={alert.field}>
                {alerts.length > 1 ? <p className="font-bold text-foreground">{alert.title}</p> : null}
                <p>{alert.message}</p>
              </div>
            ))}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {isBlocked || !needsAck ? null : (
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={understood} onCheckedChange={(checked) => setUnderstood(checked === true)} />
            Entiendo el impacto de este cambio
          </label>
        )}

        {!isBlocked && soloEnLinea.disabled ? (
          <p role="status" className="text-sm text-muted-foreground">
            {soloEnLinea.tooltip}
          </p>
        ) : null}

        {isBlocked ? (
          <AlertDialogFooter>
            <Button size="sm" variant="fill" color="primary" onClick={onCancel}>
              <CheckIcon data-icon="inline-start" />
              Entendido
            </Button>
          </AlertDialogFooter>
        ) : (
          <AlertDialogFooter>
            <Button
              size="sm"
              variant="fill"
              color="primary"
              disabled={(needsAck && !understood) || isPending || soloEnLinea.disabled}
              aria-busy={isPending}
              onClick={onConfirm}
            >
              {isPending ? (
                <SpinnerIcon data-icon="inline-start" className="animate-spin" />
              ) : (
                <CheckIcon data-icon="inline-start" />
              )}
              {confirmLabel}
            </Button>
            <Button size="sm" variant="fill" color="neutral" disabled={isPending} onClick={onCancel}>
              <XIcon data-icon="inline-start" />
              Cancelar
            </Button>
          </AlertDialogFooter>
        )}
      </AlertDialogContent>
    </AlertDialog>
  )
}
