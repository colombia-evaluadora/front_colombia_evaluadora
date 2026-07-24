import { useState } from "react"
import { useForm } from "@tanstack/react-form"
import { PlusCircleIcon, SpinnerIcon } from "@phosphor-icons/react"
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
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
import { JORNADA_OPTIONS } from "../../../api/ui-mappings"

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

export function CreateGradeGroupDialog() {
  const [open, setOpen] = useState(false)

  const createGradeGroup = useCreateGradeGroup({
    mutationConfig: {
      onSuccess: () => {
        toast.success("Grupo creado.")
        form.reset()
        setOpen(false)
      },
    },
  })

  const form = useForm({
    defaultValues: EMPTY,
    validators: { onSubmit: gradeGroupFormSchema },
    onSubmit: ({ value }) => {
      createGradeGroup.mutate(gradeGroupFormSchema.parse(value))
    },
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button color="primary" size="sm" />}>
        <PlusCircleIcon weight="fill" data-icon="inline-start" />
        Agregar
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Agregar grupo</DialogTitle>
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
                <Field data-invalid={isInvalid}>
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
                <Field data-invalid={isInvalid}>
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
              <Field>
                <FieldLabel htmlFor={field.name}>Director de grupo</FieldLabel>
                <Input
                  id={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </Field>
            )}
          </form.Field>

          <form.Field name="planEstudio">
            {(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Plan de estudio</FieldLabel>
                  <Input
                    id={field.name}
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
              <Field>
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
              <Field>
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
          {/* Guardar solo aparece cuando el formulario tiene todos los datos. */}
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
                  disabled={createGradeGroup.isPending}
                  aria-busy={createGradeGroup.isPending}
                >
                  {createGradeGroup.isPending && (
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
