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
import {
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
} from "@/components/ui/combobox"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"

import { toSentenceCase } from "@/features/academic-management/curricular-references/api/ui-mappings"
import { useCreateStatement, useUpdateStatement } from "@/features/academic-management/curricular-references/api/mutations/use-statement-mutations"
import type { CurricularStatement } from "@/features/academic-management/curricular-references/api/types/statement"

interface StatementArea {
  id: number
  name: string
}

interface ManageStatementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  curricularReferenceId: number
  areaId: number | null | undefined
  areas: StatementArea[]
  statement?: CurricularStatement | null
  levelLabel: string
  /** Se dispara al crear uno nuevo, para seleccionarlo automáticamente en el
   * Panel Izquierdo y dejar al usuario listo para agregar Nivel 2. */
  onCreated?: (id: number) => void
}

// Sentinel: los ids reales de área son PKs de BD (siempre > 0), así que 0
// queda libre para representar "Sin asignar" (AREA_ID nulo) en el combobox.
const UNASSIGNED_AREA = 0

export function ManageStatementDialog({
  open,
  onOpenChange,
  curricularReferenceId,
  areaId,
  areas,
  statement = null,
  levelLabel,
  onCreated,
}: ManageStatementDialogProps) {
  const { notify } = useNotify()
  const isEditMode = statement !== null

  const [text, setText] = useState("")
  const [active, setActive] = useState(true)
  const [statementAreaId, setStatementAreaId] = useState<number | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!open) return
    setText(statement?.text ?? "")
    setActive(statement?.active ?? true)
    setStatementAreaId(statement?.areaId ?? null)
    setError("")
  }, [open, statement])

  const createMutation = useCreateStatement({
    mutationConfig: {
      onSuccess: (result) => {
        notify(`${levelLabel} creado correctamente.`)
        if (result.id != null) onCreated?.(result.id)
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
    ? text.trim() !== (statement?.text ?? "") ||
      active !== (statement?.active ?? true) ||
      statementAreaId !== (statement?.areaId ?? null)
    : true
  const canSave = hasRequiredFields && hasChanges

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!text.trim()) {
      setError(`Escribe el texto del ${levelLabel.toLowerCase()}.`)
      return
    }

    if (isEditMode && statement) {
      await updateMutation.mutateAsync({
        id: statement.id,
        values: { text: text.trim(), active, areaId: statementAreaId },
      })
      return
    }

    if (areaId === undefined) return
    await createMutation.mutateAsync({ curricularReferenceId, areaId, text: text.trim(), active })
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !isPending && onOpenChange(next)}>
      <DialogContent showCloseButton={false} className="flex max-h-[85vh] flex-col overflow-hidden sm:max-w-xl">
        <DialogHeader className="shrink-0">
          <DialogTitle className="break-words hyphens-auto" lang="es">
            {isEditMode ? `Editar ${levelLabel.toLowerCase()}` : `Agregar ${levelLabel.toLowerCase()}`}
          </DialogTitle>
        </DialogHeader>

        <form
          id="manage-statement-form"
          onSubmit={handleSubmit}
          className="scrollbar-slim min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1"
        >
          <Field orientation="vertical" variant="outlined" data-invalid={error ? "true" : undefined}>
            <FieldLabel htmlFor="statement-text" className="right-2.5 w-auto break-words hyphens-auto" lang="es">
              {levelLabel} *
            </FieldLabel>
            <Textarea
              id="statement-text"
              value={text}
              maxLength={400}
              aria-invalid={Boolean(error)}
              onChange={(event) => setText(event.target.value)}
              placeholder={`Escribe el ${levelLabel.toLowerCase()}...`}
              className="field-sizing-fixed max-w-full min-h-32 rounded-md border border-input px-3 py-2 break-all"
            />
            <CharacterCounter value={text} max={400} />
            <FieldError>{error}</FieldError>
          </Field>

          {isEditMode && areas.length > 0 && (
            <Field orientation="vertical" variant="outlined" className="mt-6">
              <FieldLabel htmlFor="statement-area">Área o dimensión</FieldLabel>
              <ComboboxField
                items={{
                  [UNASSIGNED_AREA]: "Sin asignar",
                  ...Object.fromEntries(areas.map((area) => [area.id, toSentenceCase(area.name)])),
                }}
                value={statementAreaId ?? UNASSIGNED_AREA}
                onValueChange={(value) =>
                  setStatementAreaId(value == null || value === UNASSIGNED_AREA ? null : (value as number))
                }
              >
                <ComboboxFieldTrigger id="statement-area" size="sm">
                  <ComboboxFieldValue placeholder="Seleccionar" />
                </ComboboxFieldTrigger>
                <ComboboxFieldContent>
                  <ComboboxFieldItem value={UNASSIGNED_AREA}>Sin asignar</ComboboxFieldItem>
                  {areas.map((area) => (
                    <ComboboxFieldItem key={area.id} value={area.id}>
                      {toSentenceCase(area.name)}
                    </ComboboxFieldItem>
                  ))}
                </ComboboxFieldContent>
              </ComboboxField>
            </Field>
          )}

          <Field orientation="vertical" variant="outlined" className="mt-6">
            <FieldLabel htmlFor="statement-status">Estado</FieldLabel>
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

        <DialogFooter className="shrink-0 justify-end gap-2">
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
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
