"use no memo"

import { useCallback, useMemo, useState } from "react"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import type { SortingState } from "@tanstack/react-table"
import { PlusIcon, SpinnerIcon } from "@/components/ui/icons"

import { useNotify, NoticeOutlet } from "@/components/notice/notice-context"
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
import { DataTable } from "@/components/data-table"
import { TableCell } from "@/components/ui/table"
import { useDataTable } from "@/hooks/use-data-table"

import { useRatingScalesQuery } from "@/features/establishment/academic-period/api/query/use-rating-scales"
import { useRatingSymbolsQuery } from "@/features/establishment/academic-period/api/query/use-rating-symbols"
import { useRatingScaleTypesQuery } from "@/features/establishment/academic-period/api/query/use-rating-scale-types"
import { useEvaluationCriteriaQuery } from "@/features/establishment/academic-period/api/query/use-evaluation-criteria"
import { useUpdateRatingScale } from "@/features/establishment/academic-period/api/mutations/update-rating-scale"
import { useCreateRatingScalesBulk } from "@/features/establishment/academic-period/api/mutations/create-rating-scales-bulk"
import type {
  RatingScale,
  RatingScaleType,
  TeachingLevel,
} from "@/features/establishment/academic-period/api/types/rating-scales"
import { CreateRatingScaleDialog } from "@/features/establishment/academic-period/components/dialogs/dialog-create-rating-scale"
import { DeleteSelectedRatingScalesDialog } from "@/features/establishment/academic-period/components/dialogs/dialog-delete-selected-rating-scales"
import { ExportRatingScalesDialog } from "@/features/establishment/academic-period/components/dialogs/dialog-export-rating-scales"
import { ExportSelectedRatingScalesDialog } from "@/features/establishment/academic-period/components/dialogs/dialog-export-selected-rating-scales"
import { RatingSymbolSelect } from "@/features/establishment/academic-period/components/rating-symbol"
import { createRatingScaleLevelColumns } from "@/features/establishment/academic-period/components/table/columns-rating-scales"
import {
  createRatingScaleDetailColumns,
  toScaleDraft,
  type EditableScale,
} from "@/features/establishment/academic-period/components/table/columns-rating-scale-detail"
import {
  makeRatingScaleGradesSchema,
  parseGradingRange,
  type GradingRange,
} from "@/features/establishment/academic-period/components/grading-range"
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

  // La tabla se arma a partir de las escalas existentes: un nivel aparece
  // reciÃ©n cuando se le agrega al menos una escala. Si no hay escalas, no
  // hay filas (la tabla arranca vacÃ­a).
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

  // El bulk delete de escalas falla por `teachingLevelId`, no por código de
  // escala — el nombre que le sirve al usuario en el aviso es el del nivel.
  const levelNamesById = useMemo(
    () => new Map(levels.map((level) => [level.id, level.nombre])),
    [levels],
  )

  function scalesForLevel(levelId: number): RatingScale[] {
    return scales.filter((scale) => scale.teachingLevelIds.includes(levelId))
  }

  return (
    <div className="flex flex-col gap-4">
      {/* El `border-b` cierra la barra de acciones igual que el `hr` de
          `TableScreenHeader` en las pantallas de listado. */}
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
            // `min-w-full max-w-0`: la celda que envuelve esta sub-fila (en
            // el `DataTable` compartido) no tiene límite de ancho propio, así
            // que con `table-layout: auto` (el default) su ancho se calcula a
            // partir del contenido — la subtabla, al ser más ancha (más
            // columnas que la tabla exterior), terminaba estirando toda la
            // tabla de niveles en vez de scrollear ella sola. `max-w-0` hace
            // que el algoritmo de layout de la tabla trate este wrapper como
            // si no aportara ancho propio; `min-w-full` gana en el layout
            // final (el `min-width` le gana al `max-width` cuando compiten),
            // así que igual ocupa todo el ancho disponible — solo que ya no
            // fuerza a la tabla exterior a crecer. El `overflow-x-auto` de
            // `ScalesSubTable` (su propio `<Table>`) recién puede scrollear.
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

  // Borrador de la fila de alta: siempre visible al pie de la subtabla para
  // crear una escala directamente en este nivel de enseÃ±anza.
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

  // Todos los campos completos antes de mostrar el botón de alta — mismo
  // criterio que ya usa el diálogo de escalas en lote (`canSubmit` ahí) y el
  // de área/asignatura (`isDraftComplete`).
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
    // Mismas reglas que el alta desde el diÃ¡logo: notas dentro del rango del
    // periodo (y mÃ­nima â‰¤ mÃ¡xima).
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

  // La subtabla ordena en memoria: las escalas del nivel ya vienen todas
  // cargadas, no hay ida al backend por columna.
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
    // Mismas reglas que el alta: las notas deben caer dentro del rango del
    // periodo (y mÃ­nima â‰¤ mÃ¡xima).
    const parsed = makeRatingScaleGradesSchema(range).safeParse(draft)
    if (!parsed.success) {
      notify(parsed.error.issues[0]?.message ?? "Revisa los datos.", {
        variant: "error",
      })
      return
    }
    if (academicPeriodId == null) return
    updateMutation.mutate({
      codigo: scale.codigo,
      academicPeriodId,
      values: {
        ...scale,
        ...parsed.data,
        tipo: parsed.data.tipo as RatingScaleType,
      },
    })
  }

  // Sin `useMemo`: las celdas cierran sobre el borrador en ediciÃ³n, asÃ­ que
  // las columnas tienen que rearmarse en cada render. El archivo va con
  // `use no memo` justamente por esto.
  const columns = createRatingScaleDetailColumns({
    range,
    symbols,
    tipoOptions,
    editingCodigo,
    draft,
    patchDraft,
    onStartEdit: startEdit,
    onSave: saveEdit,
    onCancel: cancelEdit,
    isSaving: updateMutation.isPending,
  })

  // Sin paginaciÃ³n: el nivel trae todas sus escalas de una.
  const { table } = useDataTable({
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

  return (
    <div className="-m-4 bg-background p-4">
      {/* Los controles de la fila en ediciÃ³n usan la variante `outlined`: cada
          input queda recuadrado y se distingue del hover de la fila. */}
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
                {/* Alineada con la columna de selecciÃ³n, que la fila de alta
                    no tiene: nada que seleccionar todavÃ­a. */}
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
                    onChange={(e) => patchAddDraft({ notaMaxima: e.target.valueAsNumber })}
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
                    onChange={(e) => patchAddDraft({ notaMinima: e.target.valueAsNumber })}
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
                    onChange={(e) => patchAddDraft({ notaEquivalente: e.target.valueAsNumber })}
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
                      <SelectValue>
                        {(value) =>
                          tipoOptions.find((o) => o.key === value)?.label ?? "Seleccionar"
                        }
                      </SelectValue>
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
                {spacer}
                <TableCell className={actionsCellClassName}>
                  <div className={actionsOverlayClassName}>
                    {isAddDraftComplete(addDraft) && (
                    <Button
                      type="button"
                      color="primary"
                      size="icon-sm"
                      aria-label="Agregar escala de valoraciÃ³n a este nivel"
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
