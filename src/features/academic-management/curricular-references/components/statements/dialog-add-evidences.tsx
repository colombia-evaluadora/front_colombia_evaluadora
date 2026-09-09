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
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { CharacterCounter } from "@/components/ui/character-counter"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"

import {
  useCreateEvidences,
  useUpdateEvidence,
} from "@/features/academic-management/curricular-references/api/mutations/use-statement-mutations"
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
      onSuccess: () => {
        notify(`${levelLabel} agregada correctamente.`)
        onOpenChange(false)
      },
      onError: (error) => notify(getErrorMessage(error), { variant: "error" }),
    },
  })

  const updateMutation = useUpdateEvidence({
    mutationConfig: {
      onSuccess: () => {
        notify(`${levelLabel} actualizada correctamente.`)
        onOpenChange(false)
      },
      onError: (error) => notify(getErrorMessage(error), { variant: "error" }),
    },
  })

  const isPending = createMutation.isPending || updateMutation.isPending

  const hasRequiredFields = text.trim().length > 0
  const hasChanges = isEditMode
    ? text.trim() !== (evidence?.text ?? "") || active !== (evidence?.active ?? true)
    : true
  const canSave = hasRequiredFields && hasChanges

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!text.trim()) {
      setError(`Escribe la ${levelLabel.toLowerCase()}.`)
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
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? `Editar ${levelLabel.toLowerCase()}` : `Agregar ${levelLabel.toLowerCase()}`}
          </DialogTitle>
        </DialogHeader>

        <form id="add-evidences-form" onSubmit={handleSubmit}>
          <Field orientation="vertical" variant="outlined" data-invalid={error ? "true" : undefined}>
            <FieldLabel htmlFor="evidence-text">{levelLabel} *</FieldLabel>
            <Textarea
              id="evidence-text"
              value={text}
              maxLength={400}
              aria-invalid={Boolean(error)}
              onChange={(event) => setText(event.target.value)}
              placeholder={`Escribe la ${levelLabel.toLowerCase()}...`}
              className="min-h-32 rounded-md border border-input px-3 py-2"
            />
            <CharacterCounter value={text} max={400} />
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

        <DialogFooter className="justify-end gap-2">
          {canSave && (
            <Button
              size="sm"
              type="submit"
              form="add-evidences-form"
              variant="fill"
              color="primary"
              disabled={isPending}
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
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
