import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { FloppyDiskIcon, SpinnerIcon, XIcon } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import { NoticeBanner } from "@/components/notice/notice-banner"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import { cn } from "@/lib/utils"

import { useRegistrarAutorizacionDatos } from "@/features/coverage/matricula/api/mutations/registrar-autorizacion-datos"
import type { Matricula } from "@/features/coverage/matricula/api/types/matricula"
import { nombreDe } from "@/features/coverage/matricula/components/dialogs/acciones/compartido"

/**
 * Registrar autorización de datos (Sección 2.1, Regla 81): el funcionario se
 * la pide de nuevo al acudiente en el establecimiento y deja constancia.
 */
export function DialogRegistrarAutorizacion({
  matricula,
  onOpenChange,
  onDone,
}: {
  matricula: Matricula
  onOpenChange: (open: boolean) => void
  onDone?: () => void
}) {
  const { notify } = useNotify()
  const registrar = useRegistrarAutorizacionDatos()
  const [acudiente, setAcudiente] = useState(matricula.guardian)
  const [confirmado, setConfirmado] = useState(false)
  const [intentado, setIntentado] = useState(false)
  const [error, setError] = useState<{ id: number; message: string } | null>(null)
  const sinAcudiente = intentado && !acudiente.trim()

  function guardar() {
    setIntentado(true)
    if (!acudiente.trim() || !confirmado) return
    registrar.mutate(
      { matriculaId: matricula.id, acudiente: acudiente.trim() },
      {
        onSuccess: () => {
          notify(`Se registró la autorización de datos de ${nombreDe(matricula)}.`, { variant: "success" })
          onDone?.()
          onOpenChange(false)
        },
        onError: (err) => setError({ id: Date.now(), message: getErrorMessage(err) }),
      },
    )
  }

  return (
    <Dialog open onOpenChange={(o) => !registrar.isPending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar autorización de datos — {nombreDe(matricula)}</DialogTitle>
        </DialogHeader>
        <NoticeBanner notice={error} onClose={() => setError(null)} variant="error" />

        <Field variant="outlined" className="gap-1.5" data-invalid={sinAcudiente || undefined}>
          <FieldLabel htmlFor="autorizacion-acudiente">
            Acudiente que autoriza<span data-required-mark="">*</span>
          </FieldLabel>
          <Input
            id="autorizacion-acudiente"
            size="sm"
            maxLength={130}
            value={acudiente}
            aria-invalid={sinAcudiente}
            onChange={(e) => setAcudiente(e.target.value)}
          />
        </Field>

        <Field className="gap-1.5" data-invalid={(intentado && !confirmado) || undefined}>
          <FieldLabel>
            Autorización de tratamiento de datos<span data-required-mark="">*</span>
          </FieldLabel>
          <label className="flex items-start gap-2 text-sm">
            <Checkbox
              checked={confirmado}
              aria-invalid={intentado && !confirmado}
              onCheckedChange={(checked) => setConfirmado(checked === true)}
              className="mt-0.5"
            />
            <span className={cn(intentado && !confirmado && "text-red")}>
              El acudiente autoriza al establecimiento a tratar los datos del estudiante
            </span>
          </label>
          <FieldDescription>Al autorizar, los datos dejan de verse enmascarados y se podrán modificar.</FieldDescription>
        </Field>
        <p className="text-xs text-muted-foreground">Los campos marcados con * son obligatorios</p>

        <DialogFooter>
          <Button variant="outline" color="neutral"
            type="button"
            disabled={registrar.isPending}
            onClick={() => onOpenChange(false)}
          >
            <XIcon data-icon="inline-start" />
            Cancelar
          </Button>
          <Button type="button" disabled={registrar.isPending} onClick={guardar}>
            {registrar.isPending ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <FloppyDiskIcon data-icon="inline-start" />
            )}
            Registrar autorización
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
