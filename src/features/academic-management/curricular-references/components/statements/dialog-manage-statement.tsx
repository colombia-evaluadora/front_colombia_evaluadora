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
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"

import { useCreateStatement, useUpdateStatement } from "@/features/academic-management/curricular-references/api/mutations/use-statement-mutations"
import type { CurricularStatement } from "@/features/academic-management/curricular-references/api/types/statement"

interface ManageStatementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  curricularReferenceId: number
  areaId: number | null | undefined
  statement?: CurricularStatement | null
  levelLabel: string
}

export function ManageStatementDialog({
  open,
  onOpenChange,
  curricularReferenceId,
  areaId,
  statement = null,
  levelLabel,
}: ManageStatementDialogProps) {
  const { notify } = useNotify()
  const isEditMode = statement !== null

  const [text, setText] = useState("")
  const [active, setActive] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!open) return
    setText(statement?.text ?? "")
    setActive(statement?.active ?? true)
    setError("")
  }, [open, statement])

  const createMutation = useCreateStatement({
    mutationConfig: {
      onSuccess: () => {
        notify(`${levelLabel} creado correctamente.`)
        onOpenChange(false)
      },
      onError: (error) => notify(getErrorMessage(error), { variant: "error" }),
    },
  })

  const updateMutation = useUpdateStatement({
    mutationConfig: {
      onSuccess: () => {
        notify(`${levelLabel} actualizado correctamente.`)
        onOpenChange(false)
      },
      onError: (error) => notify(getErrorMessage(error), { variant: "error" }),
    },
  })

  const isPending = createMutation.isPending || updateMutation.isPending

  const hasRequiredFields = text.trim().length > 0
  const hasChanges = isEditMode
    ? text.trim() !== (statement?.text ?? "") || active !== (statement?.active ?? true)
    : true
  const canSave = hasRequiredFields && hasChanges

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!text.trim()) {
      setError(`Escribe el texto del ${levelLabel.toLowerCase()}.`)
      return
    }

    if (isEditMode && statement) {
      await updateMutation.mutateAsync({ id: statement.id, values: { text: text.trim(), active } })
      return
    }

    if (areaId === undefined) return
    await createMutation.mutateAsync({ curricularReferenceId, areaId, text: text.trim(), active })
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !isPending && onOpenChange(next)}>
      <DialogContent showCloseButton={false} className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? `Editar ${levelLabel.toLowerCase()}` : `Agregar ${levelLabel.toLowerCase()}`}
          </DialogTitle>
        </DialogHeader>

        <form id="manage-statement-form" onSubmit={handleSubmit}>
          <Field orientation="vertical" variant="outlined" data-invalid={error ? "true" : undefined}>
            <FieldLabel htmlFor="statement-text">{levelLabel} *</FieldLabel>
            <Textarea
              id="statement-text"
              value={text}
              maxLength={400}
              aria-invalid={Boolean(error)}
              onChange={(event) => setText(event.target.value)}
              placeholder={`Escribe el ${levelLabel.toLowerCase()}...`}
              className="min-h-32 rounded-md border border-input px-3 py-2"
            />
            <FieldError>{error}</FieldError>
          </Field>

          <Field orientation="vertical" variant="outlined" className="mt-6">
            <FieldLabel htmlFor="statement-status">Estado *</FieldLabel>
            <div className="border-input flex min-h-14 items-center gap-3 rounded-md border px-3 py-3">
              <span className="text-muted-foreground text-sm">Inactivo / Activo</span>
              <Switch
                id="statement-status"
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
              form="manage-statement-form"
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
