import { useMemo, useState } from "react"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import { useForm } from "@tanstack/react-form"
import { ControlPointIcon, PencilIcon, SpinnerIcon } from "@/components/ui/icons"

import { useNotify, NoticeOutlet } from "@/components/notice/notice-context"

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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { useEmployeesQuery } from "@/features/establishment/api/query/use-employees-query"

import { useCreateGradeGroup } from "../../../api/mutations/grades/create-grade-group"
import { useUpdateGradeGroup } from "../../../api/mutations/grades/update-grade-group"
import { useMetodologiasQuery } from "../../../api/query/use-metodologias-query"
import { useAcademicPeriodQuery } from "../../../api/query/academic-period/use-academic-period-query"
import { useJornadasQuery } from "../../../api/query/use-jornadas-query"
import type { GradeGroup } from "../../../api/types/grade-group"
import { gradeGroupFormSchema, type GradeGroupFormValues } from "../../../api/schema"

const EMPTY: GradeGroupFormValues = {
  codigo: "",
  director: "",
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
  const { notify } = useNotify()

  const { data: academicPeriod } = useAcademicPeriodQuery(academicPeriodId)
  const { data: metodologiaOptions = [] } = useMetodologiasQuery()
  const { data: jornadas = [] } = useJornadasQuery()
  const jornadaName =
    jornadas.find((j) => j.id === academicPeriod?.config.jornadaId)?.name ??
    gradeGroup?.jornada ??
    ""

  const { data: employeesData } = useEmployeesQuery({
    filters: { campusId: academicPeriod?.sedeId },
    sorting: [],
    pageIndex: 0,
    pageSize: 1000,
  })
  const teacherNames = useMemo(
    () => (employeesData?.rows ?? []).map((e) => e.name),
    [employeesData],
  )

  const defaultValues: GradeGroupFormValues = gradeGroup
    ? {
        codigo: gradeGroup.codigo,
        director: gradeGroup.director,
        metodologia: gradeGroup.metodologia ?? "",
        cupo: gradeGroup.cupo ?? 0,
      }
    : EMPTY

  const createGradeGroup = useCreateGradeGroup({
    mutationConfig: {
      onSuccess: () => {
        notify(SUCCESS_MESSAGES.gradeGroup.created)
        form.reset()
        setOpen(false)
      },
    },
  })

  const updateGradeGroup = useUpdateGradeGroup({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          notify(result.message, { variant: "error" })
          return
        }
        notify(SUCCESS_MESSAGES.gradeGroup.updated)
        setOpen(false)
      },
    },
  })

  const isSaving = createGradeGroup.isPending || updateGradeGroup.isPending

  const form = useForm({
    defaultValues,
    validators: { onSubmit: gradeGroupFormSchema },
    onSubmit: ({ value }) => {
      const values = { ...gradeGroupFormSchema.parse(value), jornada: jornadaName }
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
            <Button variant="ghost" color="neutral" size="icon-sm" />
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
            <ControlPointIcon data-icon="inline-start" />
            Agregar
          </>
        )}
      </DialogTrigger>
      <DialogPortal>
        <DialogOverlay forceRender className="bg-transparent" />
      </DialogPortal>
      <DialogContent className="sm:max-w-3xl" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar grupo" : "Agregar grupo"}</DialogTitle>
          <DialogDescription>Completa los datos del grupo.</DialogDescription>
        </DialogHeader>

        <NoticeOutlet />

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
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
              return (
                <Field variant="outlined" data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Grupo</FieldLabel>
                  <Input
                    id={field.name}
                    placeholder="Agregar"
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

          <Field variant="outlined">
            <FieldLabel htmlFor="grade-group-jornada">Jornada</FieldLabel>
            <Input
              id="grade-group-jornada"
              readOnly
              disabled
              placeholder="Definida en el periodo académico"
              value={jornadaName}
            />
          </Field>

          <form.Field name="director">
            {(field) => (
              <Field variant="outlined">
                <FieldLabel htmlFor={field.name}>Director de grupo</FieldLabel>
                <Select
                  value={field.state.value}
                  onValueChange={(value) => value && field.handleChange(value as string)}
                >
                  <SelectTrigger id={field.name}>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {teacherNames.map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            )}
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
                      {metodologiaOptions.map((option) => (
                        <SelectItem key={option.key} value={option.key}>
                          {option.label}
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
                  placeholder="Agregar"
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
            selector={(state) => gradeGroupFormSchema.safeParse(state.values).success}
          >
            {(isComplete) =>
              isComplete ? (
                <Button
                  size="sm"
                  type="submit"
                  color="primary"
                  form={FORM_ID}
                  disabled={isSaving}
                  aria-busy={isSaving}
                >
                  {isSaving && <SpinnerIcon data-icon="inline-start" className="animate-spin" />}
                  Guardar
                </Button>
              ) : null
            }
          </form.Subscribe>
          <DialogClose render={<Button size="sm" type="button" variant="outline" />}>
            Cancelar
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
