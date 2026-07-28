import { useState } from "react"
import { useForm } from "@tanstack/react-form"
import { PencilIcon, PlusCircleIcon, SpinnerIcon } from "@/components/ui/icons"
import { toast } from "sonner"
import { z } from "zod"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { useCreateStudyPlanItem } from "../../../api/mutations/create-study-plan"
import { useUpdateStudyPlanItem } from "../../../api/mutations/update-study-plan"
import { useAreaSubjectQuery } from "../../../api/query/use-area-subject"
import type { StudyPlanItem } from "../../../api/types/academic-period/study-plan"

const FORMATO_CALIFICACION_OPTIONS = ["Numérico", "Conceptual", "Cualitativo"]

const CRITERIO_NOTA_OPTIONS = [
  "Promedio",
  "Promedio ponderado",
  "Última nota",
  "Sumatoria",
]

const studyPlanFormSchema = z.object({
  asignatura: z.string().min(1, "La asignatura es obligatoria"),
  intensidadHoraria: z.number().min(0),
  influenciaArea: z.number().min(0).max(100),
  numeroCreditos: z.number().min(0),
  influyeDesempeno: z.boolean(),
  matriculaObligatoria: z.boolean(),
  aprobacionObligatoria: z.boolean(),
  formatoCalificacion: z.string(),
  criterioNota: z.string(),
})
type StudyPlanFormValues = z.infer<typeof studyPlanFormSchema>

const EMPTY: StudyPlanFormValues = {
  asignatura: "",
  intensidadHoraria: 0,
  influenciaArea: 0,
  numeroCreditos: 0,
  influyeDesempeno: true,
  matriculaObligatoria: false,
  aprobacionObligatoria: false,
  formatoCalificacion: "",
  criterioNota: "",
}

const FORM_ID = "study-plan-form"

interface CreateStudyPlanDialogProps {
  academicPeriodId?: number
  gradeId?: number
  item?: StudyPlanItem
}

export function CreateStudyPlanDialog({
  academicPeriodId,
  gradeId,
  item,
}: CreateStudyPlanDialogProps) {
  const isEditing = item != null

  const [open, setOpen] = useState(false)
  // Cuando está apagado, los campos avanzados quedan deshabilitados (defaults).
  // Al editar arranca habilitado para poder ver/ajustar los campos avanzados.
  const [personalizar, setPersonalizar] = useState(isEditing)

  const defaultValues: StudyPlanFormValues = item
    ? {
        asignatura: item.asignatura,
        intensidadHoraria: item.intensidadHoraria,
        influenciaArea: item.influenciaArea,
        numeroCreditos: item.numeroCreditos,
        influyeDesempeno: item.influyeDesempeno,
        matriculaObligatoria: item.matriculaObligatoria ?? false,
        aprobacionObligatoria: item.aprobacionObligatoria ?? false,
        formatoCalificacion: item.formatoCalificacion ?? "",
        criterioNota: item.criterioNota ?? "",
      }
    : EMPTY

  // Las asignaturas disponibles son las definidas en área/asignatura del periodo.
  const { data: areaData } = useAreaSubjectQuery({
    filters: {},
    sorting: [],
    pageIndex: 0,
    pageSize: 100,
    academicPeriodId,
  })
  const asignaturaOptions = (areaData?.rows ?? []).map(
    (area) => area.nombreInterno
  )

  const createStudyPlanItem = useCreateStudyPlanItem({
    mutationConfig: {
      onSuccess: () => {
        toast.success("Asignatura agregada al plan de estudio.")
        form.reset()
        setPersonalizar(false)
        setOpen(false)
      },
    },
  })

  const updateStudyPlanItem = useUpdateStudyPlanItem({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          toast.error(result.message)
          return
        }
        toast.success(result.message)
        setOpen(false)
      },
    },
  })

  const isSaving = createStudyPlanItem.isPending || updateStudyPlanItem.isPending

  const form = useForm({
    defaultValues,
    validators: { onSubmit: studyPlanFormSchema },
    onSubmit: ({ value }) => {
      const values = studyPlanFormSchema.parse(value)
      if (isEditing) {
        updateStudyPlanItem.mutate({
          codigo: item.codigo,
          values: { ...values, codigo: item.codigo },
        })
      } else {
        createStudyPlanItem.mutate({
          ...values,
          codigo: Date.now(),
          academicPeriodId,
          gradeId,
        })
      }
    },
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) {
          form.reset()
          setPersonalizar(isEditing)
        }
      }}
    >
      <DialogTrigger
        render={
          isEditing ? (
            <Button variant="fill" color="secondary" size="icon" className="size-8" />
          ) : (
            <Button color="primary" size="sm" />
          )
        }
      >
        {isEditing ? (
          <>
            <span className="sr-only">Editar plan de estudio</span>
            <PencilIcon />
          </>
        ) : (
          <>
            <PlusCircleIcon weight="fill" data-icon="inline-start" />
            Agregar
          </>
        )}
      </DialogTrigger>
      {/* Backdrop forzado: base-ui no renderiza el de un diálogo anidado, así
          que lo agregamos con forceRender para que aparezca el difuminado. */}
      <DialogPortal>
        <DialogOverlay
          forceRender
          className="bg-black/30 supports-backdrop-filter:backdrop-blur-md"
        />
      </DialogPortal>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar plan de estudio" : "Agregar plan de estudio"}
          </DialogTitle>
          <DialogDescription>
            Completá los datos de la asignatura del plan de estudio.
          </DialogDescription>
        </DialogHeader>

        <form
          id={FORM_ID}
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
          className="flex flex-col gap-4"
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <form.Field name="asignatura">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid
                return (
                  <Field variant="outlined" data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Asignaturas*</FieldLabel>
                    <Select
                      value={field.state.value}
                      onValueChange={(value) => value && field.handleChange(value)}
                    >
                      <SelectTrigger id={field.name} aria-invalid={isInvalid}>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {asignaturaOptions.length === 0 ? (
                            <div className="px-2 py-1.5 text-sm text-muted-foreground">
                              No hay áreas/asignaturas en este periodo.
                            </div>
                          ) : (
                            asignaturaOptions.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))
                          )}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                  </Field>
                )
              }}
            </form.Field>

            <form.Field name="intensidadHoraria">
              {(field) => (
                <Field variant="outlined">
                  <FieldLabel htmlFor={field.name}>Intensidad horaria*</FieldLabel>
                  <Input
                    id={field.name}
                    type="number"
                    min={0}
                    placeholder="Seleccionar"
                    value={Number.isNaN(field.state.value) ? "" : field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.valueAsNumber)}
                  />
                </Field>
              )}
            </form.Field>

            <form.Field name="influenciaArea">
              {(field) => (
                <Field variant="outlined">
                  <FieldLabel htmlFor={field.name}>Influencia área*</FieldLabel>
                  <Input
                    id={field.name}
                    type="number"
                    min={0}
                    max={100}
                    placeholder="Seleccionar"
                    value={Number.isNaN(field.state.value) ? "" : field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.valueAsNumber)}
                  />
                </Field>
              )}
            </form.Field>

            <form.Field name="numeroCreditos">
              {(field) => (
                <Field variant="outlined">
                  <FieldLabel htmlFor={field.name}>Número de créditos *</FieldLabel>
                  <Input
                    id={field.name}
                    type="number"
                    min={0}
                    placeholder="Seleccionar"
                    value={Number.isNaN(field.state.value) ? "" : field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.valueAsNumber)}
                  />
                </Field>
              )}
            </form.Field>
          </div>

          <label className="flex w-fit items-center gap-3 text-sm font-medium">
            Personalizar
            <Switch checked={personalizar} onCheckedChange={setPersonalizar} />
          </label>

          <div
            className={cn(
              "grid gap-4 sm:grid-cols-3",
              !personalizar && "pointer-events-none opacity-50"
            )}
          >
            <form.Field name="influyeDesempeno">
              {(field) => (
                <Field>
                  <FieldLabel>
                    Influye en el desempeño académico (S/N)
                  </FieldLabel>
                  <RadioGroup
                    className="flex gap-6 pt-2"
                    disabled={!personalizar}
                    value={field.state.value ? "si" : "no"}
                    onValueChange={(value) => field.handleChange(value === "si")}
                  >
                    <label className="flex items-center gap-2">
                      <RadioGroupItem value="si" />
                      Sí
                    </label>
                    <label className="flex items-center gap-2">
                      <RadioGroupItem value="no" />
                      No
                    </label>
                  </RadioGroup>
                </Field>
              )}
            </form.Field>

            <form.Field name="matriculaObligatoria">
              {(field) => (
                <Field>
                  <FieldLabel>Matrícula obligatoria (S/N)</FieldLabel>
                  <RadioGroup
                    className="flex gap-6 pt-2"
                    disabled={!personalizar}
                    value={field.state.value ? "si" : "no"}
                    onValueChange={(value) => field.handleChange(value === "si")}
                  >
                    <label className="flex items-center gap-2">
                      <RadioGroupItem value="si" />
                      Sí
                    </label>
                    <label className="flex items-center gap-2">
                      <RadioGroupItem value="no" />
                      No
                    </label>
                  </RadioGroup>
                </Field>
              )}
            </form.Field>

            <form.Field name="aprobacionObligatoria">
              {(field) => (
                <Field>
                  <FieldLabel>Aprobación obligatoria (S/N)</FieldLabel>
                  <RadioGroup
                    className="flex gap-6 pt-2"
                    disabled={!personalizar}
                    value={field.state.value ? "si" : "no"}
                    onValueChange={(value) => field.handleChange(value === "si")}
                  >
                    <label className="flex items-center gap-2">
                      <RadioGroupItem value="si" />
                      Sí
                    </label>
                    <label className="flex items-center gap-2">
                      <RadioGroupItem value="no" />
                      No
                    </label>
                  </RadioGroup>
                </Field>
              )}
            </form.Field>

            <form.Field name="formatoCalificacion">
              {(field) => (
                <Field variant="outlined">
                  <FieldLabel htmlFor={field.name}>
                    Formato de calificación
                  </FieldLabel>
                  <Select
                    value={field.state.value}
                    disabled={!personalizar}
                    onValueChange={(value) => value && field.handleChange(value)}
                  >
                    <SelectTrigger id={field.name}>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {FORMATO_CALIFICACION_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              )}
            </form.Field>

            <form.Field name="criterioNota">
              {(field) => (
                <Field variant="outlined">
                  <FieldLabel htmlFor={field.name}>
                    Criterio para calcular la nota de la asignatura
                  </FieldLabel>
                  <Select
                    value={field.state.value}
                    disabled={!personalizar}
                    onValueChange={(value) => value && field.handleChange(value)}
                  >
                    <SelectTrigger id={field.name}>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {CRITERIO_NOTA_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              )}
            </form.Field>
          </div>
        </form>

        <DialogFooter className="sm:justify-between">
          <DialogClose render={<Button type="button" variant="ghost" />}>
            Cancelar
          </DialogClose>
          <Button
            type="submit"
            color="primary"
            form={FORM_ID}
            disabled={isSaving}
            aria-busy={isSaving}
          >
            {isSaving && (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            )}
            {isEditing ? "Guardar" : "Agregar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
