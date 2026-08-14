import { useMemo, useRef, useState } from "react"
import { useForm } from "@tanstack/react-form"
import {
  CheckIcon,
  ControlPointIcon,
  PencilIcon,
  SpinnerIcon,
  XIcon,
} from "@/components/ui/icons"
import { z } from "zod"

import { ConfirmRemoveButton } from "@/components/confirm-remove-button"
import { useNotify, NoticeOutlet } from "@/components/notice/notice-context"

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
import { cn } from "@/lib/utils"
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

import { useCreateRatingScalesBulk } from "@/features/establishment/academic-period/api/mutations/create-rating-scales-bulk"
import { useEvaluationCriteriaQuery } from "@/features/establishment/academic-period/api/query/use-evaluation-criteria"
import { useRatingSymbolsQuery } from "@/features/establishment/academic-period/api/query/use-rating-symbols"
import { useTeachingLevelsQuery } from "@/features/establishment/academic-period/api/query/use-teaching-levels"
import { useRatingScaleTypesQuery } from "@/features/establishment/academic-period/api/query/use-rating-scale-types"
import type { RatingScaleType } from "@/features/establishment/academic-period/api/types/rating-scales"
import { RatingSymbolSelect, RatingSymbolView } from "@/features/establishment/academic-period/components/rating-symbol"
import { makeRatingScaleGradesSchema, parseGradingRange, type GradingRange } from "@/features/establishment/academic-period/components/grading-range"
import { TeachingLevelsMultiSelect } from "@/features/establishment/academic-period/components/teaching-levels-multi-select"
import { ScaleSortableHeader, compareByScaleKey, type ScaleSort } from "@/features/establishment/academic-period/components/scale-sort-header"
import { useRowEdit } from "@/features/establishment/academic-period/hooks/use-row-edit"

/*
 * Réplica de la mecánica de la columna `actions` de `DataTable`: esta tabla se
 * arma a mano (ordena con estado local, no con TanStack), así que no puede
 * reutilizar el componente y las clases se repiten acá.
 *
 * La celda de acciones es `sticky` y de 1px —los botones son absolutos, su
 * min-content es 0— y el `spacer` que va justo antes es quien le reserva el
 * ancho en el flujo, para que la columna no se lleve una tajada del reparto.
 */
const ACTIONS_CELL_CLASS = "sticky right-0 z-10 w-px"
const ACTIONS_SPACER_WIDTH = 96

const actionsSpacerCell = (
  <td aria-hidden className="p-0">
    <div style={{ width: ACTIONS_SPACER_WIDTH }} />
  </td>
)

const actionsSpacerHeadCell = (
  <th aria-hidden className="p-0">
    <div style={{ width: ACTIONS_SPACER_WIDTH }} />
  </th>
)

/*
 * El bloque va a sangre contra el borde derecho, con el alto completo de la
 * fila, y aparece con el mismo fade que el hover (150ms, el default de
 * Tailwind) para que entren juntos.
 *
 * El fondo es el mismo color del hover de `TableRow` (`bg-muted/50`) pero ya
 * resuelto: acá hace falta opaco, porque el bloque tapa las columnas que pasan
 * por debajo al scrollear. Se mezcla contra `--popover` y no contra `--card`
 * como en `DataTable`: esta tabla vive dentro de un Dialog, que es `bg-popover`
 * —en el tema rojo los dos tokens no coinciden—.
 *
 * `active` deja el bloque fijo: mientras se edita una fila, guardar y cancelar
 * no pueden depender de que el puntero siga encima.
 *
 * El revelado por teclado va con `has(:focus-visible)` y no con `focus-within`:
 * al hacer click el botón queda enfocado, y como React reusa ese nodo del DOM
 * al cambiar la fila entre modo lectura y edición, el foco sobrevive al cambio
 * y `focus-within` dejaba el bloque pegado hasta hacer click en otro lado.
 * `:focus-visible` solo lo activa el foco por teclado, que es a quien apunta la
 * regla.
 */
const actionsOverlayClass = (active = false) =>
  cn(
    "absolute inset-y-0 right-0 z-10 flex items-center gap-1 px-2 transition-opacity",
    "bg-[color-mix(in_srgb,var(--muted)_50%,var(--popover))]",
    active
      ? "opacity-100"
      : "opacity-0 group-hover/row:opacity-100 group-has-[:focus-visible]/row:opacity-100",
  )

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
  const createScalesBulk = useCreateRatingScalesBulk()

  const range = useMemo(() => parseGradingRange(criteria?.gradingFormat), [criteria])
  const rangeRef = useRef(range)
  rangeRef.current = range
  const draftSchema = useMemo(() => makeRatingScaleGradesSchema(range), [range])

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
        notify(parsed.error.issues[0]?.message ?? "Revisa los datos.", {
          variant: "error",
        })
        return
      }
      setDrafts((prev) => [...prev, parsed.data])
      notify("Escala agregada a la lista.", { variant: "info" })
      formApi.reset(makeEmptyDraft(r))
    },
  })

  function reset() {
    setContinued(false)
    setTeachingLevelIds([])
    setDrafts([])
    cancelEdit()
    form.reset(makeEmptyDraft(rangeRef.current))
  }

  function startEdit(index: number) {
    startRowEdit(index, drafts[index])
  }

  function saveEditRow() {
    if (editingIndex == null || !editRow) return
    const r = rangeRef.current
    const parsed = makeRatingScaleGradesSchema(r).safeParse(editRow)
    if (!parsed.success) {
      notify(parsed.error.issues[0]?.message ?? "Revisa los datos.", {
        variant: "error",
      })
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
      notify("Selecciona al menos un nivel de enseñanza.", { variant: "error" })
      return
    }
    if (drafts.length === 0) {
      notify("Agrega al menos una escala a la lista.", { variant: "error" })
      return
    }
    await createScalesBulk.mutateAsync({
      teachingLevelIds,
      scales: drafts.map((d) => ({ ...d, tipo: d.tipo as RatingScaleType })),
      academicPeriodId,
    })
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
        className={continued ? "max-h-[90dvh] overflow-y-auto sm:max-w-4xl" : "sm:max-w-md"}
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle>Agregar escalas de valoración</DialogTitle>
        </DialogHeader>

        <div className="flex min-w-0 flex-col gap-4">
          <div className="grid sm:grid-cols-2 gap-x-4 gap-y-4">
          <Field
            variant="outlined"
            className={cn(continued ? "" : "sm:col-span-2")}
          >
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
                        <Select
                          value={field.state.value}
                          onValueChange={(value) => {
                            if (value) field.handleChange(value)
                            field.handleBlur()
                          }}
                        >
                          <SelectTrigger id={field.name} aria-invalid={isInvalid}>
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {tipoOptions.map((option) => (
                                <SelectItem key={option.key} value={option.key}>
                                  {option.label}
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
                  <div className="flex flex-col gap-x-4 gap-y-4 sm:flex-row sm:items-end">
                    <form.Field name="notaMaxima">
                      {(field) => {
                        const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                        return (
                          <Field variant="outlined" data-invalid={isInvalid} className="flex-1 min-w-0">
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
                              onChange={(e) => field.handleChange(e.target.valueAsNumber)}
                              aria-invalid={isInvalid}
                            />
                            {isInvalid && <FieldError errors={field.state.meta.errors} />}
                          </Field>
                        )
                      }}
                    </form.Field>
                    <form.Field name="notaMinima">
                      {(field) => {
                        const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                        return (
                          <Field variant="outlined" data-invalid={isInvalid} className="flex-1 min-w-0">
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
                              onChange={(e) => field.handleChange(e.target.valueAsNumber)}
                              aria-invalid={isInvalid}
                            />
                            {isInvalid && <FieldError errors={field.state.meta.errors} />}
                          </Field>
                        )
                      }}
                    </form.Field>
                    <form.Field name="notaEquivalente">
                      {(field) => {
                        const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                        return (
                          <Field variant="outlined" data-invalid={isInvalid} className="flex-1 min-w-0">
                            <FieldLabel htmlFor={field.name}>Nota equivalente*</FieldLabel>
                            <Input
                              id={field.name}
                              type="number"
                              step="0.1"
                              min={range.min}
                              max={range.max}
                              placeholder="Agregar"
                              value={Number.isNaN(field.state.value) ? "" : field.state.value}
                              onBlur={field.handleBlur}
                              onChange={(e) => field.handleChange(e.target.valueAsNumber)}
                              aria-invalid={isInvalid}
                            />
                            {isInvalid && <FieldError errors={field.state.meta.errors} />}
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
              {/* Outlet local: muestra el aviso de "Escala agregada a la
                  lista." mientras el diálogo sigue abierto. El aviso de
                  Guardar se ve en el `<NoticeOutlet />` de la página, que
                  queda arriba de la tabla de valoración una vez que el
                  diálogo se cierra. */}
              <NoticeOutlet />
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
                                placeholder="Agregar"
                                type="number"
                                step="0.1"
                                min={range.min}
                                max={range.max}
                                value={Number.isNaN(editRow.notaMinima) ? "" : editRow.notaMinima}
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
                                onValueChange={(value) => value && patchEditRow({ tipo: value })}
                              >
                                <SelectTrigger aria-label="Tipo" className="min-w-32">
                                  <SelectValue placeholder="Seleccionar" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectGroup>
                                    {tipoOptions.map((option) => (
                                      <SelectItem key={option.key} value={option.key}>
                                        {option.label}
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
                          <TableCell>{d.tipo}</TableCell>
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

        <DialogFooter className="sm:justify-end">
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
