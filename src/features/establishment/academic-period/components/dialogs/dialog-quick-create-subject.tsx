import { useState } from "react"
import { z } from "zod"
import { useSelector } from "@tanstack/react-form"

import { getErrorMessage } from "@/lib/api-client"
import { useAppForm } from "@/lib/forms"
import { maxLength, required } from "@/lib/forms/messages"
import { NoticeBanner, type NoticeVariant } from "@/components/notice/notice-banner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { toFieldErrors } from "@/lib/forms"
import { EspecialidadSelect } from "@/features/establishment/academic-period/components/fields/especialidad-select"
import { SelectGeneralAreaDialog } from "@/features/establishment/academic-period/components/dialogs/dialog-select-general-area"
import { Switch } from "@/components/ui/switch"
import {
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
  ComboboxGroup,
  ComboboxSeparator,
} from "@/components/ui/combobox"
import { CheckIcon, PlusIcon, SpinnerIcon, XIcon } from "@/components/ui/icons"
import { CreateAreaDialog } from "@/features/establishment/academic-period/components/dialogs/dialog-create-area"

import { ColorPickerPopover } from "@/features/establishment/academic-period/components/fields/color-picker"
import { useGeneralAreasQuery } from "@/features/establishment/academic-period/api/query/use-general-areas"
import { useEspecialidadesQuery } from "@/features/establishment/academic-period/api/query/use-especialidades"
import { usePeriodAreasQuery } from "@/features/establishment/academic-period/api/query/use-period-areas"
import { useSubjectDetailsQuery } from "@/features/establishment/academic-period/api/query/use-subject-details-query"
import { useCreateAreaSubject } from "@/features/establishment/academic-period/api/mutations/create-area-subject"
import { useCreateSubject } from "@/features/establishment/academic-period/api/mutations/create-subject"
import { DEFAULT_SUBJECT_COLOR } from "@/features/establishment/academic-period/utils/schedule-data"
import { useGuardedDialog } from "@/features/establishment/academic-period/hooks/use-guarded-dialog"

interface QuickCreateSubjectDialogProps {
  academicPeriodId?: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (subject: { id: number; nombreInterno: string }) => void
  isPreescolar?: boolean
  subjectLabel?: string
}

const FORM_ID = "quick-create-subject-form"
const CREATE_AREA_VALUE = "__create_area__"

// Formulario "Crear asignatura" (Sección 5.3, Reglas 62 y 67).
function makeSchema(isPreescolar: boolean) {
  return z
    .object({
      // Nombre del área oficial: lo elige el diálogo del catálogo (son muchas).
      asignaturaGeneral: isPreescolar
        ? z.string()
        : z.string().min(1, required("La asignatura general", { femenino: true })),
      nombre: z.string().trim().min(4, "El nombre debe tener al menos 4 caracteres").max(100, maxLength(100, "El nombre")),
      abreviacion: z
        .string()
        .trim()
        .min(2, "La abreviación debe tener al menos 2 caracteres")
        .max(10, maxLength(10, "La abreviación")),
      orden: z
        .number({ error: "El orden debe ser de 1 a 99." })
        .int("El orden debe ser de 1 a 99.")
        .min(1, "El orden debe ser de 1 a 99.")
        .max(99, "El orden debe ser de 1 a 99."),
      color: z.string().min(1, required("El color")),
      // Nombre de la especialidad (el selector permite agregar una nueva).
      especialidad: z.string(),
      crearArea: z.boolean(),
      areaId: z.number(),
    })
    .superRefine((data, ctx) => {
      if (!data.crearArea && !isPreescolar && data.areaId <= 0) {
        ctx.addIssue({ code: "custom", message: required("El área"), path: ["areaId"] })
      }
    })
}

export function QuickCreateSubjectDialog({
  academicPeriodId,
  open,
  onOpenChange,
  onSaved,
  isPreescolar = false,
  subjectLabel = "Asignatura",
}: QuickCreateSubjectDialogProps) {
  const subjectWord = subjectLabel.toLowerCase()
  const [notice, setNotice] = useState<{ message: string; variant: NoticeVariant } | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [createAreaOpen, setCreateAreaOpen] = useState(false)

  const { data: generalAreas = [] } = useGeneralAreasQuery()
  const { data: especialidades = [] } = useEspecialidadesQuery(academicPeriodId)
  const { data: periodAreas = [] } = usePeriodAreasQuery(academicPeriodId)
  const { data: subjectDetails = [] } = useSubjectDetailsQuery(academicPeriodId)
  const createAreaSubject = useCreateAreaSubject()
  const createSubject = useCreateSubject()

  const defaultValues = {
    asignaturaGeneral: "",
    nombre: "",
    abreviacion: "",
    orden: Number.NaN,
    color: DEFAULT_SUBJECT_COLOR,
    especialidad: "",
    // Preescolar: cada dimensión crea su propia área (Regla 60).
    crearArea: isPreescolar,
    areaId: 0,
  }

  const form = useAppForm({
    defaultValues,
    validators: { onSubmit: makeSchema(isPreescolar) },
    onSubmit: async ({ value }) => {
      const nombre = value.nombre.trim()
      const abreviacion = value.abreviacion.trim()
      const same = (a: string, b: string) => a.trim().toUpperCase() === b.toUpperCase()
      // Nombre y Abreviación únicos dentro del período (Regla 62).
      if (subjectDetails.some((s) => same(s.nombreInterno, nombre))) {
        setNotice({ message: `Ya existe una ${subjectWord} llamada ${nombre} en el período.`, variant: "error" })
        return
      }
      if (subjectDetails.some((s) => same(s.abreviacion, abreviacion))) {
        setNotice({ message: `Ya existe una ${subjectWord} con la abreviación ${abreviacion} en el período.`, variant: "error" })
        return
      }
      const generalId = isPreescolar
        ? generalAreas[0]?.id
        : generalAreas.find((a) => a.nombre === value.asignaturaGeneral)?.id
      if (generalId == null) return

      setIsSaving(true)
      setNotice(null)
      try {
        let areaId = value.crearArea ? undefined : value.areaId
        if (areaId == null) {
          // "Crear área con los mismos datos" (Regla 67).
          const area = await createAreaSubject.mutateAsync({
            areaGeneral: String(generalId),
            nombreInterno: nombre,
            abreviacion,
            ordenReportes: value.orden,
            subjects: [],
            academicPeriodId,
          })
          areaId = area.codigo
        }
        // El hook espera el refetch, así `onSaved` puede autoseleccionarla.
        const subjectId = await createSubject.mutateAsync({
          areaId,
          areaGeneralId: generalId,
          nombreInterno: nombre,
          abreviacion,
          ordenReportes: value.orden,
          color: value.color,
          enfasisId: especialidades.find((e) => e.label === value.especialidad)?.id,
          academicPeriodId,
        })
        onSaved({ id: subjectId, nombreInterno: nombre })
        close()
      } catch (error) {
        setNotice({ message: getErrorMessage(error), variant: "error" })
      } finally {
        setIsSaving(false)
      }
    },
  })

  const crearArea = useSelector(form.store, (s) => s.values.crearArea)

  function close() {
    onOpenChange(false)
    setNotice(null)
    form.reset(defaultValues)
  }

  // Sin confirmación de descarte: solo bloquea el cierre mientras guarda.
  const guarded = useGuardedDialog({
    isSaving,
    isDirty: () => false,
    onOpen: () => onOpenChange(true),
    onClose: close,
  })

  return (
    <Dialog open={open} onOpenChange={guarded.onOpenChange}>
      <DialogPortal>
        <DialogOverlay forceRender className="bg-black/30" />
      </DialogPortal>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Crear {subjectWord}</DialogTitle>
        </DialogHeader>

        <NoticeBanner
          notice={notice ? { id: 1, ...notice } : null}
          onClose={() => setNotice(null)}
          variant={notice?.variant}
        />

        <form
          id={FORM_ID}
          onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
            form.handleSubmit()
          }}
          className="grid gap-x-4 gap-y-5 sm:grid-cols-2"
        >
          {!isPreescolar && (
            <div className="sm:col-span-2">
              <form.Field name="asignaturaGeneral">
                {(field) => {
                  const invalid = form.state.submissionAttempts > 0 && !field.state.meta.isValid
                  return (
                    <Field variant="outlined" data-invalid={invalid || undefined}>
                      <FieldLabel>
                        {subjectLabel} general<span className="text-red"> *</span>
                      </FieldLabel>
                      <SelectGeneralAreaDialog
                        value={field.state.value}
                        onChange={(nombre) => field.handleChange(nombre)}
                        invalid={invalid}
                        allowDelete={false}
                      />
                      {invalid ? (
                        <FieldError errors={toFieldErrors(field.state.meta.errors)} />
                      ) : (
                        <FieldDescription>Catálogo de Áreas oficiales.</FieldDescription>
                      )}
                    </Field>
                  )
                }}
              </form.Field>
            </div>
          )}

          <form.AppField name="nombre">
            {(field) => (
              <field.TextField label={`Nombre de la ${subjectWord}`} required maxLength={100} showCounter placeholder="" />
            )}
          </form.AppField>
          <form.AppField name="abreviacion">
            {(field) => (
              <field.TextField
                label="Abreviación"
                required
                maxLength={10}
                placeholder=""
                transform={(v) => v.toUpperCase()}
              />
            )}
          </form.AppField>

          <form.AppField name="orden">
            {(field) => <field.NumberField label="Orden" required valueAs="number" maxDigits={2} placeholder="" />}
          </form.AppField>
          <form.Field name="color">
            {(field) => (
              <Field variant="outlined">
                <FieldLabel>
                  Color<span className="text-red"> *</span>
                </FieldLabel>
                <ColorPickerPopover value={field.state.value} onChange={(c) => field.handleChange(c)} />
              </Field>
            )}
          </form.Field>

          {!isPreescolar && (
            <>
              <form.Field name="especialidad">
                {(field) => (
                  <Field variant="outlined">
                    <FieldLabel>Especialidad</FieldLabel>
                    <EspecialidadSelect
                      value={field.state.value}
                      academicPeriodId={academicPeriodId}
                      onChange={(nombre) => field.handleChange(nombre)}
                    />
                  </Field>
                )}
              </form.Field>
              <form.Field name="crearArea">
                {(field) => (
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="crear-area" className="text-sm">
                      Crear área con los mismos datos
                    </label>
                    <Switch
                      id="crear-area"
                      checked={field.state.value}
                      onCheckedChange={(checked) => field.handleChange(checked)}
                      className="rounded-full [&_[data-slot=switch-thumb]]:rounded-full"
                    />
                  </div>
                )}
              </form.Field>

              {!crearArea && (
                <div className="sm:col-span-2">
                  <form.Field name="areaId">
                    {(field) => {
                      const invalid = form.state.submissionAttempts > 0 && !field.state.meta.isValid
                      return (
                        <Field variant="outlined" data-invalid={invalid || undefined}>
                          <FieldLabel htmlFor="quick-subject-area">
                            Área<span className="text-red"> *</span>
                          </FieldLabel>
                          <ComboboxField
                            items={Object.fromEntries(periodAreas.map((a) => [String(a.id), a.label]))}
                            value={field.state.value ? String(field.state.value) : ""}
                            onValueChange={(value) => {
                              // "+ Crear área" abre su diálogo en vez de seleccionarse (Regla 67).
                              if (value === CREATE_AREA_VALUE) {
                                setCreateAreaOpen(true)
                                return
                              }
                              if (value) field.handleChange(Number(value))
                            }}
                          >
                            <ComboboxFieldTrigger id="quick-subject-area" aria-invalid={invalid || undefined}>
                              <ComboboxFieldValue placeholder="Seleccione..." />
                            </ComboboxFieldTrigger>
                            <ComboboxFieldContent>
                              <ComboboxGroup>
                                {periodAreas.length === 0 ? (
                                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                    Aún no hay áreas en el período.
                                  </div>
                                ) : (
                                  periodAreas.map((area) => (
                                    <ComboboxFieldItem key={area.id} value={String(area.id)} title={area.label}>
                                      {area.label}
                                    </ComboboxFieldItem>
                                  ))
                                )}
                              </ComboboxGroup>
                              <ComboboxSeparator />
                              <ComboboxGroup>
                                <ComboboxFieldItem value={CREATE_AREA_VALUE} className="text-primary">
                                  <span className="inline-flex items-center gap-1.5">
                                    <PlusIcon />
                                    Crear área
                                  </span>
                                </ComboboxFieldItem>
                              </ComboboxGroup>
                            </ComboboxFieldContent>
                          </ComboboxField>
                          {invalid ? (
                            <FieldError errors={toFieldErrors(field.state.meta.errors)} />
                          ) : (
                            <FieldDescription>Áreas ya creadas en el período.</FieldDescription>
                          )}
                        </Field>
                      )
                    }}
                  </form.Field>
                </div>
              )}
            </>
          )}
        </form>

        <DialogFooter>
          <Button size="sm" type="button" variant="outline" color="neutral" onClick={close} disabled={isSaving}>
            <XIcon data-icon="inline-start" />
            Cancelar
          </Button>
          <Button size="sm" type="submit" form={FORM_ID} color="primary" disabled={isSaving} aria-busy={isSaving}>
            {isSaving ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <CheckIcon data-icon="inline-start" />
            )}
            Crear y seleccionar
          </Button>
        </DialogFooter>
      </DialogContent>
      <CreateAreaDialog
        academicPeriodId={academicPeriodId}
        open={createAreaOpen}
        onOpenChange={setCreateAreaOpen}
        onSaved={(area) => form.setFieldValue("areaId", area.id)}
      />
    </Dialog>
  )
}
