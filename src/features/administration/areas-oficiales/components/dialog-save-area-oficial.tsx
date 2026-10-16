import { useState } from "react"

import { ConfirmDiscardDialog } from "@/components/confirm-discard-dialog"
import { NoticeBanner, type Notice } from "@/components/notice/notice-banner"
import { useNotify } from "@/components/notice/notice-context"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CheckIcon, SpinnerIcon, XIcon } from "@/components/ui/icons"
import { Switch } from "@/components/ui/switch"
import { getErrorMessage } from "@/lib/api-client"
import type { SelectOption } from "@/lib/catalog-options"
import { useAppForm } from "@/lib/forms"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import { cn } from "@/lib/utils"

import { useEstadoAreaOficial } from "@/features/administration/areas-oficiales/api/mutations/estado-area-oficial"
import { useSaveAreaOficial } from "@/features/administration/areas-oficiales/api/mutations/save-area-oficial"
import {
  areaOficialFormSchema,
  type AreaOficialFormValues,
} from "@/features/administration/areas-oficiales/api/schema"
import {
  DIMENSION_TRANSVERSAL_LABEL,
  type AreaOficial,
} from "@/features/administration/areas-oficiales/api/types/area-oficial"
import { NivelesField } from "@/features/administration/areas-oficiales/components/niveles-field"

const FORM_ID = "area-oficial-form"

interface DialogSaveAreaOficialProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Presente = modificar. */
  area: AreaOficial | null
  niveles: SelectOption<number>[]
}

/** "Nueva área oficial" / "Modificar área oficial". Lo abre la página. */
export function DialogSaveAreaOficial({
  open,
  onOpenChange,
  area,
  niveles,
}: DialogSaveAreaOficialProps) {
  // El form se monta en cada apertura: arranca de los datos del área.
  if (!open) return null
  return (
    <SaveAreaOficialContent
      key={area?.pkAreaOficial ?? "nueva"}
      area={area}
      niveles={niveles}
      onClose={() => onOpenChange(false)}
    />
  )
}

function SaveAreaOficialContent({
  area,
  niveles,
  onClose,
}: {
  area: AreaOficial | null
  niveles: SelectOption<number>[]
  onClose: () => void
}) {
  const isEditing = area != null
  const { notify } = useNotify()
  const [notice, setNotice] = useState<Notice | null>(null)
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false)

  const defaultValues: AreaOficialFormValues = {
    nombre: area?.nombre ?? "",
    niveles: area?.niveles.map((n) => n.pkNivel) ?? [],
    habilitada: area?.habilitada ?? true,
  }

  const save = useSaveAreaOficial()
  const estado = useEstadoAreaOficial()
  const busy = save.isPending || estado.isPending

  const form = useAppForm({
    defaultValues,
    validators: { onChange: areaOficialFormSchema, onSubmit: areaOficialFormSchema },
    onSubmit: ({ value }) => guardar(value),
  })

  // Datos y estado son dos endpoints: primero los datos, luego el estado.
  async function guardar(value: AreaOficialFormValues) {
    const nombre = value.nombre.trim()
    const cambianDatos =
      !isEditing ||
      nombre !== area.nombre ||
      JSON.stringify([...value.niveles].sort()) !== JSON.stringify([...defaultValues.niveles].sort())
    const cambiaEstado = isEditing && value.habilitada !== area.habilitada
    try {
      if (cambianDatos)
        await save.mutateAsync({ id: area?.pkAreaOficial, nombre, niveles: value.niveles })
      if (cambiaEstado)
        await estado.mutateAsync({ id: area.pkAreaOficial, habilitada: value.habilitada })
      onClose()
      if (cambianDatos || !cambiaEstado)
        notify(isEditing ? SUCCESS_MESSAGES.areaOficial.updated : SUCCESS_MESSAGES.areaOficial.created)
      else
        notify(
          value.habilitada
            ? SUCCESS_MESSAGES.areaOficial.activated
            : SUCCESS_MESSAGES.areaOficial.deactivated,
        )
    } catch (error) {
      // Nombre repetido (409) llega con el texto del requerimiento desde el back.
      setNotice({ id: Date.now(), message: getErrorMessage(error) })
    }
  }

  function requestClose() {
    if (busy) return
    if (JSON.stringify(form.state.values) !== JSON.stringify(defaultValues)) {
      setConfirmDiscardOpen(true)
      return
    }
    onClose()
  }

  return (
    // Escape, click afuera y la X pasan por la confirmación de descarte.
    <Dialog open onOpenChange={(next) => !next && requestClose()}>
      <DialogContent className="sm:max-w-xl" inert={confirmDiscardOpen}>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Modificar área oficial" : "Nueva área oficial"}</DialogTitle>
          {area?.esDimensionTransversal && (
            <DialogDescription>{DIMENSION_TRANSVERSAL_LABEL}</DialogDescription>
          )}
        </DialogHeader>
        <NoticeBanner notice={notice} onClose={() => setNotice(null)} variant="error" />
        <form
          id={FORM_ID}
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
          className="flex flex-col gap-4"
        >
          <form.AppField name="nombre">
            {(f) => (
              <f.TextField
                label="Nombre"
                required
                maxLength={100}
                placeholder="Ej. Matemáticas"
                description="De 3 a 100 caracteres. No puede repetirse en el catálogo."
              />
            )}
          </form.AppField>
          <form.AppField name="niveles">{() => <NivelesField options={niveles} />}</form.AppField>
          <form.AppField name="habilitada">
            {(f) => (
              <EstadoSwitch
                checked={f.state.value}
                // Una nueva nace activa; el estado se cambia al modificar.
                disabled={!isEditing}
                onChange={(next) => f.handleChange(next)}
              />
            )}
          </form.AppField>
        </form>
        <DialogFooter>
          <Button size="sm" type="submit" color="primary" form={FORM_ID} disabled={busy} aria-busy={busy}>
            {busy ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <CheckIcon data-icon="inline-start" />
            )}
            Guardar
          </Button>
          <Button size="sm" type="button" variant="fill" color="neutral" onClick={requestClose}>
            <XIcon data-icon="inline-start" />
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
      <ConfirmDiscardDialog
        open={confirmDiscardOpen}
        onOpenChange={setConfirmDiscardOpen}
        onConfirm={() => {
          setConfirmDiscardOpen(false)
          onClose()
        }}
      />
    </Dialog>
  )
}

/** Mismo aspecto que el estado de Listas de valor. */
function EstadoSwitch({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label
      htmlFor="area-oficial-estado"
      className={cn(
        "flex items-start gap-3 rounded-md border px-3 py-2.5",
        checked ? "border-border" : "border-dashed border-border bg-muted/40",
        disabled ? "cursor-not-allowed" : "cursor-pointer",
      )}
    >
      <Switch
        id="area-oficial-estado"
        size="sm"
        round
        className="mt-0.5"
        checked={checked}
        disabled={disabled}
        onCheckedChange={(next) => !disabled && onChange(next)}
      />
      <span className="flex flex-col gap-0.5 text-sm">
        <span className={cn("font-medium", !checked && "text-muted-foreground")}>
          {checked ? "Activa" : "Inactiva"}
        </span>
        <span className="text-xs text-muted-foreground">
          {checked
            ? "Se ofrece en Planes de Estudio y Referentes. Si la inactiva, deja de ofrecerse, pero lo que ya la tiene asociada la conserva."
            : "No se ofrece en Planes de Estudio ni Referentes. Lo que ya la tiene asociada la conserva."}
        </span>
      </span>
    </label>
  )
}
