import { useState } from "react"

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { WarningIcon } from "@/components/ui/icons"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { getErrorMessage } from "@/lib/api-client"
import { useRestablecerSegundoFactor } from "@/features/cuenta/api/cuenta"
import type { Superadministrador } from "@/features/administration/superadministradores/api/types/superadministrador"

/** Administración del Sistema §7.1: Restablecer segundo factor de otro Superadministrador, con motivo. */
export function DialogRestablecerSegundoFactor({
  superadministrador,
  onClose,
  onDone,
}: {
  superadministrador: Superadministrador | null
  onClose: () => void
  onDone: (s: Superadministrador) => void
}) {
  const restablecer = useRestablecerSegundoFactor()
  const [motivo, setMotivo] = useState("")
  const valido = motivo.trim().length >= 10 && motivo.trim().length <= 500
  const s = superadministrador

  return (
    <AlertDialog
      open={s != null}
      onOpenChange={(open) => {
        if (!open && !restablecer.isPending) {
          setMotivo("")
          restablecer.reset()
          onClose()
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Restablecer segundo factor</AlertDialogTitle>
          <AlertDialogDescription>
            {s?.nombre} deberá configurar de nuevo el segundo factor en su siguiente ingreso. Se cerrarán sus
            sesiones abiertas.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {restablecer.isError && (
          <Alert variant="destructive">
            <WarningIcon aria-hidden="true" />
            <AlertDescription>{getErrorMessage(restablecer.error)}</AlertDescription>
          </Alert>
        )}
        <Field>
          <FieldLabel htmlFor="motivo-2fa">Motivo</FieldLabel>
          <Textarea id="motivo-2fa" value={motivo} maxLength={500} onChange={(e) => setMotivo(e.target.value)} />
          <FieldDescription>Entre 10 y 500 caracteres.</FieldDescription>
        </Field>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={restablecer.isPending}>Cancelar</AlertDialogCancel>
          <Button
            color="destructive"
            disabled={!valido || restablecer.isPending || !s}
            onClick={() =>
              s &&
              restablecer.mutate(
                { correo: s.correo, motivo: motivo.trim() },
                {
                  onSuccess: () => {
                    setMotivo("")
                    onDone(s)
                  },
                },
              )
            }
          >
            {restablecer.isPending && <Spinner data-icon="inline-start" />}
            Confirmar restablecimiento
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
