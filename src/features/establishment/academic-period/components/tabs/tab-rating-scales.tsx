"use no memo"

import { useCallback, useMemo, useRef, useState } from "react"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import type { SortingState } from "@tanstack/react-table"
import { PlusIcon, SpinnerIcon } from "@/components/ui/icons"

import { useNotify, NoticeOutlet } from "@/components/notice/notice-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FieldVariantContext } from "@/hooks/use-field-variant"
import {
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
  ComboboxGroup,
} from "@/components/ui/combobox"
import { DataTable } from "@/components/data-table"
import { TableCell } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useDataTable } from "@/hooks/use-data-table"

import { useRatingScalesQuery } from "@/features/establishment/academic-period/api/query/use-rating-scales"
import { useRatingSymbolsQuery } from "@/features/establishment/academic-period/api/query/use-rating-symbols"
import { useRatingScaleTypesQuery } from "@/features/establishment/academic-period/api/query/use-rating-scale-types"
import { useEvaluationCriteriaQuery } from "@/features/establishment/academic-period/api/query/use-evaluation-criteria"
import { useUpdateRatingScale } from "@/features/establishment/academic-period/api/mutations/update-rating-scale"
import { useCreateRatingScalesBulk } from "@/features/establishment/academic-period/api/mutations/create-rating-scales-bulk"
import {
  bandaIdForLevel,
  type RatingScale,
  type RatingScaleType,
  type TeachingLevel,
} from "@/features/establishment/academic-period/api/types/rating-scales"
import { CreateRatingScaleDialog } from "@/features/establishment/academic-period/components/dialogs/dialog-create-rating-scale"
import { DeleteSelectedRatingScalesDialog } from "@/features/establishment/academic-period/components/dialogs/dialog-delete-selected-rating-scales"
import { DeleteSelectedRatingScaleValoracionesDialog } from "@/features/establishment/academic-period/components/dialogs/dialog-delete-selected-rating-scale-valoraciones"
import { ExportRatingScalesDialog } from "@/features/establishment/academic-period/components/dialogs/dialog-export-rating-scales"
import { ExportSelectedRatingScalesDialog } from "@/features/establishment/academic-period/components/dialogs/dialog-export-selected-rating-scales"
import { RatingSymbolSelect } from "@/features/establishment/academic-period/components/rating-symbol"
import { createRatingScaleLevelColumns } from "@/features/establishment/academic-period/components/table/columns-rating-scales"
import {
  createRatingScaleDetailColumns,
  type CreateRatingScaleDetailColumnsOptions,
  toScaleDraft,
  type EditableScale,
} from "@/features/establishment/academic-period/components/table/columns-rating-scale-detail"
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
import { useRowEdit } from "@/features/establishment/academic-period/hooks/use-row-edit"

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
    academicPeriodId,
  })

  const { data: criteria } = useEvaluationCriteriaQuery(academicPeriodId)
  const range = useMemo(() => parseGradingRange(criteria?.gradingFormatName), [criteria])

  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [sorting, setSorting] = useState<SortingState>([])

  const scales = data?.rows ?? []

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
      String(a[id as keyof TeachingLevel]).localeCompare(String(b[id as keyof TeachingLevel])),
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
    [expandedId, toggleExpand],
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

  const selectedTeachingLevelIds = useMemo(
    () => selectedIds.map((id) => Number(id)),
    [selectedIds],
  )

  const levelNamesById = useMemo(
    () => new Map(levels.map((level) => [level.id, level.nombre])),
    [levels],
  )

  function scalesForLevel(levelId: number): RatingScale[] {
    return scales.filter((scale) => scale.teachingLevelIds.includes(levelId))
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end gap-2 border-b border-border pb-4">
        {hasSelection ? (
          <>
            <DeleteSelectedRatingScalesDialog
              academicPeriodId={academicPeriodId ?? 0}
              levelCount={selectedIds.length}
              teachingLevelIds={selectedTeachingLevelIds}
              namesById={levelNamesById}
              resetSelection={resetSelection}
            />
            <ExportSelectedRatingScalesDialog
              levelCount={selectedIds.length}
              scaleCodigos={selectedScaleCodigos}
              resetSelection={resetSelection}
              academicPeriodId={academicPeriodId}
            />
          </>
        ) : (
          <>
            <CreateRatingScaleDialog academicPeriodId={academicPeriodId} />
            <ExportRatingScalesDialog academicPeriodId={academicPeriodId} />
          </>
        )}
      </div>

      <NoticeOutlet />

      <DataTable
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
            <div className="min-w-full max-w-0">
              <ScalesSubTable
                levelId={level.id}
                scales={scalesForLevel(level.id)}
                range={range}
                academicPeriodId={academicPeriodId}
              />
            </div>
          )
        }}
      />
    </div>
  )
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
  const [sorting, setSorting] = useState<SortingState>([])
  const [addDraft, setAddDraft] = useState<ScaleDraft>(() => makeEmptyScaleDraft(range))
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
        notify("No se pudo agregar la escala de valoraciÃ³n.", {
          variant: "error",
        })
      },
    },
  })

  function isAddDraftComplete(value: ScaleDraft): boolean {
    return (
      value.nombre.trim() !== "" &&
      value.abreviacion.trim() !== "" &&
      value.tipo.trim() !== "" &&
      value.iconografia.trim() !== "" &&
      Number.isFinite(value.notaMaxima) &&
      Number.isFinite(value.notaMinima) &&
      Number.isFinite(value.notaEquivalente)
    )
  }

  function commitDraft() {
    const parsed = makeRatingScaleGradesSchema(range).safeParse(addDraft)
    if (!parsed.success) {
      notify(parsed.error.issues[0]?.message ?? "Revisa los datos.", {
        variant: "error",
      })
      return
    }
    const duplicate = findDuplicateRatingScale(parsed.data, scales)
    if (duplicate) {
      const value = duplicate.field === "nombre" ? parsed.data.nombre : parsed.data.abreviacion
      notify(ratingScaleDuplicateMessage(duplicate.field, value), { variant: "error" })
      return
    }
    const overlapping = findOverlappingRatingScale(parsed.data, scales)
    if (overlapping) {
      notify(ratingScaleOverlapMessage(overlapping), { variant: "error" })
      return
    }
    createMutation.mutate({
      teachingLevelIds: [levelId],
      scales: [{ ...parsed.data, tipo: parsed.data.tipo as RatingScaleType }],
      academicPeriodId,
    })
  }

  const sortedScales = useMemo(() => {
    if (!sorting.length) return scales
    const [{ id, desc }] = sorting
    const copy = [...scales].sort((a, b) => {
      const av = a[id as keyof RatingScale]
      const bv = b[id as keyof RatingScale]
      if (typeof av === "number" && typeof bv === "number") return av - bv
      return String(av).localeCompare(String(bv))
    })
    return desc ? copy.reverse() : copy
  }, [scales, sorting])

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
    startRowEdit(scale.codigo, toScaleDraft(scale))
  }

  function saveEdit(scale: RatingScale) {
    if (!draft) return
    const parsed = makeRatingScaleGradesSchema(range).safeParse(draft)
    if (!parsed.success) {
      notify(parsed.error.issues[0]?.message ?? "Revisa los datos.", {
        variant: "error",
      })
      return
    }
    const duplicate = findDuplicateRatingScale(
      parsed.data,
      scales,
      (s) => s.codigo === scale.codigo,
    )
    if (duplicate) {
      const value = duplicate.field === "nombre" ? parsed.data.nombre : parsed.data.abreviacion
      notify(ratingScaleDuplicateMessage(duplicate.field, value), { variant: "error" })
      return
    }
    const overlapping = findOverlappingRatingScale(
      parsed.data,
      scales.filter((s) => s.codigo !== scale.codigo),
    )
    if (overlapping) {
      notify(ratingScaleOverlapMessage(overlapping), { variant: "error" })
      return
    }
    if (academicPeriodId == null) return
    updateMutation.mutate({
      codigo: bandaIdForLevel(scale, levelId),
      academicPeriodId,
      values: {
        ...scale,
        ...parsed.data,
        tipo: parsed.data.tipo as RatingScaleType,
      },
    })
  }

  const columnOptionsRef = useRef({} as CreateRatingScaleDetailColumnsOptions)
  columnOptionsRef.current = {
    range,
    symbols,
    tipoOptions,
    levelId,
    editingCodigo,
    draft,
    patchDraft,
    onStartEdit: startEdit,
    onSave: saveEdit,
    onCancel: cancelEdit,
    isSaving: updateMutation.isPending,
  }

  const columns = useMemo(() => createRatingScaleDetailColumns(columnOptionsRef), [])

  const { table, selectedIds, hasSelection, resetSelection } = useDataTable({
    columns,
    data: sortedScales,
    pageCount: 1,
    getRowId: (scale) => String(scale.codigo),
    pageIndex: 0,
    pageSize: 10,
    goToPage: () => {},
    setPageSize: () => {},
    sorting,
    setSorting,
  })

  const selectedValoracionIds = useMemo(
    () =>
      selectedIds
        .map((id) => scales.find((scale) => String(scale.codigo) === id))
        .filter((scale): scale is RatingScale => scale != null)
        .map((scale) => bandaIdForLevel(scale, levelId)),
    [selectedIds, scales, levelId],
  )

  const valoracionNamesById = useMemo(
    () => new Map(scales.map((scale) => [bandaIdForLevel(scale, levelId), scale.nombre])),
    [scales, levelId],
  )

  return (
    <div className="-m-4 bg-background p-4">
      {hasSelection && (
        <div className="mb-2 flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-1 text-sm">
          <span>
            {selectedIds.length === 1
              ? "1 valoración seleccionada"
              : `${selectedIds.length} valoraciones seleccionadas`}
          </span>
          <DeleteSelectedRatingScaleValoracionesDialog
            valoracionCount={selectedIds.length}
            valoracionIds={selectedValoracionIds}
            namesById={valoracionNamesById}
            resetSelection={resetSelection}
          />
        </div>
      )}
      <FieldVariantContext.Provider value="outlined">
        <div className="[&_[data-slot=input]]:bg-background [&_[data-slot=select-trigger]]:bg-background">
          <DataTable
            table={table}
            isPending={false}
            isError={false}
            onRetry={() => {}}
            emptyMessage="Aún no se agregaron escalas de valoración."
            isRowActive={(row) => (row.original as RatingScale).codigo === editingCodigo}
            insideSubRow
            footerRow={({ spacer, actionsCellClassName, actionsOverlayClassName }) => (
              <>
                <TableCell />
                <TableCell>
                  <Input
                    aria-label="Nombre"
                    placeholder="Agregar"
                    value={addDraft.nombre}
                    onChange={(e) => patchAddDraft({ nombre: e.target.value })}
                    className="min-w-32"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    aria-label="AbreviaciÃ³n"
                    placeholder="Agregar"
                    value={addDraft.abreviacion}
                    onChange={(e) => patchAddDraft({ abreviacion: e.target.value })}
                    className="min-w-24"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    aria-label="Nota mÃ¡ximo"
                    placeholder="Agregar"
                    type="number"
                    step="0.1"
                    min={range.min}
                    max={range.max}
                    value={Number.isNaN(addDraft.notaMaxima) ? "" : addDraft.notaMaxima}
                    onKeyDown={(e) => {
                      if (["-", "+", "e", "E"].includes(e.key)) e.preventDefault()
                    }}
                    onChange={(e) => {
                      const value = e.target.valueAsNumber
                      if (e.target.value === "" || !Number.isNaN(value)) {
                        patchAddDraft({ notaMaxima: value })
                      }
                    }}
                    className="w-20"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    aria-label="Nota mÃ­nimo"
                    placeholder="Agregar"
                    type="number"
                    step="0.1"
                    min={range.min}
                    max={range.max}
                    value={Number.isNaN(addDraft.notaMinima) ? "" : addDraft.notaMinima}
                    onKeyDown={(e) => {
                      if (["-", "+", "e", "E"].includes(e.key)) e.preventDefault()
                    }}
                    onChange={(e) => {
                      const value = e.target.valueAsNumber
                      if (e.target.value === "" || !Number.isNaN(value)) {
                        patchAddDraft({ notaMinima: value })
                      }
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
                    value={Number.isNaN(addDraft.notaEquivalente) ? "" : addDraft.notaEquivalente}
                    onKeyDown={(e) => {
                      if (["-", "+", "e", "E"].includes(e.key)) e.preventDefault()
                    }}
                    onChange={(e) => {
                      const value = e.target.valueAsNumber
                      if (e.target.value === "" || !Number.isNaN(value)) {
                        patchAddDraft({ notaEquivalente: value })
                      }
                    }}
                    className="w-20"
                  />
                </TableCell>
                <TableCell>
                  <ComboboxField
                    value={addDraft.tipo}
                    onValueChange={(value) =>
                      value && patchAddDraft({ tipo: value as RatingScaleType })
                    }
                  >
                    <ComboboxFieldTrigger aria-label="Tipo" className="min-w-32">
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
                </TableCell>
                <TableCell>
                  <RatingSymbolSelect
                    symbols={symbols}
                    value={addDraft.iconografia}
                    onChange={(valor) => patchAddDraft({ iconografia: valor })}
                  />
                </TableCell>
                {spacer}
                <TableCell className={actionsCellClassName}>
                  <div className={actionsOverlayClassName}>
                    {isAddDraftComplete(addDraft) && (
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            type="button"
                            color="primary"
                            size="icon-sm"
                            aria-label="Agregar escala de valoración a este nivel"
                            disabled={editingCodigo !== null || createMutation.isPending}
                            aria-busy={createMutation.isPending}
                            onClick={commitDraft}
                          />
                        }
                      >
                        {createMutation.isPending ? (
                          <SpinnerIcon className="animate-spin" />
                        ) : (
                          <PlusIcon weight="bold" />
                        )}
                      </TooltipTrigger>
                      <TooltipContent>Agregar escala de valoración a este nivel</TooltipContent>
                    </Tooltip>
                    )}
                  </div>
                </TableCell>
              </>
            )}
          />
        </div>
      </FieldVariantContext.Provider>
    </div>
  )
}
