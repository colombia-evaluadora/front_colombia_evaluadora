import { useForm } from "@tanstack/react-form"

import { Input } from "@/components/ui/input"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import {
  EDUCATION_LEVELS,
  SHIFTS,
  createReservationFormSchema,
  type CreateReservationFormInput,
  type CreateReservationFormValues,
} from "../../api/schema"
import { EDUCATION_LEVEL_LABELS, SHIFT_LABELS, formatGrade } from "../../api/ui-mappings"
import type { EducationLevel, ReservationCatalogs, Shift } from "../../api/types/reservation"

interface CreateReservationFormProps {
  id: string
  onSubmit: (values: CreateReservationFormValues) => void
  catalogs?: ReservationCatalogs
}

const EMPTY = {
  documentNumber: "",
  firstName: "",
  lastName: "",
  institution: "",
  campus: "",
  grade: "",
  group: "",
  // El schema exige un enum; el placeholder del Select cubre el estado vacío
  // y el submit falla con "Requerido." si el usuario no elige. `""` no es
  // un `Shift` válido, pero el schema lo rechaza en `onSubmit` antes de que
  // llegue al backend — usar el cast explícito es la forma honesta de decir
  // "no tengo valor pero sé que el schema me obliga a poner uno".
  shift: "" as Shift,
  educationLevel: "" as EducationLevel,
} as CreateReservationFormInput

export function CreateReservationForm({ id, onSubmit, catalogs }: CreateReservationFormProps) {
  const form = useForm({
    defaultValues: EMPTY,
    validators: {
      onSubmit: createReservationFormSchema,
    },
    onSubmit: ({ value }) => onSubmit(value),
  })

  return (
    <form
      id={id}
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
      className="flex flex-1 flex-col overflow-y-auto px-4"
    >
      <FieldGroup>
        <form.Field
          name="documentNumber"
          children={(field) => {
            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <Field variant="outlined" data-invalid={isInvalid ? "true" : undefined} className="gap-2">
                <FieldLabel htmlFor={field.name}>N° Identificación</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  type="text"
                  size="sm"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="Agregar"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  aria-invalid={isInvalid}
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            )
          }}
        />

        <form.Field
          name="firstName"
          children={(field) => {
            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <Field variant="outlined" data-invalid={isInvalid ? "true" : undefined} className="gap-2">
                <FieldLabel htmlFor={field.name}>Nombres</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  type="text"
                  size="sm"
                  autoComplete="off"
                  placeholder="Agregar"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  aria-invalid={isInvalid}
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            )
          }}
        />

        <form.Field
          name="lastName"
          children={(field) => {
            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <Field variant="outlined" data-invalid={isInvalid ? "true" : undefined} className="gap-2">
                <FieldLabel htmlFor={field.name}>Apellidos</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  type="text"
                  size="sm"
                  autoComplete="off"
                  placeholder="Agregar"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  aria-invalid={isInvalid}
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            )
          }}
        />

        <form.Field
          name="institution"
          children={(field) => {
            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <Field variant="outlined" data-invalid={isInvalid ? "true" : undefined} className="gap-2">
                <FieldLabel htmlFor={field.name}>Institución educativa</FieldLabel>
                <Select
                  value={field.state.value}
                  onValueChange={(value) => field.handleChange(value ?? "")}
                >
                  <SelectTrigger id={field.name} size="sm" className="w-full" aria-invalid={isInvalid}>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {catalogs?.institutions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            )
          }}
        />

        <form.Field
          name="campus"
          children={(field) => {
            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <Field variant="outlined" data-invalid={isInvalid ? "true" : undefined} className="gap-2">
                <FieldLabel htmlFor={field.name}>Sede</FieldLabel>
                <Select
                  value={field.state.value}
                  onValueChange={(value) => field.handleChange(value ?? "")}
                >
                  <SelectTrigger id={field.name} size="sm" className="w-full" aria-invalid={isInvalid}>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {catalogs?.campuses.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            )
          }}
        />

        <div className="grid grid-cols-2 gap-3">
          <form.Field
            name="grade"
            children={(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
              const gradeItems = Object.fromEntries(
                (catalogs?.grades ?? []).map((g) => [String(g), formatGrade(g)]),
              )
              return (
                <Field variant="outlined" data-invalid={isInvalid ? "true" : undefined} className="gap-2">
                  <FieldLabel htmlFor={field.name}>Grado</FieldLabel>
                  <Select
                    items={gradeItems}
                    value={field.state.value}
                    onValueChange={(value) => field.handleChange(value ?? "")}
                  >
                    <SelectTrigger id={field.name} size="sm" className="w-full" aria-invalid={isInvalid}>
                      <SelectValue placeholder="Grado" />
                    </SelectTrigger>
                    <SelectContent>
                      {catalogs?.grades.map((option) => (
                        <SelectItem key={option} value={String(option)}>
                          {formatGrade(option)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              )
            }}
          />

          <form.Field
            name="group"
            children={(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
              return (
                <Field variant="outlined" data-invalid={isInvalid ? "true" : undefined} className="gap-2">
                  <FieldLabel htmlFor={field.name}>Grupo</FieldLabel>
                  <Select
                    value={field.state.value}
                    onValueChange={(value) => field.handleChange(value ?? "")}
                  >
                    <SelectTrigger id={field.name} size="sm" className="w-full" aria-invalid={isInvalid}>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {catalogs?.groups.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              )
            }}
          />
        </div>

        <form.Field
          name="shift"
          children={(field) => {
            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <Field variant="outlined" data-invalid={isInvalid ? "true" : undefined} className="gap-2">
                <FieldLabel htmlFor={field.name}>Jornada</FieldLabel>
                <Select
                  items={SHIFT_LABELS as Record<string, string>}
                  value={field.state.value}
                  onValueChange={(value) => field.handleChange(value as Shift)}
                >
                  <SelectTrigger id={field.name} size="sm" className="w-full" aria-invalid={isInvalid}>
                    <SelectValue placeholder="Elige una jornada" />
                  </SelectTrigger>
                  <SelectContent>
                    {SHIFTS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {SHIFT_LABELS[option]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            )
          }}
        />

        {/* El nivel educativo lo recalcula el backend a partir del grado
            (transición → preescolar, 1-5 → primaria, …). Acá se elige para
            que el formulario deje constancia, pero manda el grado. */}
        <form.Field
          name="educationLevel"
          children={(field) => {
            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <Field variant="outlined" data-invalid={isInvalid ? "true" : undefined} className="gap-2">
                <FieldLabel htmlFor={field.name}>Nivel educativo</FieldLabel>
                <Select
                  items={EDUCATION_LEVEL_LABELS as Record<string, string>}
                  value={field.state.value}
                  onValueChange={(value) => field.handleChange(value as EducationLevel)}
                >
                  <SelectTrigger id={field.name} size="sm" className="w-full" aria-invalid={isInvalid}>
                    <SelectValue placeholder="Elige un nivel" />
                  </SelectTrigger>
                  <SelectContent>
                    {EDUCATION_LEVELS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {EDUCATION_LEVEL_LABELS[option]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            )
          }}
        />
      </FieldGroup>
    </form>
  )
}
