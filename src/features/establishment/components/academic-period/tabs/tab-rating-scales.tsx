"use no memo"

import { useCallback, useMemo, useState } from "react"
import type { SortingState } from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/data-table"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useDataTable } from "@/hooks/use-data-table"

import { useRatingScalesQuery } from "../../../api/query/use-rating-scales-query"
import { useTeachingLevelsQuery } from "../../../api/query/use-teaching-levels-query"
import { RATING_SCALE_TYPE_BADGE } from "../../../api/ui-mappings"
import type {
  RatingScale,
  TeachingLevel,
} from "../../../api/types/academic-period/rating-scales"
import { CreateRatingScaleDialog } from "../dialogs/dialog-create-rating-scale"
import { RatingSymbolView } from "../rating-symbol"
import { createRatingScaleLevelColumns } from "../table/columns-rating-scales"

interface TabRatingScalesProps {
  academicPeriodId?: number
}

export function TabRatingScales({ academicPeriodId }: TabRatingScalesProps) {
  const { data: levels = [], isPending: levelsPending } =
    useTeachingLevelsQuery()
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

  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [sorting, setSorting] = useState<SortingState>([])

  const scales = data?.rows ?? []
  const isPending = levelsPending || scalesPending

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

  const { table } = useDataTable({
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

  function scalesForLevel(levelId: number): RatingScale[] {
    return scales.filter((scale) => scale.teachingLevelIds.includes(levelId))
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end">
        <CreateRatingScaleDialog academicPeriodId={academicPeriodId} />
      </div>

      <DataTable
        table={table}
        isPending={isPending}
        isError={isError}
        onRetry={refetch}
        emptyMessage="Sin niveles de enseñanza."
        errorMessage="Ocurrió un error al cargar las escalas."
        renderSubRow={(row) => {
          const level = row.original as TeachingLevel
          if (expandedId !== level.id) return null
          return <ScalesSubTable scales={scalesForLevel(level.id)} />
        }}
      />
    </div>
  )
}

function ScalesSubTable({ scales }: { scales: RatingScale[] }) {
  if (scales.length === 0) {
    return (
      <div className="-m-4 bg-background p-4">
        <p className="text-muted-foreground px-1 py-2 text-sm">
          Sin escalas para este nivel.
        </p>
      </div>
    )
  }

  return (
    <div className="-m-4 bg-background p-4">
      <div className="overflow-x-auto rounded-md border">
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
          </TableRow>
        </TableHeader>
        <TableBody>
          {scales.map((scale) => (
            <TableRow key={scale.codigo}>
              <TableCell className="font-medium">{scale.nombre}</TableCell>
              <TableCell>{scale.abreviacion}</TableCell>
              <TableCell>{scale.notaMaxima}</TableCell>
              <TableCell>{scale.notaMinima}</TableCell>
              <TableCell>{scale.notaEquivalente}</TableCell>
              <TableCell>
                <Badge {...RATING_SCALE_TYPE_BADGE[scale.tipo]}>
                  {scale.tipo}
                </Badge>
              </TableCell>
              <TableCell className="text-lg">
                <RatingSymbolView value={scale.iconografia} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>
    </div>
  )
}
