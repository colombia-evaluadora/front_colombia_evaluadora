import { useMemo, useRef, useState } from "react"
import { useForm } from "@tanstack/react-form"
import { CheckIcon, ControlPointIcon, PencilIcon, SpinnerIcon, XIcon } from "@/components/ui/icons"
import { z } from "zod"

import { ConfirmRemoveButton } from "@/components/confirm-remove-button"
import {
  ACTIONS_CELL_CLASS,
  actionsOverlayClass,
  actionsSpacerCell,
  actionsSpacerHeadCell,
} from "@/components/table-row-actions"
import { useNotify } from "@/components/notice/notice-context"
import { NoticeBanner, type NoticeVariant } from "@/components/notice/notice-banner"
import { getErrorMessage } from "@/lib/api-client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { FieldVariantContext } from "@/hooks/use-field-variant"
import { cn } from "@/lib/utils"
import {
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
  ComboboxGroup,
} from "@/components/ui/combobox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { useCreateRatingScalesBulk } from "@/features/establishment/academic-period/api/mutations/create-rating-scales-bulk"
import { useEvaluationCriteriaQuery } from "@/features/establishment/academic-period/api/query/use-evaluation-criteria"
import { useRatingScalesQuery } from "@/features/establishment/academic-period/api/query/use-rating-scales"
import { useRatingSymbolsQuery } from "@/features/establishment/academic-period/api/query/use-rating-symbols"
import { useTeachingLevelsQuery } from "@/features/establishment/academic-period/api/query/use-teaching-levels"
import { useRatingScaleTypesQuery } from "@/features/establishment/academic-period/api/query/use-rating-scale-types"
import type { RatingScaleType } from "@/features/establishment/academic-period/api/types/rating-scales"
import {
  RatingSymbolSelect,
  RatingSymbolView,
} from "@/features/establishment/academic-period/components/rating-symbol"
import {
  makeRatingScaleGradesSchema,
  parseGradingRange,
  type GradingRange,
} from "@/features/establishment/academic-period/components/grading-range"
import {
  findDuplicateRatingScale,
  findOverlappingRatingScale,
  ratingScaleDuplicateMessage,
  ratingScaleOverlapMessage,
} from "@/features/establishment/academic-period/components/rating-scale-duplicates"
import { TeachingLevelsMultiSelect } from "@/features/establishment/academic-period/components/teaching-levels-multi-select"
import {
  ScaleSortableHeader,
  compareByScaleKey,
  type ScaleSort,
} from "@/features/establishment/academic-period/components/scale-sort-header"
import { useRowEdit } from "@/features/establishment/academic-period/hooks/use-row-edit"

type RatingScaleDraftValues = z.infer<ReturnType<typeof makeRatingScaleGradesSchema>>

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

export function CreateRatingScaleDialog({ academicPeriodId }: CreateRatingScaleDialogProps) {
  const { notify } = useNotify()
  const [open, setOpen] = useState(false)
  const [continued, setContinued] = useState(false)
  const [teachingLevelIds, setTeachingLevelIds] = useState<number[]>([])
  const [drafts, setDrafts] = useState<RatingScaleDraftValues[]>([])
  const [sort, setSort] = useState<ScaleSort>(null)

  // Aviso local, propio del diálogo: mientras sigue abierto, cualquier
  // mensaje de esta pantalla no debe pasar por el `notify()` global —ese
  // queda para el aviso de "Guardar" que se ve en la página una vez que el
  // diálogo se cierra— o el mismo mensaje se veía duplicado (uno acá, otro
  // detrás del overlay).
  const [localNotice, setLocalNotice] = useState<{
    id: number
    message: string
    variant: NoticeVariant
  } | null>(null)
  const localNoticeIdRef = useRef(0)

  function showLocalNotice(message: string, variant: NoticeVariant = "info") {
    localNoticeIdRef.current += 1
    setLocalNotice({ id: localNoticeIdRef.current, message, variant })
  }
  const {
    editingKey: editingIndex,
    draft: editRow,
    startEdit: startRowEdit,
    patchDraft: patchEditRow,
    cancelEdit,
  } = useRowEdit<RatingScaleDraftValues>()

  const { data: levels = [] } = useTeachingLevelsQuery()
  const { data: symbols = [] } = useRatingSymbolsQuery()
  const { data: tipoOptions = [] } = useRatingScaleTypesQuery()
  const { data: criteria } = useEvaluationCriteriaQuery(academicPeriodId)
  const { data: existingScalesData } = useRatingScalesQuery({
    filters: {},
    sorting: [],
    academicPeriodId,
  })
  const createScalesBulk = useCreateRatingScalesBulk()

  const range = useMemo(() => parseGradingRange(criteria?.gradingFormatName), [criteria])
  const rangeRef = useRef(range)
  rangeRef.current = range
  const draftSchema = useMemo(() => makeRatingScaleGradesSchema(range), [range])

  // Escalas ya existentes en alguno de los niveles seleccionados — la
  // restricción de unicidad (Nombre/Abreviación) es por nivel de enseñanza
  // (MantisBT 0000731). `useForm.onSubmit` cierra sobre el render inicial
  // (mismo motivo que `rangeRef`), así que esto también necesita un ref.
  const relevantExistingScales = useMemo(() => {
    const rows = existingScalesData?.rows ?? []
    return rows.filter((s) => s.teachingLevelIds.some((id) => teachingLevelIds.includes(id)))
  }, [existingScalesData, teachingLevelIds])
  const relevantExistingScalesRef = useRef(relevantExistingScales)
  relevantExistingScalesRef.current = relevantExistingScales
  const draftsRef = useRef(drafts)
  draftsRef.current = drafts

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
        showLocalNotice(parsed.error.issues[0]?.message ?? "Revisa los datos.", "error")
        return
      }
      const duplicate = findDuplicateRatingScale(parsed.data, [
        ...relevantExistingScalesRef.current,
        ...draftsRef.current,
      ])
      if (duplicate) {
        const duplicateValue =
          duplicate.field === "nombre" ? parsed.data.nombre : parsed.data.abreviacion
        showLocalNotice(ratingScaleDuplicateMessage(duplicate.field, duplicateValue), "error")
        return
      }
      const overlapping = findOverlappingRatingScale(parsed.data, [
        ...relevantExistingScalesRef.current,
        ...draftsRef.current,
      ])
      if (overlapping) {
        showLocalNotice(ratingScaleOverlapMessage(overlapping), "error")
        return
      }
      setDrafts((prev) => [...prev, parsed.data])
      showLocalNotice("Escala agregada a la lista.", "info")
      formApi.reset(makeEmptyDraft(r))
    },
  })

  function reset() {
    setContinued(false)
    setTeachingLevelIds([])
    setDrafts([])
    cancelEdit()
    form.reset(makeEmptyDraft(rangeRef.current))
    setLocalNotice(null)
  }

  function startEdit(index: number) {
    startRowEdit(index, drafts[index])
  }

  function saveEditRow() {
    if (editingIndex == null || !editRow) return
    const r = rangeRef.current
    const parsed = makeRatingScaleGradesSchema(r).safeParse(editRow)
    if (!parsed.success) {
      showLocalNotice(parsed.error.issues[0]?.message ?? "Revisa los datos.", "error")
      return
    }
    const otherDrafts = drafts.filter((_, i) => i !== editingIndex)
    const duplicate = findDuplicateRatingScale(parsed.data, [
      ...relevantExistingScales,
      ...otherDrafts,
    ])
    if (duplicate) {
      const value = duplicate.field === "nombre" ? parsed.data.nombre : parsed.data.abreviacion
      showLocalNotice(ratingScaleDuplicateMessage(duplicate.field, value), "error")
      return
    }
    const overlapping = findOverlappingRatingScale(parsed.data, [
      ...relevantExistingScales,
      ...otherDrafts,
    ])
    if (overlapping) {
      showLocalNotice(ratingScaleOverlapMessage(overlapping), "error")
      return
    }
    setDrafts((prev) => prev.map((d, i) => (i === editingIndex ? parsed.data : d)))
    cancelEdit()
  }

  function removeDraft(index: number) {
    setDrafts((prev) => prev.filter((_, i) => i !== index))
    if (editingIndex === index) cancelEdit()
  }

  const orderedDrafts = useMemo(() => {
    const withIndex = drafts.map((draft, index) => ({ draft, index }))
    if (!sort) return withIndex
    const { key, dir } = sort
    const copy = [...withIndex].sort((a, b) => compareByScaleKey(a.draft[key], b.draft[key]))
    return dir === "desc" ? copy.reverse() : copy
  }, [drafts, sort])

  async function handleSave() {
    if (teachingLevelIds.length === 0) {
      showLocalNotice("Selecciona al menos un nivel de enseñanza.", "error")
      return
    }
    if (drafts.length === 0) {
      showLocalNotice("Agrega al menos una escala a la lista.", "error")
      return
    }
    try {
      await createScalesBulk.mutateAsync({
        teachingLevelIds,
        scales: drafts.map((d) => ({ ...d, tipo: d.tipo as RatingScaleType })),
        academicPeriodId,
      })
    } catch (error) {
      // El interceptor global también tostea el error; acá además lo
      // mostramos en el banner del diálogo, que no queda detrás del overlay
      // del modal.
      showLocalNotice(getErrorMessage(error), "error")
      return
    }
    const total = drafts.length * teachingLevelIds.length
    notify(
      total === 1
        ? "La escala de valoración se creó correctamente."
        : `Las ${total} escalas de valoración se crearon correctamente.`,
      { variant: "info" },
    )
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
        <ControlPointIcon data-icon="inline-start" />
        Agregar
      </DialogTrigger>
      <DialogContent
        className={
          continued
            ? "flex max-h-[90dvh] flex-col overflow-hidden p-0 sm:max-w-4xl"
            : "sm:max-w-md"
        }
        showCloseButton={false}
      >
        <DialogHeader className={continued ? "shrink-0 px-6 pt-6" : undefined}>
          <DialogTitle>Agregar escalas de valoración</DialogTitle>
        </DialogHeader>

        {/* Único bloque con scroll SOLO en el paso "continued" (la tabla de
            escalas, potencialmente larga), con su propio padding -- el
            `DialogContent` ya no tiene padding propio en ese paso (`p-0`),
            así que el scroll queda al borde REAL del diálogo. El primer
            paso (elegir niveles) es corto y nunca necesitó scroll, sigue
            usando el padding base del `DialogContent`. */}
        <div
          className={cn(
            "flex min-w-0 flex-col gap-4",
            continued && "scrollbar-slim min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-6",
          )}
        >
          <NoticeBanner
            notice={localNotice}
            onClose={() => setLocalNotice(null)}
            variant={localNotice?.variant}
            autoCloseMs={localNotice?.variant === "error" ? undefined : 4000}
          />

          <div className="grid sm:grid-cols-2 gap-x-4 gap-y-4">
            <Field variant="outlined" className={cn(continued ? "" : "sm:col-span-2")}>
              <FieldLabel htmlFor="rating-scale-levels">Niveles de enseñanza</FieldLabel>
              <TeachingLevelsMultiSelect
                id="rating-scale-levels"
                levels={levels}
                value={teachingLevelIds}
                onChange={setTeachingLevelIds}
              />
            </Field>
          </div>

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
                    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                    return (
                      <Field variant="outlined" data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>Nombre*</FieldLabel>
                        <Input
                          id={field.name}
                          maxLength={130}
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

                <form.Field name="tipo">
                  {(field) => {
                    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                    return (
                      <Field variant="outlined" data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>Tipo de valoración*</FieldLabel>
                        <ComboboxField
                          value={field.state.value}
                          onValueChange={(value) => {
                            if (value) field.handleChange(value)
                            field.handleBlur()
                          }}
                        >
                          <ComboboxFieldTrigger id={field.name} aria-invalid={isInvalid}>
                            <ComboboxFieldValue>
                              {(value) =>
                                tipoOptions.find((o) => o.key === value)?.label ?? "Seleccionar"
                              }
                            </ComboboxFieldValue>
                          </ComboboxFieldTrigger>
                          <ComboboxFieldContent>
                            <ComboboxGroup>
                              {tipoOptions.map((option) => (
                                <ComboboxFieldItem key={option.key} value={option.key}>
                                  {option.label}
                                </ComboboxFieldItem>
                              ))}
                            </ComboboxGroup>
                          </ComboboxFieldContent>
                        </ComboboxField>
                        {isInvalid && <FieldError errors={field.state.meta.errors} />}
                      </Field>
                    )
                  }}
                </form.Field>
              </div>

              <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
                <form.Field name="abreviacion">
                  {(field) => {
                    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                    return (
                      <Field variant="outlined" data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>Abreviación*</FieldLabel>
                        <Input
                          id={field.name}
                          maxLength={30}
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

                <form.Field name="iconografia">
                  {(field) => {
                    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
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
                        {isInvalid && <FieldError errors={field.state.meta.errors} />}
                      </Field>
                    )
                  }}
                </form.Field>
              </div>

              <form.Subscribe selector={(state) => draftSchema.safeParse(state.values).success}>
                {(canSubmit) => (
                  // `mb-8`: dentro de este `<div>`, el mensaje de error de
                  // cada nota es `absolute` (no ocupa lugar en el flujo, para
                  // no desalinear las tres notas entre sí cuando solo una lo
                  // muestra — ver los `<FieldError>` de abajo). Sin este
                  // margen, al no haber escalas todavía en la lista (nada
                  // entre este bloque y el `DialogFooter`), el texto flotante
                  // quedaba pisando los botones Guardar/Cancelar.
                  <div className="mb-8 flex flex-col gap-x-4 gap-y-4 sm:flex-row sm:items-end">
                    <form.Field name="notaMaxima">
                      {(field) => {
                        const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                        return (
                          <Field
                            variant="outlined"
                            data-invalid={isInvalid}
                            className="relative flex-1 min-w-0"
                          >
                            <FieldLabel htmlFor={field.name}>Nota máximo*</FieldLabel>
                            <Input
                              id={field.name}
                              type="number"
                              step="0.1"
                              min={range.min}
                              max={range.max}
                              placeholder="Agregar"
                              value={Number.isNaN(field.state.value) ? "" : field.state.value}
                              onBlur={field.handleBlur}
                              onKeyDown={(e) => {
                                if (["-", "+", "e", "E"].includes(e.key)) e.preventDefault()
                              }}
                              onChange={(e) => {
                                const value = e.target.valueAsNumber
                                if (e.target.value !== "" && Number.isNaN(value)) return
                                field.handleChange(value)
                                if (!Number.isFinite(value)) return
                                const { notaMinima, notaEquivalente } = form.state.values
                                const effectiveMin =
                                  Number.isFinite(notaMinima) && notaMinima > value
                                    ? value
                                    : notaMinima
                                if (effectiveMin !== notaMinima) {
                                  form.setFieldValue("notaMinima", effectiveMin)
                                }
                                if (Number.isFinite(notaEquivalente) && notaEquivalente > value) {
                                  form.setFieldValue("notaEquivalente", value)
                                } else if (
                                  Number.isFinite(notaEquivalente) &&
                                  notaEquivalente < effectiveMin
                                ) {
                                  form.setFieldValue("notaEquivalente", effectiveMin)
                                }
                              }}
                              aria-invalid={isInvalid}
                            />
                            {/* `absolute`: las tres notas comparten fila con
                                `items-end` — si el mensaje ocupara su propio
                                espacio en el flujo, el que lo mostrara
                                quedaba más alto que los otros dos y
                                desalineaba los inputs. Flotando debajo no
                                mueve nada. */}
                            {isInvalid && (
                              <FieldError
                                errors={field.state.meta.errors}
                                className="absolute top-full left-0"
                              />
                            )}
                          </Field>
                        )
                      }}
                    </form.Field>
                    <form.Field name="notaMinima">
                      {(field) => {
                        const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                        return (
                          <Field
                            variant="outlined"
                            data-invalid={isInvalid}
                            className="relative flex-1 min-w-0"
                          >
                            <FieldLabel htmlFor={field.name}>Nota mínimo*</FieldLabel>
                            <Input
                              id={field.name}
                              type="number"
                              step="0.1"
                              min={range.min}
                              max={range.max}
                              placeholder="Agregar"
                              value={Number.isNaN(field.state.value) ? "" : field.state.value}
                              onBlur={field.handleBlur}
                              onKeyDown={(e) => {
                                if (["-", "+", "e", "E"].includes(e.key)) e.preventDefault()
                              }}
                              onChange={(e) => {
                                const value = e.target.valueAsNumber
                                if (e.target.value !== "" && Number.isNaN(value)) return
                                field.handleChange(value)
                                if (!Number.isFinite(value)) return
                                // Misma idea que en "Nota máximo": el máximo
                                // sigue al mínimo si ahora queda por debajo, y
                                // la equivalente si queda fuera del nuevo
                                // rango.
                                const { notaMaxima, notaEquivalente } = form.state.values
                                const effectiveMax =
                                  Number.isFinite(notaMaxima) && notaMaxima < value
                                    ? value
                                    : notaMaxima
                                if (effectiveMax !== notaMaxima) {
                                  form.setFieldValue("notaMaxima", effectiveMax)
                                }
                                if (Number.isFinite(notaEquivalente) && notaEquivalente < value) {
                                  form.setFieldValue("notaEquivalente", value)
                                } else if (
                                  Number.isFinite(notaEquivalente) &&
                                  notaEquivalente > effectiveMax
                                ) {
                                  form.setFieldValue("notaEquivalente", effectiveMax)
                                }
                              }}
                              aria-invalid={isInvalid}
                            />
                            {isInvalid && (
                              <FieldError
                                errors={field.state.meta.errors}
                                className="absolute top-full left-0"
                              />
                            )}
                          </Field>
                        )
                      }}
                    </form.Field>
                    <form.Field name="notaEquivalente">
                      {(field) => {
                        const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                        return (
                          <Field
                            variant="outlined"
                            data-invalid={isInvalid}
                            className="relative flex-1 min-w-0"
                          >
                            <FieldLabel htmlFor={field.name}>Nota equivalente*</FieldLabel>
                            <Input
                              id={field.name}
                              type="number"
                              step="0.1"
                              min={range.min}
                              max={range.max}
                              placeholder="Agregar"
                              value={Number.isNaN(field.state.value) ? "" : field.state.value}
                              onKeyDown={(e) => {
                                if (["-", "+", "e", "E"].includes(e.key)) e.preventDefault()
                              }}
                              onBlur={() => {
                                field.handleBlur()
                                // Clamp al salir del campo, no en cada tecla
                                // (si clampeara en cada `onChange`, escribir
                                // un número de dos cifras por debajo del
                                // mínimo de una cifra sería imposible: cada
                                // dígito intermedio quedaría pisado por el
                                // mínimo antes de terminar de tipear).
                                const { notaMinima, notaMaxima } = form.state.values
                                const value = field.state.value
                                if (!Number.isFinite(value)) return
                                if (Number.isFinite(notaMinima) && value < notaMinima) {
                                  field.handleChange(notaMinima)
                                } else if (Number.isFinite(notaMaxima) && value > notaMaxima) {
                                  field.handleChange(notaMaxima)
                                }
                              }}
                              onChange={(e) => {
                                const value = e.target.valueAsNumber
                                if (e.target.value === "" || !Number.isNaN(value)) {
                                  field.handleChange(value)
                                }
                              }}
                              aria-invalid={isInvalid}
                            />
                            {isInvalid && (
                              <FieldError
                                errors={field.state.meta.errors}
                                className="absolute top-full left-0"
                              />
                            )}
                          </Field>
                        )
                      }}
                    </form.Field>

                    {canSubmit && (
                      <Button type="submit" variant="fill" size="sm">
                        <ControlPointIcon data-icon="inline-start" />
                        Agregar
                      </Button>
                    )}
                  </div>
                )}
              </form.Subscribe>
            </form>
          )}

          {drafts.length > 0 && (
            <>
              <div className="[&_[data-slot=input]]:bg-background [&_[data-slot=select-trigger]]:bg-background">
                <FieldVariantContext.Provider value="outlined">
                  <Table>
                    <TableHeader>
                      {/* El encabezado no lleva fondo propio ni hover: comparte
                        el de la tabla en reposo, igual que una fila sin el
                        puntero encima. `has-aria-expanded` cubre el rato en que
                        un menú de orden está abierto. */}
                      <TableRow className="hover:bg-transparent has-aria-expanded:bg-transparent">
                        <TableHead className="text-foreground">
                          <ScaleSortableHeader
                            title="Nombre"
                            sortKey="nombre"
                            sort={sort}
                            onSortChange={setSort}
                          />
                        </TableHead>
                        <TableHead className="text-foreground">
                          <ScaleSortableHeader
                            title="Abreviación"
                            sortKey="abreviacion"
                            sort={sort}
                            onSortChange={setSort}
                          />
                        </TableHead>
                        <TableHead className="text-foreground">
                          <ScaleSortableHeader
                            title="Nota máximo"
                            sortKey="notaMaxima"
                            sort={sort}
                            onSortChange={setSort}
                          />
                        </TableHead>
                        <TableHead className="text-foreground">
                          <ScaleSortableHeader
                            title="Nota mínimo"
                            sortKey="notaMinima"
                            sort={sort}
                            onSortChange={setSort}
                          />
                        </TableHead>
                        <TableHead className="text-foreground">
                          <ScaleSortableHeader
                            title="Nota equivalente"
                            sortKey="notaEquivalente"
                            sort={sort}
                            onSortChange={setSort}
                          />
                        </TableHead>
                        <TableHead className="text-foreground">
                          <ScaleSortableHeader
                            title="Tipo"
                            sortKey="tipo"
                            sort={sort}
                            onSortChange={setSort}
                          />
                        </TableHead>
                        <TableHead className="text-foreground">
                          <ScaleSortableHeader
                            title="Iconografía"
                            sortKey="iconografia"
                            sort={sort}
                            onSortChange={setSort}
                          />
                        </TableHead>
                        {/* Igual que en `DataTable`: la columna de acciones no
                          rotula —el `th` solo reserva el ancho del bloque— y el
                          título queda para lectores de pantalla. */}
                        {actionsSpacerHeadCell}
                        <TableHead className="w-px text-foreground">
                          <span className="sr-only">Acciones</span>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orderedDrafts.map(({ draft: d, index }) => {
                        const isEditing = editingIndex === index

                        if (isEditing && editRow) {
                          return (
                            <TableRow key={index} className="group/row">
                              <TableCell>
                                <Input
                                  aria-label="Nombre"
                                  placeholder="Agregar"
                                  value={editRow.nombre}
                                  onChange={(e) => patchEditRow({ nombre: e.target.value })}
                                  className="min-w-32"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  aria-label="Abreviación"
                                  placeholder="Agregar"
                                  value={editRow.abreviacion}
                                  onChange={(e) => patchEditRow({ abreviacion: e.target.value })}
                                  className="min-w-24"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  aria-label="Nota máximo"
                                  placeholder="Agregar"
                                  type="number"
                                  step="0.1"
                                  min={range.min}
                                  max={range.max}
                                  value={Number.isNaN(editRow.notaMaxima) ? "" : editRow.notaMaxima}
                                  onKeyDown={(e) => {
                                    if (["-", "+", "e", "E"].includes(e.key)) e.preventDefault()
                                  }}
                                  onChange={(e) => {
                                    const value = e.target.valueAsNumber
                                    if (e.target.value !== "" && Number.isNaN(value)) return
                                    // La equivalente sigue al máximo/mínimo
                                    // cuando queda fuera de rango — mismo
                                    // criterio que en la fila de alta.
                                    const equivalente = editRow.notaEquivalente
                                    patchEditRow({
                                      notaMaxima: value,
                                      ...(Number.isFinite(value) &&
                                      Number.isFinite(equivalente) &&
                                      equivalente > value
                                        ? { notaEquivalente: value }
                                        : null),
                                    })
                                  }}
                                  className="w-20"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  aria-label="Nota mínimo"
                                  placeholder="Agregar"
                                  type="number"
                                  step="0.1"
                                  min={range.min}
                                  max={range.max}
                                  value={Number.isNaN(editRow.notaMinima) ? "" : editRow.notaMinima}
                                  onKeyDown={(e) => {
                                    if (["-", "+", "e", "E"].includes(e.key)) e.preventDefault()
                                  }}
                                  onChange={(e) => {
                                    const value = e.target.valueAsNumber
                                    if (e.target.value !== "" && Number.isNaN(value)) return
                                    const equivalente = editRow.notaEquivalente
                                    patchEditRow({
                                      notaMinima: value,
                                      ...(Number.isFinite(value) &&
                                      Number.isFinite(equivalente) &&
                                      equivalente < value
                                        ? { notaEquivalente: value }
                                        : null),
                                    })
                                  }}
                                  className="w-20"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  aria-label="Nota equivalente"
                                  placeholder="Agregar"
                                  type="number"
                                  step="0.1"
                                  min={range.min}
                                  max={range.max}
                                  value={
                                    Number.isNaN(editRow.notaEquivalente)
                                      ? ""
                                      : editRow.notaEquivalente
                                  }
                                  onKeyDown={(e) => {
                                    if (["-", "+", "e", "E"].includes(e.key)) e.preventDefault()
                                  }}
                                  onChange={(e) => {
                                    const value = e.target.valueAsNumber
                                    if (e.target.value === "" || !Number.isNaN(value)) {
                                      patchEditRow({ notaEquivalente: value })
                                    }
                                  }}
                                  className="w-20"
                                />
                              </TableCell>
                              <TableCell>
                                <ComboboxField
                                  value={editRow.tipo}
                                  onValueChange={(value) => value && patchEditRow({ tipo: value })}
                                >
                                  <ComboboxFieldTrigger aria-label="Tipo" className="min-w-32">
                                    <ComboboxFieldValue>
                                      {(value) =>
                                        tipoOptions.find((o) => o.key === value)?.label ??
                                        "Seleccionar"
                                      }
                                    </ComboboxFieldValue>
                                  </ComboboxFieldTrigger>
                                  <ComboboxFieldContent>
                                    <ComboboxGroup>
                                      {tipoOptions.map((option) => (
                                        <ComboboxFieldItem key={option.key} value={option.key}>
                                          {option.label}
                                        </ComboboxFieldItem>
                                      ))}
                                    </ComboboxGroup>
                                  </ComboboxFieldContent>
                                </ComboboxField>
                              </TableCell>
                              <TableCell>
                                <RatingSymbolSelect
                                  symbols={symbols}
                                  value={editRow.iconografia}
                                  onChange={(valor) => patchEditRow({ iconografia: valor })}
                                />
                              </TableCell>
                              {actionsSpacerCell}
                              <TableCell className={ACTIONS_CELL_CLASS}>
                                {/* `true`: la fila en edición mantiene el bloque
                                  fijo, no sujeto al hover. */}
                                <div className={actionsOverlayClass(true)}>
                                  <Button
                                    type="button"
                                    color="primary"
                                    size="icon-sm"
                                    aria-label="Guardar cambios"
                                    onClick={saveEditRow}
                                  >
                                    <CheckIcon />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon-sm"
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
                          <TableRow key={index} className="group/row">
                            <TableCell className="font-medium">{d.nombre}</TableCell>
                            <TableCell>{d.abreviacion}</TableCell>
                            <TableCell>{d.notaMaxima}</TableCell>
                            <TableCell>{d.notaMinima}</TableCell>
                            <TableCell>{d.notaEquivalente}</TableCell>
                            <TableCell>
                              {tipoOptions.find((o) => o.key === d.tipo)?.label ?? d.tipo}
                            </TableCell>
                            <TableCell className="text-lg">
                              <RatingSymbolView value={d.iconografia} />
                            </TableCell>
                            {actionsSpacerCell}
                            <TableCell className={ACTIONS_CELL_CLASS}>
                              <div className={actionsOverlayClass()}>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  color="neutral"
                                  size="icon-sm"
                                  aria-label={`Editar ${d.nombre}`}
                                  disabled={editingIndex !== null}
                                  onClick={() => startEdit(index)}
                                >
                                  <PencilIcon />
                                </Button>
                                <ConfirmRemoveButton
                                  label={`Quitar ${d.nombre}`}
                                  description={`Se quitará la escala «${d.nombre}». Esta acción no se puede deshacer.`}
                                  disabled={editingIndex !== null}
                                  onConfirm={() => removeDraft(index)}
                                />
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </FieldVariantContext.Provider>
              </div>
            </>
          )}
        </div>

        <DialogFooter className={cn("sm:justify-end", continued && "shrink-0 px-6 pb-6")}>
          {continued ? (
            <Button
              size="sm"
              type="button"
              color="primary"
              onClick={handleSave}
              disabled={createScalesBulk.isPending || drafts.length === 0}
              aria-busy={createScalesBulk.isPending}
            >
              {createScalesBulk.isPending ? (
                <SpinnerIcon data-icon="inline-start" className="animate-spin" />
              ) : (
                <CheckIcon data-icon="inline-start" />
              )}
              Guardar
            </Button>
          ) : (
            teachingLevelIds.length > 0 && (
              <Button size="sm" type="button" color="primary" onClick={() => setContinued(true)}>
                <CheckIcon data-icon="inline-start" />
                Continuar
              </Button>
            )
          )}
          <DialogClose render={<Button size="sm" type="button" variant="fill" color="neutral" />}>
            <XIcon data-icon="inline-start" />
            Cancelar
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
