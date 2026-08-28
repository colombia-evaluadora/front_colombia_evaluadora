import { useState, type FormEvent } from "react"

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

import { useCreateEvidences } from "@/features/academic-management/curricular-references/api/mutations/use-statement-mutations"

interface AddEvidencesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  statementId: number
  levelLabel: string
}

export function AddEvidencesDialog({ open, onOpenChange, statementId, levelLabel }: AddEvidencesDialogProps) {
  const { notify } = useNotify()
  const [text, setText] = useState("")
  const [active, setActive] = useState(true)
  const [error, setError] = useState("")

  const createMutation = useCreateEvidences({
    mutationConfig: {
      onSuccess: () => {
        notify(`${levelLabel} agregada correctamente.`)
        setText("")
        setActive(true)
        onOpenChange(false)
      },
      onError: (error) => notify(getErrorMessage(error), { variant: "error" }),
    },
  })

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!text.trim()) {
      setError(`Escribe la ${levelLabel.toLowerCase()}.`)
      return
    }

    await createMutation.mutateAsync({ statementId, texts: [text.trim()], active })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!createMutation.isPending) {
          onOpenChange(next)
          if (!next) {
            setText("")
            setActive(true)
            setError("")
          }
        }
      }}
    >
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Agregar {levelLabel.toLowerCase()}</DialogTitle>
        </DialogHeader>

        <form id="add-evidences-form" onSubmit={handleSubmit}>
          <Field orientation="vertical" variant="outlined" data-invalid={error ? "true" : undefined}>
            <FieldLabel htmlFor="evidence-text">{levelLabel} *</FieldLabel>
            <Textarea
              id="evidence-text"
              value={text}
              aria-invalid={Boolean(error)}
              onChange={(event) => setText(event.target.value)}
              placeholder={`Escribe la ${levelLabel.toLowerCase()}...`}
              className="min-h-32 rounded-md border border-input px-3 py-2"
            />
            <FieldError>{error}</FieldError>
          </Field>

          <Field orientation="vertical" variant="outlined" className="mt-6">
            <FieldLabel htmlFor="evidence-status">Estado *</FieldLabel>
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
          <Button
            size="sm"
            type="submit"
            form="add-evidences-form"
            variant="fill"
            color="primary"
            disabled={createMutation.isPending}
          >
            <CheckIcon data-icon="inline-start" />
            {createMutation.isPending ? "Guardando..." : "Guardar"}
          </Button>
          <Button
            size="sm"
            type="button"
            variant="fill"
            color="neutral"
            disabled={createMutation.isPending}
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
