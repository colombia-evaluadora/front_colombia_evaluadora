import { useEffect, useState, type FormEvent } from "react"

import { Button } from "@/components/ui/button"
import { CheckIcon, XIcon } from "@/components/ui/icons"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { TEXTAREA_OUTLINED } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import { useOfflineWritable } from "@/lib/offline/outbox/hooks"
import { QUEUED_MESSAGE } from "@/lib/offline/outbox/engine"
import { cn } from "@/lib/utils"
import { CountedTextarea } from "@/features/academic-management/curricular-references/components/forms/counted-textarea"

import {
  useCreateEvidences,
  useUpdateEvidence,
} from "@/features/academic-management/curricular-references/api/mutations/use-statement-mutations"
import { toReferenteLongTextInput } from "@/features/academic-management/curricular-references/utils/catalogs"
import type { CurricularEvidence } from "@/features/academic-management/curricular-references/api/types/statement"

interface AddEvidencesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  curricularReferenceId: number
  statementId: number
  levelLabel: string
  evidence?: CurricularEvidence | null
}

export function AddEvidencesDialog({
  open,
  onOpenChange,
  curricularReferenceId,
  statementId,
  levelLabel,
  evidence = null,
}: AddEvidencesDialogProps) {
  const { notify } = useNotify()
  const isEditMode = evidence !== null

  const [text, setText] = useState("")
  const [active, setActive] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!open) return
    setText(evidence?.text ?? "")
    setActive(evidence?.active ?? true)
    setError("")
  }, [open, evidence])

  const createMutation = useCreateEvidences({
    mutationConfig: {
      onSuccess: (result) => {
        notify(result?.queued ? QUEUED_MESSAGE : `${levelLabel} agregada correctamente.`)
        onOpenChange(false)
      },
      onError: (error) => notify(getErrorMessage(error), { variant: "error" }),
    },
  })

  const updateMutation = useUpdateEvidence({
    mutationConfig: {
      onSuccess: (result) => {
        notify(result?.queued ? QUEUED_MESSAGE : `${levelLabel} actualizada correctamente.`)
        onOpenChange(false)
      },
      onError: (error) => notify(getErrorMessage(error), { variant: "error" }),
    },
  })

  const isPending = createMutation.isPending || updateMutation.isPending
  // Si la red cae con el diálogo abierto, Guardar queda deshabilitado (§7.5).
  // Fase 4 offline: las escrituras de enunciados/evidencias se encolan en la outbox.
  const soloEnLinea = useOfflineWritable()

  // Descripción: entre 10 y 500 caracteres (Formulario de Componentes).
  const hasRequiredFields = text.trim().length >= 10
  const hasChanges = isEditMode
    ? text.trim() !== (evidence?.text ?? "") || active !== (evidence?.active ?? true)
    : true
  const canSave = hasRequiredFields && hasChanges

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!text.trim()) {
      setError("Escribe la descripción.")
      return
    }
    if (text.trim().length < 10) {
      setError("Mínimo 10 caracteres.")
      return
    }

    if (isEditMode && evidence) {
      await updateMutation.mutateAsync({ id: evidence.id, values: { text: text.trim(), active } })
      return
    }

    await createMutation.mutateAsync({ curricularReferenceId, statementId, texts: [text.trim()], active })
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !isPending && onOpenChange(next)}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[85vh] flex-col overflow-hidden p-0 sm:max-w-xl"
      >
        <DialogHeader className="shrink-0 px-6 pt-6">
          <DialogTitle className="break-words hyphens-auto" lang="es">
            {isEditMode ? `Editar ${levelLabel.toLowerCase()}` : `Agregar ${levelLabel.toLowerCase()}`}
          </DialogTitle>
        </DialogHeader>

        <form
          id="add-evidences-form"
          onSubmit={handleSubmit}
          className="scrollbar-slim min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-6"
        >
          <Field orientation="vertical" variant="outlined" data-invalid={error ? "true" : undefined}>
            <FieldLabel htmlFor="evidence-text" className="right-2.5 w-auto break-words hyphens-auto" lang="es">
              {levelLabel} *
            </FieldLabel>
            <CountedTextarea
              id="evidence-text"
              value={text}
              maxLength={500}
              aria-invalid={Boolean(error)}
              onChange={(event) => setText(toReferenteLongTextInput(event.target.value))}
              placeholder={`Escribe la ${levelLabel.toLowerCase()}...`}
              className={cn(TEXTAREA_OUTLINED, "max-w-full min-h-32 break-all")}
            />
            <FieldError>{error}</FieldError>
          </Field>

          <Field orientation="vertical" variant="outlined" className="mt-6">
            <FieldLabel htmlFor="evidence-status">Estado</FieldLabel>
            <div className="border-input flex min-h-14 items-center gap-3 rounded-md border px-3 py-3">
              <span className="text-muted-foreground text-sm">Inactivo / Activo</span>
              <Switch
                id="evidence-status"
                checked={active}
                onCheckedChange={setActive}
                className="rounded-full [&_[data-slot=switch-thumb]]:rounded-full"
              />
            </div>
          </Field>
        </form>

        <DialogFooter className="shrink-0 justify-end gap-2 px-6 pb-6">
          {canSave && (
            <Button
              size="sm"
              type="submit"
              form="add-evidences-form"
              variant="fill"
              color="primary"
              disabled={isPending || soloEnLinea.disabled}
              title={soloEnLinea.tooltip ?? undefined}
            >
              <CheckIcon data-icon="inline-start" />
              {isPending ? "Guardando..." : "Guardar"}
            </Button>
          )}
          <Button
            size="sm"
            type="button"
            variant="fill"
            color="neutral"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            <XIcon data-icon="inline-start" />
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
