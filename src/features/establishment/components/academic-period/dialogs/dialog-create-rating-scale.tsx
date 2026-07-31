import { useMemo, useRef, useState } from "react"
import { useForm } from "@tanstack/react-form"
import {
  CheckIcon,
  PencilIcon,
  PlusCircleIcon,
  SpinnerIcon,
  TrashIcon,
  XIcon,
} from "@/components/ui/icons"
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
import { FieldVariantContext } from "@/hooks/use-field-variant"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { useCreateRatingScale } from "../../../api/mutations/create-rating-scale"
import { useEvaluationCriteriaQuery } from "../../../api/query/use-evaluation-criteria-query"
import { useRatingSymbolsQuery } from "../../../api/query/use-rating-symbols-query"
import { useTeachingLevelsQuery } from "../../../api/query/use-teaching-levels-query"
import { useRatingScaleTypesQuery } from "../../../api/query/use-rating-scale-types-query"
import type { RatingScaleType } from "../../../api/types/academic-period/rating-scales"
import { RatingSymbolSelect, RatingSymbolView } from "../rating-symbol"
import {
  makeRatingScaleGradesSchema,
  parseGradingRange,
  type GradingRange,
} from "../grading-range"
import { TeachingLevelsMultiSelect } from "./teaching-levels-multi-select"

type RatingScaleDraftValues = z.infer<
  ReturnType<typeof makeRatingScaleGradesSchema>
>

function makeEmptyDraft(range: GradingRange): RatingScaleDraftValues {
  return {
    nombre: "",
    abreviacion: "",
    tipo: "",
    iconografia: "",
    notaMaxima: range.max,
    notaMinima: range.min,
    notaEquivalente: range.min,
  }
}

const DRAFT_FORM_ID = "rating-scale-draft-form"

interface CreateRatingScaleDialogProps {
  academicPeriodId?: number
}

export function CreateRatingScaleDialog({
  academicPeriodId,
}: CreateRatingScaleDialogProps) {
  const [open, setOpen] = useState(false)
  const [continued, setContinued] = useState(false)
  const [teachingLevelIds, setTeachingLevelIds] = useState<number[]>([])
  const [drafts, setDrafts] = useState<RatingScaleDraftValues[]>([])
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editRow, setEditRow] = useState<RatingScaleDraftValues | null>(null)

  const { data: levels = [] } = useTeachingLevelsQuery()
  const { data: symbols = [] } = useRatingSymbolsQuery()
  const { data: tipoOptions = [] } = useRatingScaleTypesQuery()
  const { data: criteria } = useEvaluationCriteriaQuery(academicPeriodId)
  const createScale = useCreateRatingScale()

  const range = useMemo(
    () => parseGradingRange(criteria?.gradingFormat),
    [criteria]
  )
  const rangeRef = useRef(range)
  rangeRef.current = range
  const draftSchema = useMemo(
    () => makeRatingScaleGradesSchema(range),
    [range]
  )

  const form = useForm({
    defaultValues: makeEmptyDraft(range),
    validators: {
      onChange: draftSchema,
      onSubmit: draftSchema,
    },
    onSubmit: ({ value, formApi }) => {
      const r = rangeRef.current
      const parsed = makeRatingScaleGradesSchema(r).safeParse(value)
      if (!parsed.success) {
        toast.error(parsed.error.issues[0]?.message ?? "Revisá los datos.")
        return
      }
      setDrafts((prev) => [...prev, parsed.data])
      formApi.reset(makeEmptyDraft(r))
    },
  })

  function reset() {
    setContinued(false)
    setTeachingLevelIds([])
    setDrafts([])
    setEditingIndex(null)
    setEditRow(null)
    form.reset(makeEmptyDraft(rangeRef.current))
  }

  function startEdit(index: number) {
    setEditingIndex(index)
    setEditRow(drafts[index])
  }

  function cancelEdit() {
    setEditingIndex(null)
    setEditRow(null)
  }

  function patchEditRow(patch: Partial<RatingScaleDraftValues>) {
    setEditRow((prev) => (prev ? { ...prev, ...patch } : prev))
  }

  function saveEditRow() {
    if (editingIndex == null || !editRow) return
    const r = rangeRef.current
    const parsed = makeRatingScaleGradesSchema(r).safeParse(editRow)
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Revisá los datos.")
      return
    }
    setDrafts((prev) =>
      prev.map((d, i) => (i === editingIndex ? parsed.data : d))
    )
    cancelEdit()
  }

  function removeDraft(index: number) {
    setDrafts((prev) => prev.filter((_, i) => i !== index))
    if (editingIndex === index) cancelEdit()
  }

  async function handleSave() {
    if (teachingLevelIds.length === 0) {
      toast.error("Seleccioná al menos un nivel de enseñanza.")
      return
    }
    if (drafts.length === 0) {
      toast.error("Agregá al menos una escala a la lista.")
      return
    }
    await Promise.all(
      teachingLevelIds.flatMap((levelId) =>
        drafts.map((d) =>
          createScale.mutateAsync({
            ...d,
            tipo: d.tipo as RatingScaleType,
            codigo: 0,
            teachingLevelIds: [levelId],
            teachingLevels: [],
            academicPeriodId,
          })
        )
      )
    )
    const total = drafts.length * teachingLevelIds.length
    toast.success(`${total} escala(s) guardada(s).`)
    reset()
    setOpen(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) form.reset(makeEmptyDraft(rangeRef.current))
        else reset()
      }}
    >
      <DialogTrigger render={<Button color="primary" size="sm" />}>
        <PlusCircleIcon weight="fill" data-icon="inline-start" />
        Agregar
      </DialogTrigger>
      <DialogContent
        className={
          continued
            ? "max-h-[90dvh] overflow-y-auto sm:max-w-4xl"
            : "sm:max-w-md"
        }
      >
        <DialogHeader>
          <DialogTitle>Agregar escalas de valoración</DialogTitle>
          <DialogDescription>
            Elegí los niveles de enseñanza y agregá una o más escalas a la
            lista.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-w-0 flex-col gap-4">
          <Field variant="outlined">
            <FieldLabel htmlFor="rating-scale-levels">
              Niveles de enseñanza
            </FieldLabel>
            <TeachingLevelsMultiSelect
              id="rating-scale-levels"
              levels={levels}
              value={teachingLevelIds}
              onChange={setTeachingLevelIds}
            />
          </Field>

          {continued && (
            <form
              id={DRAFT_FORM_ID}
              onSubmit={(e) => {
                e.preventDefault()
                form.handleSubmit()
              }}
              className="flex flex-col gap-4"
            >
              <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
                <form.Field name="nombre">
                  {(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid
                    return (
                      <Field variant="outlined" data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>Nombre*</FieldLabel>
                        <Input
                          id={field.name}
                          placeholder="Agregar nombre"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          aria-invalid={isInvalid}
                        />
                        {isInvalid && (
                          <FieldError errors={field.state.meta.errors} />
                        )}
                      </Field>
                    )
                  }}
                </form.Field>

                <form.Field name="tipo">
                  {(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid
                    return (
                      <Field variant="outlined" data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>
                          Tipo de valoración*
                        </FieldLabel>
                        <Select
                          value={field.state.value}
                          onValueChange={(value) => {
                            if (value) field.handleChange(value)
                            field.handleBlur()
                          }}
                        >
                          <SelectTrigger id={field.name} aria-invalid={isInvalid}>
                            <SelectValue placeholder="Agregar valoración" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {tipoOptions.map((tipo) => (
                                <SelectItem key={tipo} value={tipo}>
                                  {tipo}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                        {isInvalid && (
                          <FieldError errors={field.state.meta.errors} />
                        )}
                      </Field>
                    )
                  }}
                </form.Field>
              </div>

              <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
                <form.Field name="abreviacion">
                  {(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid
                    return (
                      <Field variant="outlined" data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>Abreviación*</FieldLabel>
                        <Input
                          id={field.name}
                          placeholder="Agregar abreviación"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          aria-invalid={isInvalid}
                        />
                        {isInvalid && (
                          <FieldError errors={field.state.meta.errors} />
                        )}
                      </Field>
                    )
                  }}
                </form.Field>

                <form.Field name="iconografia">
                  {(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid
                    return (
                      <Field variant="outlined" data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>Iconografía*</FieldLabel>
                        <RatingSymbolSelect
                          id={field.name}
                          symbols={symbols}
                          value={field.state.value}
                          onChange={(valor) => {
                            field.handleChange(valor)
                            field.handleBlur()
                          }}
                        />
                        {isInvalid && (
                          <FieldError errors={field.state.meta.errors} />
                        )}
                      </Field>
                    )
                  }}
                </form.Field>
              </div>

              <div className="grid gap-x-4 gap-y-4 sm:grid-cols-3">
                <form.Field name="notaMaxima">
                  {(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid
                    return (
                      <Field variant="outlined" data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>Nota máximo*</FieldLabel>
                        <Input
                          id={field.name}
                          type="number"
                          step="0.1"
                          min={range.min}
                          max={range.max}
                          placeholder="ej. 5"
                          value={
                            Number.isNaN(field.state.value)
                              ? ""
                              : field.state.value
                          }
                          onBlur={field.handleBlur}
                          onChange={(e) =>
                            field.handleChange(e.target.valueAsNumber)
                          }
                          aria-invalid={isInvalid}
                        />
                        {isInvalid && (
                          <FieldError errors={field.state.meta.errors} />
                        )}
                      </Field>
                    )
                  }}
                </form.Field>
                <form.Field name="notaMinima">
                  {(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid
                    return (
                      <Field variant="outlined" data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>Nota mínimo*</FieldLabel>
                        <Input
                          id={field.name}
                          type="number"
                          step="0.1"
                          min={range.min}
                          max={range.max}
                          placeholder="ej. 1"
                          value={
                            Number.isNaN(field.state.value)
                              ? ""
                              : field.state.value
                          }
                          onBlur={field.handleBlur}
                          onChange={(e) =>
                            field.handleChange(e.target.valueAsNumber)
                          }
                          aria-invalid={isInvalid}
                        />
                        {isInvalid && (
                          <FieldError errors={field.state.meta.errors} />
                        )}
                      </Field>
                    )
                  }}
                </form.Field>
                <form.Field name="notaEquivalente">
                  {(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid
                    return (
                      <Field variant="outlined" data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>
                          Nota equivalente*
                        </FieldLabel>
                        <Input
                          id={field.name}
                          type="number"
                          step="0.1"
                          min={range.min}
                          max={range.max}
                          placeholder="ej. 3"
                          value={
                            Number.isNaN(field.state.value)
                              ? ""
                              : field.state.value
                          }
                          onBlur={field.handleBlur}
                          onChange={(e) =>
                            field.handleChange(e.target.valueAsNumber)
                          }
                          aria-invalid={isInvalid}
                        />
                        {isInvalid && (
                          <FieldError errors={field.state.meta.errors} />
                        )}
                      </Field>
                    )
                  }}
                </form.Field>
              </div>

              <div className="flex justify-end">
                <Button type="submit" variant="outline" size="sm">
                  <PlusCircleIcon data-icon="inline-start" />
                  Agregar a la lista
                </Button>
              </div>
            </form>
          )}

          {drafts.length > 0 && (
            <div className="overflow-x-auto border [&_[data-slot=input]]:bg-background [&_[data-slot=select-trigger]]:bg-background">
              {/* Inputs recuadrados (variante outlined) con fondo sólido, igual
                  que la tabla de edición de escalas del tab. */}
              <FieldVariantContext.Provider value="outlined">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Abreviación</TableHead>
                    <TableHead>Nota máximo</TableHead>
                    <TableHead>Nota mínimo</TableHead>
                    <TableHead>Nota equivalente</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Iconografía</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drafts.map((d, index) => {
                    const isEditing = editingIndex === index

                    if (isEditing && editRow) {
                      return (
                        <TableRow key={index}>
                          <TableCell>
                            <Input
                              aria-label="Nombre"
                              value={editRow.nombre}
                              onChange={(e) =>
                                patchEditRow({ nombre: e.target.value })
                              }
                              className="min-w-32"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              aria-label="Abreviación"
                              value={editRow.abreviacion}
                              onChange={(e) =>
                                patchEditRow({ abreviacion: e.target.value })
                              }
                              className="min-w-24"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              aria-label="Nota máximo"
                              type="number"
                              step="0.1"
                              min={range.min}
                              max={range.max}
                              value={
                                Number.isNaN(editRow.notaMaxima)
                                  ? ""
                                  : editRow.notaMaxima
                              }
                              onChange={(e) =>
                                patchEditRow({
                                  notaMaxima: e.target.valueAsNumber,
                                })
                              }
                              className="w-20"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              aria-label="Nota mínimo"
                              type="number"
                              step="0.1"
                              min={range.min}
                              max={range.max}
                              value={
                                Number.isNaN(editRow.notaMinima)
                                  ? ""
                                  : editRow.notaMinima
                              }
                              onChange={(e) =>
                                patchEditRow({
                                  notaMinima: e.target.valueAsNumber,
                                })
                              }
                              className="w-20"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              aria-label="Nota equivalente"
                              type="number"
                              step="0.1"
                              min={range.min}
                              max={range.max}
                              value={
                                Number.isNaN(editRow.notaEquivalente)
                                  ? ""
                                  : editRow.notaEquivalente
                              }
                              onChange={(e) =>
                                patchEditRow({
                                  notaEquivalente: e.target.valueAsNumber,
                                })
                              }
                              className="w-20"
                            />
                          </TableCell>
                          <TableCell>
                            <Select
                              value={editRow.tipo}
                              onValueChange={(value) =>
                                value && patchEditRow({ tipo: value })
                              }
                            >
                              <SelectTrigger
                                aria-label="Tipo"
                                className="min-w-32"
                              >
                                <SelectValue placeholder="Seleccionar" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectGroup>
                                  {tipoOptions.map((tipo) => (
                                    <SelectItem key={tipo} value={tipo}>
                                      {tipo}
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <RatingSymbolSelect
                              symbols={symbols}
                              value={editRow.iconografia}
                              onChange={(valor) =>
                                patchEditRow({ iconografia: valor })
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                type="button"
                                color="primary"
                                size="icon"
                                className="size-8"
                                aria-label="Guardar cambios"
                                onClick={saveEditRow}
                              >
                                <CheckIcon />
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="size-8"
                                aria-label="Cancelar edición"
                                onClick={cancelEdit}
                              >
                                <XIcon />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    }

                    return (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{d.nombre}</TableCell>
                        <TableCell>{d.abreviacion}</TableCell>
                        <TableCell>{d.notaMaxima}</TableCell>
                        <TableCell>{d.notaMinima}</TableCell>
                        <TableCell>{d.notaEquivalente}</TableCell>
                        <TableCell>{d.tipo}</TableCell>
                        <TableCell className="text-lg">
                          <RatingSymbolView value={d.iconografia} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              variant="fill"
                              color="secondary"
                              size="icon"
                              className="size-8"
                              aria-label={`Editar ${d.nombre}`}
                              disabled={editingIndex !== null}
                              onClick={() => startEdit(index)}
                            >
                              <PencilIcon />
                            </Button>
                            <Button
                              type="button"
                              variant="fill"
                              color="destructive"
                              size="icon"
                              className="size-8"
                              aria-label={`Quitar ${d.nombre}`}
                              disabled={editingIndex !== null}
                              onClick={() => removeDraft(index)}
                            >
                              <TrashIcon />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
              </FieldVariantContext.Provider>
            </div>
          )}
        </div>

        <DialogFooter className="sm:justify-end">
          <DialogClose render={<Button type="button" variant="ghost" />}>
            Cancelar
          </DialogClose>
          {continued ? (
            <Button
              type="button"
              color="primary"
              onClick={handleSave}
              disabled={createScale.isPending || drafts.length === 0}
              aria-busy={createScale.isPending}
            >
              {createScale.isPending && (
                <SpinnerIcon data-icon="inline-start" className="animate-spin" />
              )}
              Guardar
            </Button>
          ) : (
            teachingLevelIds.length > 0 && (
              <Button
                type="button"
                color="primary"
                onClick={() => setContinued(true)}
              >
                Continuar
              </Button>
            )
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
