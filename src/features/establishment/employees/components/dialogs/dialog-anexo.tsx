import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ControlPointIcon, SpinnerIcon, XIcon } from "@/components/ui/icons"
import { NoticeBanner } from "@/components/notice/notice-banner"
import { useAppForm } from "@/lib/forms"
import { getErrorMessage } from "@/lib/api-client"

import {
  ANEXO_EXTENSIONES,
  ANEXO_MAX_MB,
  anexoFormSchema,
  type AnexoFormValues,
} from "@/features/establishment/employees/api/schema"
import { ArchivoField } from "@/features/establishment/employees/components/forms/archivo-field"

const FORM_ID = "documento-anexo-form"

interface DialogAnexoProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Agrega el anexo (lo sube o lo deja pendiente); si tira, el error queda en el modal. */
  onAdd: (values: { name: string; description: string; file: File }) => Promise<void>
}

/** Modal de operación "Documento anexo" (Regla 81): los tres campos son obligatorios. */
export function DialogAnexo({ open, onOpenChange, onAdd }: DialogAnexoProps) {
  const [error, setError] = useState<{ id: number; message: string } | null>(null)
  const form = useAppForm({
    defaultValues: { name: "", description: "", file: null } as AnexoFormValues,
    validators: { onSubmit: anexoFormSchema },
    onSubmit: async ({ value }) => {
      try {
        await onAdd({ name: value.name.trim(), description: value.description.trim(), file: value.file as File })
        form.reset()
        onOpenChange(false)
      } catch (err) {
        setError({ id: Date.now(), message: getErrorMessage(err) })
      }
    },
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (form.state.isSubmitting) return
        if (!next) {
          form.reset()
          setError(null)
        }
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Documento anexo</DialogTitle>
        </DialogHeader>
        <NoticeBanner notice={error} onClose={() => setError(null)} variant="error" />
        <form
          id={FORM_ID}
          noValidate
          className="flex flex-col gap-5"
          onSubmit={(event) => {
            event.preventDefault()
            event.stopPropagation()
            void form.handleSubmit()
          }}
        >
          <form.AppField name="name">
            {(f) => <f.TextField label="Nombre documento" required maxLength={100} showCounter placeholder="Ej.: Acta de posesión" />}
          </form.AppField>
          <form.AppField name="description">
            {(f) => <f.TextareaField label="Descripción" required maxLength={500} rows={3} placeholder="Para qué requisito es el soporte" />}
          </form.AppField>
          <form.AppField name="file">
            {() => (
              <ArchivoField
                label="Archivo"
                required
                hint={`PDF, Word, Excel, JPG o PNG; máximo ${ANEXO_MAX_MB} MB.`}
                extensions={ANEXO_EXTENSIONES}
                maxMb={ANEXO_MAX_MB}
              />
            )}
          </form.AppField>
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" color="neutral" size="sm" onClick={() => onOpenChange(false)}>
            <XIcon data-icon="inline-start" />
            Cancelar
          </Button>
          <form.Subscribe selector={(s) => s.isSubmitting}>
            {(submitting) => (
              <Button type="submit" form={FORM_ID} variant="fill" color="primary" size="sm" disabled={submitting}>
                {submitting ? (
                  <SpinnerIcon data-icon="inline-start" className="animate-spin" />
                ) : (
                  <ControlPointIcon data-icon="inline-start" />
                )}
                Agregar
              </Button>
            )}
          </form.Subscribe>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
