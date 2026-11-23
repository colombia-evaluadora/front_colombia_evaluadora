import { useState } from "react"

import { ConfirmDiscardDialog } from "@/components/confirm-discard-dialog"
import { MarcoOpciones } from "@/components/marco-opciones"
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
import { FloppyDiskIcon, SpinnerIcon, XIcon } from "@/components/ui/icons"
import { Switch } from "@/components/ui/switch"
import { getErrorMessage } from "@/lib/api-client"
import type { SelectOption } from "@/lib/catalog-options"
import { useAppForm } from "@/lib/forms"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import { toSafeTextInput } from "@/lib/text-input"

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
    // Una nueva nace activa en el back: si se pide Inactiva, se inactiva después de crearla.
    const cambiaEstado = value.habilitada !== (area?.habilitada ?? true)
    try {
      let id = area?.pkAreaOficial
      if (cambianDatos) {
        const guardada = await save.mutateAsync({ id, nombre, niveles: value.niveles })
        id = guardada?.pkAreaOficial ?? id
      }
      if (cambiaEstado && id != null) await estado.mutateAsync({ id, habilitada: value.habilitada })
      onClose()
      if (!isEditing || cambianDatos || !cambiaEstado)
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
                transform={(v) => toSafeTextInput(v, 100)}
                placeholder="Ej. Matemáticas"
                description="De 3 a 100 caracteres. No puede repetirse en el catálogo."
              />
            )}
          </form.AppField>
          <form.AppField name="niveles">{() => <NivelesField options={niveles} />}</form.AppField>
          <form.AppField name="habilitada">
            {(f) => (
              <MarcoOpciones
                id="area-oficial-estado-marco"
                label="Estado"
                required
                descripcion={
                  f.state.value
                    ? "Se ofrece en planes de estudio y referentes. Si la inactiva, deja de ofrecerse, pero lo que ya la tiene asociada la conserva."
                    : "No se ofrece en planes de estudio ni referentes. Lo que ya la tiene asociada la conserva."
                }
              >
                <label htmlFor="area-oficial-estado" className="flex w-fit cursor-pointer items-center gap-3">
                  <Switch
                    round
                    id="area-oficial-estado"
                    checked={f.state.value}
                    onCheckedChange={(next) => f.handleChange(next)}
                  />
                  {f.state.value ? "Activa" : "Inactiva"}
                </label>
              </MarcoOpciones>
            )}
          </form.AppField>
        </form>
        <DialogFooter className="sm:items-center">
          <p className="text-xs text-muted-foreground sm:mr-auto">Los campos marcados con * son obligatorios</p>
          <Button size="sm" type="button" variant="outline" color="neutral" onClick={requestClose}>
            <XIcon data-icon="inline-start" />
            Cancelar
          </Button>
          <Button size="sm" type="submit" color="primary" form={FORM_ID} disabled={busy} aria-busy={busy}>
            {busy ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <FloppyDiskIcon data-icon="inline-start" />
            )}
            Guardar
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

