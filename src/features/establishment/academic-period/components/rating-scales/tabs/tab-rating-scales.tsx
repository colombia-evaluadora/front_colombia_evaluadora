"use no memo"

import { useCallback, useMemo, useState } from "react"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import type { SortingState } from "@tanstack/react-table"
import { CheckIcon, PencilIcon, PlusIcon, SpinnerIcon, XIcon } from "@/components/ui/icons"

import { useNotify, NoticeOutlet } from "@/components/notice/notice-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { ExpandableDataTable } from "../../common/expandable-data-table"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useDataTable } from "@/hooks/use-data-table"

import { useRatingScalesQuery } from "../../../api/query/rating-scales/use-rating-scales-query"
import { useRatingSymbolsQuery } from "../../../api/query/rating-scales/use-rating-symbols-query"
import { useRatingScaleTypesQuery } from "../../../api/query/rating-scales/use-rating-scale-types-query"
import { useEvaluationCriteriaQuery } from "../../../api/query/evaluation-criteria/use-evaluation-criteria-query"
import { useUpdateRatingScale } from "../../../api/mutations/rating-scales/update-rating-scale"
import { useCreateRatingScalesBulk } from "../../../api/mutations/rating-scales/create-rating-scales-bulk"
import { RATING_SCALE_TYPE_BADGE } from "../../../api/ui-mappings"
import type {
  RatingScale,
  RatingScaleType,
  TeachingLevel,
} from "../../../api/types/rating-scales"
import { CreateRatingScaleDialog } from "../dialogs/dialog-create-rating-scale"
import { DeleteRatingScaleDialog } from "../dialogs/dialog-delete-rating-scale"
import { DeleteSelectedRatingScalesDialog } from "../dialogs/dialog-delete-selected-rating-scales"
import { ExportRatingScalesDialog } from "../dialogs/dialog-export-rating-scales"
import { ExportSelectedRatingScalesDialog } from "../dialogs/dialog-export-selected-rating-scales"
import { RatingSymbolSelect, RatingSymbolView } from "../rating-symbol"
import { createRatingScaleLevelColumns } from "../table/columns-rating-scales"
import {
  ScaleSortableHeader,
  sortByScaleKey,
  type ScaleSort,
} from "../table/scale-sort-header"
import {
  makeRatingScaleGradesSchema,
  parseGradingRange,
  type GradingRange,
} from "../grading-range"
import { useRowEdit } from "../../../hooks/use-row-edit"

interface TabRatingScalesProps {
  academicPeriodId?: number
}

export function TabRatingScales({ academicPeriodId }: TabRatingScalesProps) {
  const {
    data,
    isPending: scalesPending,
    isError,
    refetch,
  } = useRatingScalesQuery({
    filters: {},
    sorting: [],
    pageIndex: 0,
    pageSize: 100,
    academicPeriodId,
  })

  const { data: criteria } = useEvaluationCriteriaQuery(academicPeriodId)
  const range = useMemo(
    () => parseGradingRange(criteria?.gradingFormat),
    [criteria]
  )

  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [sorting, setSorting] = useState<SortingState>([])

  const scales = data?.rows ?? []

  // La tabla se arma a partir de las escalas existentes: un nivel aparece
  // recién cuando se le agrega al menos una escala. Si no hay escalas, no
  // hay filas (la tabla arranca vacía).
  const levels = useMemo(() => {
    const map = new Map<number, TeachingLevel>()
    for (const scale of scales) {
      for (const lvl of scale.teachingLevels) {
        map.set(lvl.id, lvl)
      }
    }
    return Array.from(map.values())
  }, [scales])

  const sortedLevels = useMemo(() => {
    if (!sorting.length) return levels
    const [{ id, desc }] = sorting
    const copy = [...levels].sort((a, b) =>
      String(a[id as keyof TeachingLevel]).localeCompare(
        String(b[id as keyof TeachingLevel])
      )
    )
    return desc ? copy.reverse() : copy
  }, [levels, sorting])

  const toggleExpand = useCallback((level: TeachingLevel) => {
    setExpandedId((prev) => (prev === level.id ? null : level.id))
  }, [])

  const columns = useMemo(
    () =>
      createRatingScaleLevelColumns({
        expandedId,
        onToggleExpand: toggleExpand,
      }),
    [expandedId, toggleExpand]
  )

  const { table, selectedIds, hasSelection, resetSelection } = useDataTable({
    columns,
    data: sortedLevels,
    pageCount: 1,
    getRowId: (level) => String(level.id),
    pageIndex: 0,
    pageSize: 10,
    goToPage: () => {},
    setPageSize: () => {},
    sorting,
    setSorting,
  })

  const selectedScaleCodigos = useMemo(() => {
    const selected = new Set(selectedIds)
    const codigos = new Set<number>()
    for (const scale of scales) {
      if (scale.teachingLevelIds.some((id) => selected.has(String(id)))) {
        codigos.add(scale.codigo)
      }
    }
    return Array.from(codigos)
  }, [selectedIds, scales])

  function scalesForLevel(levelId: number): RatingScale[] {
    return scales.filter((scale) => scale.teachingLevelIds.includes(levelId))
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end gap-2">
        {hasSelection ? (
          <>
            <DeleteSelectedRatingScalesDialog
              levelCount={selectedIds.length}
              scaleCodigos={selectedScaleCodigos}
              resetSelection={resetSelection}
            />
            <ExportSelectedRatingScalesDialog
              levelCount={selectedIds.length}
              scaleCodigos={selectedScaleCodigos}
              resetSelection={resetSelection}
            />
          </>
        ) : (
          <>
            <CreateRatingScaleDialog academicPeriodId={academicPeriodId} />
            <ExportRatingScalesDialog filters={{}} />
          </>
        )}
      </div>

      <NoticeOutlet />

      <ExpandableDataTable
        table={table}
        isPending={scalesPending}
        isError={isError}
        onRetry={refetch}
        cellClassName="px-1"
        growColumnId="nombre"
        growColumnClassName="pl-6"
        emptyMessage="Aún no se agregaron escalas de valoración."
        errorMessage="Ocurrió un error al cargar las escalas."
        renderSubRow={(row) => {
          const level = row.original as TeachingLevel
          if (expandedId !== level.id) return null
          return (
            <ScalesSubTable
              levelId={level.id}
              scales={scalesForLevel(level.id)}
              range={range}
              academicPeriodId={academicPeriodId}
            />
          )
        }}
      />
    </div>
  )
}

type EditableScale = Pick<
  RatingScale,
  | "nombre"
  | "abreviacion"
  | "notaMaxima"
  | "notaMinima"
  | "notaEquivalente"
  | "tipo"
  | "iconografia"
>

function toDraft(scale: RatingScale): EditableScale {
  return {
    nombre: scale.nombre,
    abreviacion: scale.abreviacion,
    notaMaxima: scale.notaMaxima,
    notaMinima: scale.notaMinima,
    notaEquivalente: scale.notaEquivalente,
    tipo: scale.tipo,
    iconografia: scale.iconografia,
  }
}

type ScaleDraft = EditableScale

function makeEmptyScaleDraft(range: GradingRange): ScaleDraft {
  return {
    nombre: "",
    abreviacion: "",
    notaMaxima: range.max,
    notaMinima: range.min,
    notaEquivalente: range.min,
    tipo: "" as RatingScaleType,
    iconografia: "",
  }
}

function ScalesSubTable({
  levelId,
  scales,
  range,
  academicPeriodId,
}: {
  levelId: number
  scales: RatingScale[]
  range: GradingRange
  academicPeriodId?: number
}) {
  const { notify } = useNotify()
  const { data: symbols = [] } = useRatingSymbolsQuery()
  const { data: tipoOptions = [] } = useRatingScaleTypesQuery()
  const [sort, setSort] = useState<ScaleSort>(null)

  // Borrador de la fila de alta: siempre visible al pie de la subtabla para
  // crear una escala directamente en este nivel de enseñanza.
  const [addDraft, setAddDraft] = useState<ScaleDraft>(() =>
    makeEmptyScaleDraft(range)
  )
  function patchAddDraft(patch: Partial<ScaleDraft>) {
    setAddDraft((prev) => ({ ...prev, ...patch }))
  }

  const createMutation = useCreateRatingScalesBulk({
    mutationConfig: {
      onSuccess: () => {
        notify(SUCCESS_MESSAGES.ratingScale.created)
        setAddDraft(makeEmptyScaleDraft(range))
      },
      onError: () => {
        notify("No se pudo agregar la escala de valoración.", {
          variant: "error",
        })
      },
    },
  })

  function commitDraft() {
    // Mismas reglas que el alta desde el diálogo: notas dentro del rango del
    // periodo (y mínima ≤ máxima).
    const parsed = makeRatingScaleGradesSchema(range).safeParse(addDraft)
    if (!parsed.success) {
      notify(parsed.error.issues[0]?.message ?? "Revisa los datos.", {
        variant: "error",
      })
      return
    }
    createMutation.mutate({
      teachingLevelIds: [levelId],
      scales: [{ ...parsed.data, tipo: parsed.data.tipo as RatingScaleType }],
      academicPeriodId,
    })
  }

  const sortedScales = useMemo(
    () => sortByScaleKey(scales, sort),
    [scales, sort]
  )
  const {
    editingKey: editingCodigo,
    draft,
    startEdit: startRowEdit,
    patchDraft,
    cancelEdit,
  } = useRowEdit<EditableScale>()

  const updateMutation = useUpdateRatingScale({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          notify(result.message, { variant: "error" })
          return
        }
        notify(SUCCESS_MESSAGES.ratingScale.updated)
        cancelEdit()
      },
    },
  })

  function startEdit(scale: RatingScale) {
    startRowEdit(scale.codigo, toDraft(scale))
  }

  function saveEdit(scale: RatingScale) {
    if (!draft) return
    // Mismas reglas que el alta: las notas deben caer dentro del rango del
    // periodo (y mínima ≤ máxima).
    const parsed = makeRatingScaleGradesSchema(range).safeParse(draft)
    if (!parsed.success) {
      notify(parsed.error.issues[0]?.message ?? "Revisa los datos.", {
        variant: "error",
      })
      return
    }
    updateMutation.mutate({
      codigo: scale.codigo,
      values: {
        ...scale,
        ...parsed.data,
        tipo: parsed.data.tipo as RatingScaleType,
      },
    })
  }

  return (
    <div className="-m-4 bg-background p-4">
      <div className="overflow-x-auto rounded-md border [&_[data-slot=input]]:bg-background [&_[data-slot=select-trigger]]:bg-background">
        {/* Los controles de la fila en edición usan la variante `outlined`:
            cada input queda recuadrado y se distingue del hover de la fila. */}
        <FieldVariantContext.Provider value="outlined">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border">
              <TableHead>
                <ScaleSortableHeader
                  title="Nombre"
                  sortKey="nombre"
                  sort={sort}
                  onSortChange={setSort}
                />
              </TableHead>
              <TableHead>
                <ScaleSortableHeader
                  title="Abreviación"
                  sortKey="abreviacion"
                  sort={sort}
                  onSortChange={setSort}
                />
              </TableHead>
              <TableHead>
                <ScaleSortableHeader
                  title="Nota máximo"
                  sortKey="notaMaxima"
                  sort={sort}
                  onSortChange={setSort}
                />
              </TableHead>
              <TableHead>
                <ScaleSortableHeader
                  title="Nota mínimo"
                  sortKey="notaMinima"
                  sort={sort}
                  onSortChange={setSort}
                />
              </TableHead>
              <TableHead>
                <ScaleSortableHeader
                  title="Nota equivalente"
                  sortKey="notaEquivalente"
                  sort={sort}
                  onSortChange={setSort}
                />
              </TableHead>
              <TableHead>
                <ScaleSortableHeader
                  title="Tipo"
                  sortKey="tipo"
                  sort={sort}
                  onSortChange={setSort}
                />
              </TableHead>
              <TableHead>Iconografía</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="[&_tr]:border-b [&_tr]:border-border [&_tr:last-child]:border-0">
            {sortedScales.map((scale) => {
              const isEditing = editingCodigo === scale.codigo

              if (isEditing && draft) {
                return (
                  <TableRow key={scale.codigo}>
                    <TableCell>
                      <Input
                        aria-label="Nombre"
                        placeholder="Ingresar nombre"
                        value={draft.nombre}
                        onChange={(e) => patchDraft({ nombre: e.target.value })}
                        className="min-w-32"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        aria-label="Abreviación"
                        placeholder="Ingresar abreviación"
                        value={draft.abreviacion}
                        onChange={(e) => patchDraft({ abreviacion: e.target.value })}
                        className="min-w-24"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        aria-label="Nota máximo"
                        placeholder="Ingresar nota máxima"
                        type="number"
                        step="0.1"
                        min={range.min}
                        max={range.max}
                        value={Number.isNaN(draft.notaMaxima) ? "" : draft.notaMaxima}
                        onChange={(e) => patchDraft({ notaMaxima: e.target.valueAsNumber })}
                        className="w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        aria-label="Nota mínimo"
                        placeholder="Ingresar nota mínima"
                        type="number"
                        step="0.1"
                        min={range.min}
                        max={range.max}
                        value={Number.isNaN(draft.notaMinima) ? "" : draft.notaMinima}
                        onChange={(e) => patchDraft({ notaMinima: e.target.valueAsNumber })}
                        className="w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        aria-label="Nota equivalente"
                        placeholder="Ingresar nota equivalente"
                        type="number"
                        step="0.1"
                        min={range.min}
                        max={range.max}
                        value={
                          Number.isNaN(draft.notaEquivalente) ? "" : draft.notaEquivalente
                        }
                        onChange={(e) =>
                          patchDraft({ notaEquivalente: e.target.valueAsNumber })
                        }
                        className="w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={draft.tipo}
                        onValueChange={(value) =>
                          value && patchDraft({ tipo: value as RatingScaleType })
                        }
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
                        value={draft.iconografia}
                        onChange={(valor) => patchDraft({ iconografia: valor })}
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
                          disabled={updateMutation.isPending}
                          aria-busy={updateMutation.isPending}
                          onClick={() => saveEdit(scale)}
                        >
                          {updateMutation.isPending ? (
                            <SpinnerIcon className="animate-spin" />
                          ) : (
                            <CheckIcon />
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="size-8"
                          aria-label="Cancelar edición"
                          disabled={updateMutation.isPending}
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
                <TableRow key={scale.codigo}>
                  <TableCell className="font-medium">{scale.nombre}</TableCell>
                  <TableCell>{scale.abreviacion}</TableCell>
                  <TableCell>{scale.notaMaxima}</TableCell>
                  <TableCell>{scale.notaMinima}</TableCell>
                  <TableCell>{scale.notaEquivalente}</TableCell>
                  <TableCell>
                    <Badge {...RATING_SCALE_TYPE_BADGE[scale.tipo]}>{scale.tipo}</Badge>
                  </TableCell>
                  <TableCell className="text-lg">
                    <RatingSymbolView value={scale.iconografia} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        color="neutral"
                        size="icon"
                        className="size-8"
                        aria-label="Editar escala de valoración"
                        disabled={editingCodigo !== null}
                        onClick={() => startEdit(scale)}
                      >
                        <PencilIcon />
                      </Button>
                      <DeleteRatingScaleDialog scale={scale} />
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}

            {/* Fila de carga: siempre visible para crear una escala en este
                nivel directamente desde la subtabla. */}
            <TableRow>
              <TableCell>
                <Input
                  aria-label="Nombre"
                  placeholder="Ingresar nombre"
                  placeholder="Ingresar nombre"
                  value={addDraft.nombre}
                  onChange={(e) => patchAddDraft({ nombre: e.target.value })}
                  className="min-w-32"
                />
              </TableCell>
              <TableCell>
                <Input
                  aria-label="Abreviación"
                  placeholder="Ingresar abreviación"
                  placeholder="Ingresar abreviación"
                  value={addDraft.abreviacion}
                  onChange={(e) => patchAddDraft({ abreviacion: e.target.value })}
                  className="min-w-24"
                />
              </TableCell>
              <TableCell>
                <Input
                  aria-label="Nota máximo"
                  placeholder="Ingresar nota máxima"
                  type="number"
                  step="0.1"
                  min={range.min}
                  max={range.max}
                  value={Number.isNaN(addDraft.notaMaxima) ? "" : addDraft.notaMaxima}
                  onChange={(e) => patchAddDraft({ notaMaxima: e.target.valueAsNumber })}
                  className="w-20"
                />
              </TableCell>
              <TableCell>
                <Input
                  aria-label="Nota mínimo"
                  placeholder="Ingresar nota mínima"
                  type="number"
                  step="0.1"
                  min={range.min}
                  max={range.max}
                  value={Number.isNaN(addDraft.notaMinima) ? "" : addDraft.notaMinima}
                  onChange={(e) => patchAddDraft({ notaMinima: e.target.valueAsNumber })}
                  className="w-20"
                />
              </TableCell>
              <TableCell>
                <Input
                  aria-label="Nota equivalente"
                  placeholder="Ingresar nota equivalente"
                  type="number"
                  step="0.1"
                  min={range.min}
                  max={range.max}
                  value={
                    Number.isNaN(addDraft.notaEquivalente)
                      ? ""
                      : addDraft.notaEquivalente
                  }
                  onChange={(e) =>
                    patchAddDraft({ notaEquivalente: e.target.valueAsNumber })
                  }
                  className="w-20"
                />
              </TableCell>
              <TableCell>
                <Select
                  value={addDraft.tipo}
                  onValueChange={(value) =>
                    value && patchAddDraft({ tipo: value as RatingScaleType })
                  }
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
                  value={addDraft.iconografia}
                  onChange={(valor) => patchAddDraft({ iconografia: valor })}
                />
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-1">
                  <Button
                    type="button"
                    color="primary"
                    size="icon"
                    className="size-8"
                    aria-label="Agregar escala de valoración a este nivel"
                    disabled={editingCodigo !== null || createMutation.isPending}
                    aria-busy={createMutation.isPending}
                    onClick={commitDraft}
                  >
                    {createMutation.isPending ? (
                      <SpinnerIcon className="animate-spin" />
                    ) : (
                      <PlusIcon weight="bold" />
                    )}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
        </FieldVariantContext.Provider>
      </div>
    </div>
  )
}
