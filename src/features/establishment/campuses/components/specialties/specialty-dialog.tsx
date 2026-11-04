import { useRef, useState } from "react"
import { useStore } from "@tanstack/react-form"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { FloppyDiskIcon, PlusIcon, SpinnerIcon, XIcon } from "@/components/ui/icons"
import { Switch } from "@/components/ui/switch"
import { ConfirmDiscardDialog } from "@/components/confirm-discard-dialog"
import { useNotify } from "@/components/notice/notice-context"
import { NoticeBanner, type NoticeVariant } from "@/components/notice/notice-banner"
import { getErrorMessage } from "@/lib/api-client"
import { useAppForm } from "@/lib/forms"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"

import { campusSpecialtySchema } from "@/features/establishment/campuses/api/schema"
import { useSaveCampusSpecialty } from "@/features/establishment/campuses/api/mutations/specialties"
import { useSpecialtyCatalogQuery } from "@/features/establishment/campuses/api/query/use-campus-specialties"
import type { CampusSpecialty } from "@/features/establishment/campuses/api/types/campus"
import { useGuardedDialog } from "@/features/establishment/academic-period/hooks/use-guarded-dialog"
import { formValuesEqual } from "@/features/establishment/academic-period/utils/form-values-equal"

const FORM_ID = "campus-specialty-form"

interface SpecialtyDialogProps {
  campusId: number
  /** `null` agrega una especialidad nueva. */
  item: CampusSpecialty | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function SpecialtyForm({ campusId, item, onClose }: { campusId: number; item: CampusSpecialty | null; onClose: () => void }) {
  const { notify } = useNotify()
  const { data: catalog = [] } = useSpecialtyCatalogQuery()
  const [notice, setNotice] = useState<{ id: number; message: string; variant: NoticeVariant } | null>(null)
  const noticeIdRef = useRef(0)

  const defaultValues = {
    characterId: item?.characterId ?? null,
    specialtyId: item?.specialtyId ?? null,
    ownName: item?.ownName ?? "",
    status: item?.status ?? "A",
    isOther: item?.isOther ?? false,
  } as {
    characterId: number | null
    specialtyId: number | null
    ownName: string
    status: "A" | "I"
    isOther: boolean
  }

  const save = useSaveCampusSpecialty({
    mutationConfig: {
      onSuccess: () => {
        notify(item ? SUCCESS_MESSAGES.campusSpecialty.updated : SUCCESS_MESSAGES.campusSpecialty.created)
        onClose()
      },
      onError: (error) => {
        noticeIdRef.current += 1
        setNotice({ id: noticeIdRef.current, message: getErrorMessage(error), variant: "error" })
      },
    },
  })

  const form = useAppForm({
    defaultValues,
    validators: { onSubmit: campusSpecialtySchema },
    onSubmit: ({ value }) => {
      save.mutate({
        campusId,
        specialtyItemId: item?.id ?? null,
        values: { characterId: value.characterId, specialtyId: value.specialtyId, ownName: value.ownName, status: value.status },
        isOther: value.isOther,
      })
    },
  })

  const characterId = useStore(form.store, (s) => s.values.characterId)
  const isOther = useStore(form.store, (s) => s.values.isOther)

  // Carácter es la lista padre de Especialidad (como en el C600 del DANE).
  const characters = [...new Map(catalog.map((c) => [c.characterId, c.characterName])).entries()].map(([value, label]) => ({
    value,
    label,
  }))
  const specialties = catalog
    .filter((c) => c.characterId === characterId)
    .map((c) => ({ value: c.id, label: c.isOther ? "Otra" : c.name }))

  const { confirmDiscardOpen, requestClose, onOpenChange, discardDialogProps } = useGuardedDialog({
    isSaving: save.isPending,
    isDirty: () => !formValuesEqual(form.state.values, defaultValues),
    onOpen: () => {},
    onClose,
  })

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl" inert={confirmDiscardOpen} showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{item ? "Modificar especialidad" : "Agregar especialidad"}</DialogTitle>
        </DialogHeader>

        <NoticeBanner
          notice={notice}
          onClose={() => setNotice(null)}
          variant={notice?.variant}
          autoCloseMs={notice?.variant === "error" ? 12000 : 4000}
        />

        <form
          id={FORM_ID}
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
          className="grid gap-x-4 gap-y-5 sm:grid-cols-[1fr_1fr_auto]"
        >
          <form.AppField
            name="characterId"
            listeners={{
              // Al cambiar el carácter se limpia la especialidad.
              onChange: () => {
                form.setFieldValue("specialtyId", null)
                form.setFieldValue("isOther", false)
                form.setFieldValue("ownName", "")
              },
            }}
          >
            {(f) => <f.SelectField label="Carácter" required options={characters} emptyValue={null} />}
          </form.AppField>

          <form.AppField
            name="specialtyId"
            listeners={{
              onChange: ({ value }) => {
                const other = catalog.find((c) => c.id === value)?.isOther ?? false
                form.setFieldValue("isOther", other)
                if (!other) form.setFieldValue("ownName", "")
              },
            }}
          >
            {(f) => (
              <f.SelectField
                label="Especialidad"
                required
                options={specialties}
                emptyValue={null}
                disabled={characterId == null}
              />
            )}
          </form.AppField>

          <form.Field name="status">
            {(field) => (
              <Field orientation="vertical" className="gap-2">
                <FieldLabel htmlFor="campus-specialty-status" className="normal-case tracking-normal">Estado*</FieldLabel>
                <div className="flex h-9 items-center gap-2">
                  <Switch
                    id="campus-specialty-status"
                    checked={field.state.value === "A"}
                    onCheckedChange={(checked) => field.handleChange(checked ? "A" : "I")}
                  />
                  <span className="text-sm text-muted-foreground">{field.state.value === "A" ? "Activo" : "Inactivo"}</span>
                </div>
              </Field>
            )}
          </form.Field>

          <div className="sm:col-span-3">
            <form.AppField name="ownName">
              {(f) => (
                <f.TextField
                  label="Nombre propio"
                  required={isOther}
                  maxLength={100}
                  showCounter
                  disabled={!isOther}
                  description={isOther ? "Único en el catálogo de la sede." : "Solo para la especialidad Otra."}
                />
              )}
            </form.AppField>
          </div>
        </form>

        <DialogFooter>
          <Button size="sm" type="button" variant="outline" color="neutral" onClick={requestClose}>
            <XIcon data-icon="inline-start" />
            Cancelar
          </Button>
          <Button size="sm" type="submit" color="primary" form={FORM_ID} disabled={save.isPending} aria-busy={save.isPending}>
            {save.isPending ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : item ? (
              <FloppyDiskIcon data-icon="inline-start" />
            ) : (
              <PlusIcon data-icon="inline-start" />
            )}
            {item ? "Guardar" : "Agregar"}
          </Button>
        </DialogFooter>
      </DialogContent>

      <ConfirmDiscardDialog {...discardDialogProps} />
    </Dialog>
  )
}

/** Agregar o modificar una especialidad del catálogo de la sede. */
export function SpecialtyDialog({ campusId, item, open, onOpenChange }: SpecialtyDialogProps) {
  return (
    // Montado solo abierto y con `key`: el formulario arranca de los datos del ítem cada vez.
    open ? <SpecialtyForm key={item?.id ?? "nuevo"} campusId={campusId} item={item} onClose={() => onOpenChange(false)} /> : null
  )
}
