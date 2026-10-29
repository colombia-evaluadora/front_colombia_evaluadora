"use no memo"

import { useState } from "react"
import type { SortingState } from "@tanstack/react-table"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import { getErrorMessage } from "@/lib/api-client"

import { useNotify, NoticeOutlet } from "@/components/notice/notice-context"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
  ComboboxGroup,
} from "@/components/ui/combobox"
import { PlusIcon, WarningIcon } from "@/components/ui/icons"
import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import { useDataTable } from "@/hooks/use-data-table"
import { useLocalPagination } from "@/features/establishment/academic-period/hooks/use-local-pagination"
import { cn } from "@/lib/utils"

import { useRatingScalesQuery } from "@/features/establishment/academic-period/api/query/use-rating-scales"
import { useTeachingLevelsQuery } from "@/features/establishment/academic-period/api/query/use-teaching-levels"
import { useEvaluationCriteriaQuery } from "@/features/establishment/academic-period/api/query/use-evaluation-criteria"
import { useEvaluationCriteriaOptionsQuery } from "@/features/establishment/academic-period/api/query/catalogos-lista-valor"
import { useDeleteRatingScale } from "@/features/establishment/academic-period/api/mutations/delete-rating-scale"
import {
  bandaIdForLevel,
  type RatingScale,
} from "@/features/establishment/academic-period/api/types/rating-scales"
import { RatingScaleDialog } from "@/features/establishment/academic-period/components/dialogs/dialog-rating-scale"
import {
  createRatingScaleColumns,
  getScaleColors,
  heatColor,
  heatPastel,
} from "@/features/establishment/academic-period/components/table/columns-rating-scales"
import { parseGradingRange } from "@/features/establishment/academic-period/utils/grading-range"
import {
  coverageIssueMessage,
  formatGrade,
  getCoverageIssues,
} from "@/features/establishment/academic-period/utils/rating-scale-coverage"
import { PeriodReadOnlyNotice, usePeriodReadOnly, withoutRowActions } from "@/features/establishment/academic-period/utils/period-read-only"

interface TabRatingScalesProps {
  academicPeriodId?: number
}

export function TabRatingScales({ academicPeriodId }: TabRatingScalesProps) {
  const { notify } = useNotify()
  const deleteMutation = useDeleteRatingScale()
  const { data, isPending, isError, error, refetch } = useRatingScalesQuery({
    filters: {},
    sorting: [],
    academicPeriodId,
  })
  const { data: levels = [] } = useTeachingLevelsQuery()
  const { data: criteria } = useEvaluationCriteriaQuery(academicPeriodId)
  const { data: criteriaOptions } = useEvaluationCriteriaOptionsQuery()

  const range = parseGradingRange(criteria?.gradingFormatName)
  // Regla 50: con una sola escala no hay filtro ni campo de nivel.
  const scaleModeLabel = criteriaOptions?.ratingScaleMode.find(
    (o) => o.key === criteria?.ratingScaleMode,
  )?.label
  const singleScale = scaleModeLabel?.toLowerCase().startsWith("una sola") ?? false

  const scales = data?.rows ?? []
  const [pickedLevelId, setPickedLevelId] = useState<number | null>(null)
  // Arranca en el primer nivel que ya tiene valoraciones.
  const levelId =
    pickedLevelId ??
    levels.find((l) => scales.some((s) => s.teachingLevelIds.includes(l.id)))?.id ??
    levels[0]?.id ??
    null

  function scalesForLevel(id: number | null): RatingScale[] {
    if (singleScale || id == null) return scales
    return scales.filter((s) => s.teachingLevelIds.includes(id))
  }

  const visible = scalesForLevel(levelId)
  const [sorting, setSorting] = useState<SortingState>([])
  const rows = sorting.length
    ? [...visible].sort((a, b) => {
        const [{ id, desc }] = sorting
        const av = a[id as keyof RatingScale]
        const bv = b[id as keyof RatingScale]
        const cmp =
          typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv))
        return desc ? -cmp : cmp
      })
    : [...visible].sort((a, b) => b.notaMinima - a.notaMinima)

  const [dialog, setDialog] = useState<{ key: number; scale: RatingScale | null } | null>(null)
  const openDialog = (scale: RatingScale | null) =>
    setDialog((prev) => ({ key: (prev?.key ?? 0) + 1, scale }))

  async function deleteScale(scale: RatingScale): Promise<boolean> {
    // Con una sola escala la valoración tiene una banda por nivel: se borran todas.
    const ids = singleScale ? scale.bandaIdsByLevel : [bandaIdForLevel(scale, levelId ?? 0)]
    try {
      for (const id of ids) await deleteMutation.mutateAsync(id)
      notify(SUCCESS_MESSAGES.ratingScale.deleted)
      return true
    } catch (e) {
      notify(getErrorMessage(e), { variant: "error" })
      return false
    }
  }

  const colors = getScaleColors(visible)
  const { readOnly } = usePeriodReadOnly()
  const columns = withoutRowActions(
    createRatingScaleColumns({ colors, onEdit: openDialog, onDelete: deleteScale }),
    readOnly,
  )
  const page = useLocalPagination(rows)
  const { table } = useDataTable({
    columns,
    data: page.pageRows,
    getRowId: (scale) => String(scale.codigo),
    ...page.table,
    sorting,
    setSorting,
    columnVisibilityStorageKey: "tab-rating-scales-column-visibility",
  })

  const issues = getCoverageIssues(visible, range)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <h3 className="text-lg font-semibold">Escalas de valoración</h3>
        {!singleScale && (
          <Field variant="outlined" className="w-full sm:w-60">
            <FieldLabel htmlFor="rating-scale-level">Nivel de enseñanza</FieldLabel>
            <ComboboxField
              items={Object.fromEntries(levels.map((l) => [String(l.id), l.nombre]))}
              value={levelId != null ? String(levelId) : ""}
              onValueChange={(value) => value && setPickedLevelId(Number(value))}
            >
              <ComboboxFieldTrigger id="rating-scale-level" size="sm">
                <ComboboxFieldValue placeholder="Seleccionar" />
              </ComboboxFieldTrigger>
              <ComboboxFieldContent>
                <ComboboxGroup>
                  {levels.map((l) => (
                    <ComboboxFieldItem key={l.id} value={String(l.id)}>
                      {l.nombre}
                    </ComboboxFieldItem>
                  ))}
                </ComboboxGroup>
              </ComboboxFieldContent>
            </ComboboxField>
          </Field>
        )}
        {!readOnly && (
          <Button color="primary" size="sm" className="ml-auto" onClick={() => openDialog(null)}>
            <PlusIcon data-icon="inline-start" />
            Agregar valoración
          </Button>
        )}
      </div>

      <NoticeOutlet />
      <PeriodReadOnlyNotice what="la escala de valoración" />

      <DataTable
        table={table}
        isPending={isPending}
        isError={isError}
        onRetry={refetch}
        growColumnId="nombre"
        emptyMessage="Aún no hay valoraciones para este nivel. Use Agregar valoración para crear la escala."
        errorMessage={error ? getErrorMessage(error) : undefined}
      />

      <Pagination viewOptions={<DataTableViewOptions table={table} />} {...page.pagination} />

      {!isPending && !isError && (
        <ScaleCoverage scales={visible} range={range} issues={issues.map(coverageIssueMessage)} />
      )}

      {dialog && (
        <RatingScaleDialog
          key={dialog.key}
          open
          onOpenChange={(open) => !open && setDialog(null)}
          academicPeriodId={academicPeriodId}
          range={range}
          singleScale={singleScale}
          levels={levels}
          levelId={levelId}
          scale={dialog.scale}
          scalesForLevel={scalesForLevel}
        />
      )}
    </div>
  )
}

// Marca de la escala: entero sin decimales ("6"), si no con un decimal ("6,5").
const tick = (n: number) => (Number.isInteger(n) ? String(n) : formatGrade(n))

// Barra de cobertura (Regla 51) como mapa de calor: debajo va el degradado
// completo del formato, atenuado, y cada valoración pinta su tramo con el color
// del punto donde cae. Los huecos dejan ver el degradado pálido y los cruces se
// notan porque un tramo tapa al otro.
function ScaleCoverage({
  scales,
  range,
  issues,
}: {
  scales: RatingScale[]
  range: { min: number; max: number }
  issues: string[]
}) {
  const span = range.max - range.min || 1
  const pos = (n: number) => ((n - range.min) / span) * 100
  const sorted = [...scales].sort((a, b) => a.notaMinima - b.notaMinima)
  // Marcas: los bordes del formato y el inicio de cada valoración.
  const ticks = Array.from(
    new Set([range.min, ...sorted.map((s) => s.notaMinima), range.max].map((n) => Math.round(n * 10) / 10)),
  ).sort((a, b) => a - b)
  const complete = scales.length > 0 && issues.length === 0

  return (
    <section aria-label="Cobertura de la escala" className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-medium">
          Cobertura de la escala (de {tick(range.min)} a {tick(range.max)})
        </h4>
        {complete ? (
          <Badge variant="soft" color="success" className="border border-current/30">
            <span aria-hidden className="size-1.5 rounded-full bg-current" />
            Completa: sin huecos ni cruces
          </Badge>
        ) : null}
      </div>

      <div
        className="relative h-7 overflow-hidden rounded-md"
        style={{
          backgroundImage: `linear-gradient(to right, ${[0, 0.25, 0.5, 0.75, 1].map(heatColor).join(", ")})`,
        }}
      >
        <div aria-hidden className="absolute inset-0 bg-background/75" />
        {sorted.map((s, i) => {
          const left = pos(s.notaMinima)
          // El tramo llega hasta donde empieza la nota siguiente (máximo + 0,1).
          const right = pos(Math.min(s.notaMaxima + 0.1, range.max))
          return (
            <div
              key={s.codigo}
              title={`${s.nombre}: ${formatGrade(s.notaMinima)} a ${formatGrade(s.notaMaxima)}`}
              className={cn(
                "absolute inset-y-0 flex items-center justify-center overflow-hidden border-r-2 border-background text-xs font-medium whitespace-nowrap",
              )}
              style={{
                left: `${left}%`,
                width: `${Math.max(0, right - left)}%`,
                ...heatPastel(sorted.length === 1 ? 1 : i / Math.max(1, sorted.length - 1)),
              }}
            >
              {s.nombre}
            </div>
          )
        })}
      </div>

      <div className="relative h-4 text-xs text-muted-foreground tabular-nums">
        {ticks.map((t) => {
          const p = pos(t)
          return (
            <span
              key={t}
              className="absolute"
              style={{
                left: `${p}%`,
                transform: p === 0 ? "none" : p === 100 ? "translateX(-100%)" : "translateX(-50%)",
              }}
            >
              {tick(t)}
            </span>
          )
        })}
      </div>

      {issues.length > 0 && (
        <ul className="flex flex-col gap-1">
          {issues.map((issue) => (
            <li key={issue} className="flex items-start gap-2 text-sm text-orange">
              <WarningIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
              {issue}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
