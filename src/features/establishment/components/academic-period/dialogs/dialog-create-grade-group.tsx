import { useMemo, useState } from "react"
import { useForm } from "@tanstack/react-form"
import { PencilIcon, PlusCircleIcon, SpinnerIcon } from "@/components/ui/icons"
import { toast } from "sonner"
import { z } from "zod"

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
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { useCreateGradeGroup } from "../../../api/mutations/create-grade-group"
import { useUpdateGradeGroup } from "../../../api/mutations/update-grade-group"
import { useTeachersQuery } from "../../../api/query/use-teachers-query"
import { JORNADA_OPTIONS } from "../../../api/ui-mappings"
import type { GradeGroup } from "../../../api/types/academic-period/grade-group"

const METODOLOGIA_OPTIONS = [
  "Tradicional",
  "Escuela Nueva",
  "Aceleración del Aprendizaje",
  "Postprimaria",
]

const gradeGroupFormSchema = z.object({
  codigo: z.string().min(1, "El grupo es obligatorio"),
  jornada: z.string().min(1, "La jornada es obligatoria"),
  director: z.string(),
  planEstudio: z.string().min(1, "El plan de estudio es obligatorio"),
  metodologia: z.string(),
  cupo: z.number().min(0),
})
type GradeGroupFormValues = z.infer<typeof gradeGroupFormSchema>

const EMPTY: GradeGroupFormValues = {
  codigo: "",
  jornada: "",
  director: "",
  planEstudio: "",
  metodologia: "",
  cupo: 0,
}

const FORM_ID = "grade-group-form"

interface CreateGradeGroupDialogProps {
  gradeId?: number
  academicPeriodId?: number
  gradeGroup?: GradeGroup
}

export function CreateGradeGroupDialog({
  gradeId,
  academicPeriodId,
  gradeGroup,
}: CreateGradeGroupDialogProps) {
  const isEditing = gradeGroup != null
  const [open, setOpen] = useState(false)

  const { data: teachersData } = useTeachersQuery({
    filters: {},
    sorting: [],
    pageIndex: 0,
    pageSize: 1000,
    academicPeriodId,
  })
  const teacherNames = useMemo(
    () => (teachersData?.rows ?? []).map((t) => `${t.nombre} ${t.apellido}`),
    [teachersData]
  )

  const defaultValues: GradeGroupFormValues = gradeGroup
    ? {
        codigo: gradeGroup.codigo,
        jornada: gradeGroup.jornada,
        director: gradeGroup.director,
        planEstudio: gradeGroup.planEstudio,
        metodologia: gradeGroup.metodologia ?? "",
        cupo: gradeGroup.cupo ?? 0,
      }
    : EMPTY

  const createGradeGroup = useCreateGradeGroup({
    mutationConfig: {
      onSuccess: () => {
        toast.success("Grupo creado.")
        form.reset()
        setOpen(false)
      },
    },
  })

  const updateGradeGroup = useUpdateGradeGroup({
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

  const isSaving = createGradeGroup.isPending || updateGradeGroup.isPending

  const form = useForm({
    defaultValues,
    validators: { onSubmit: gradeGroupFormSchema },
    onSubmit: ({ value }) => {
      const values = gradeGroupFormSchema.parse(value)
      if (isEditing) {
        updateGradeGroup.mutate({ codigo: gradeGroup.codigo, values })
      } else {
        createGradeGroup.mutate({ ...values, gradeId })
      }
    },
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) form.reset()
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
            <span className="sr-only">Editar grupo</span>
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
      <DialogContent className="sm:max-w-3xl" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar grupo" : "Agregar grupo"}</DialogTitle>
          <DialogDescription>Completá los datos del grupo.</DialogDescription>
        </DialogHeader>

        <form
          id={FORM_ID}
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
          className="grid gap-x-4 gap-y-4 sm:grid-cols-3"
        >
          <form.Field name="codigo">
            {(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid
              return (
                <Field variant="outlined" data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Grupo</FieldLabel>
                  <Input
                    id={field.name}
                    placeholder="ej. 0001"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              )
            }}
          </form.Field>

          <form.Field name="jornada">
            {(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid
              return (
                <Field variant="outlined" data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Jornada</FieldLabel>
                  <Select
                    value={field.state.value}
                    onValueChange={(value) => value && field.handleChange(value)}
                  >
                    <SelectTrigger id={field.name} aria-invalid={isInvalid}>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {JORNADA_OPTIONS.map((jornada) => (
                          <SelectItem key={jornada.id} value={jornada.name}>
                            {jornada.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              )
            }}
          </form.Field>

          <form.Field name="director">
            {(field) => (
              <Field variant="outlined">
                <FieldLabel htmlFor={field.name}>Director de grupo</FieldLabel>
                <Combobox
                  items={teacherNames}
                  value={field.state.value || null}
                  onValueChange={(value) => field.handleChange((value as string) ?? "")}
                >
                  <ComboboxInput
                    id={field.name}
                    placeholder="Buscar profesor"
                    showClear
                    className="rounded-md border-input has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-2 has-[[data-slot=input-group-control]:focus-visible]:ring-ring/20"
                  />
                  <ComboboxContent>
                    <ComboboxEmpty>Sin profesores.</ComboboxEmpty>
                    <ComboboxList>
                      {(item: string) => (
                        <ComboboxItem key={item} value={item}>
                          {item}
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              </Field>
            )}
          </form.Field>

          <form.Field name="planEstudio">
            {(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid
              return (
                <Field variant="outlined" data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Plan de estudio</FieldLabel>
                  <Input
                    id={field.name}
                    placeholder="ej. Plan A"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              )
            }}
          </form.Field>

          <form.Field name="metodologia">
            {(field) => (
              <Field variant="outlined">
                <FieldLabel htmlFor={field.name}>Metodología</FieldLabel>
                <Select
                  value={field.state.value}
                  onValueChange={(value) => value && field.handleChange(value)}
                >
                  <SelectTrigger id={field.name}>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {METODOLOGIA_OPTIONS.map((option) => (
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

          <form.Field name="cupo">
            {(field) => (
              <Field variant="outlined">
                <FieldLabel htmlFor={field.name}>Cupo</FieldLabel>
                <Input
                  id={field.name}
                  type="number"
                  min={0}
                  placeholder="Cantidad de cupos"
                  value={Number.isNaN(field.state.value) ? "" : field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.valueAsNumber)}
                />
              </Field>
            )}
          </form.Field>
        </form>

        <DialogFooter>
          <form.Subscribe
            selector={(state) =>
              gradeGroupFormSchema.safeParse(state.values).success
            }
          >
            {(isComplete) =>
              isComplete ? (
                <Button
                  type="submit"
                  color="primary"
                  form={FORM_ID}
                  disabled={isSaving}
                  aria-busy={isSaving}
                >
                  {isSaving && (
                    <SpinnerIcon
                      data-icon="inline-start"
                      className="animate-spin"
                    />
                  )}
                  Guardar
                </Button>
              ) : null
            }
          </form.Subscribe>
          <DialogClose render={<Button type="button" variant="outline" />}>
            Cancelar
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
