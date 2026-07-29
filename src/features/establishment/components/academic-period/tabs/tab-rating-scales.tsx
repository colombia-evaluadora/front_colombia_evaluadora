"use no memo"

import { useCallback, useMemo, useState } from "react"
import type { SortingState } from "@tanstack/react-table"
import { CheckIcon, PencilIcon, SpinnerIcon, XIcon } from "@/components/ui/icons"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ExpandableDataTable } from "../table/expandable-data-table"
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
import { useRatingSymbolsQuery } from "../../../api/query/use-rating-symbols-query"
import { useTeachingLevelsQuery } from "../../../api/query/use-teaching-levels-query"
import { useRatingScaleTypesQuery } from "../../../api/query/use-rating-scale-types-query"
import { useUpdateRatingScale } from "../../../api/mutations/update-rating-scale"
import { RATING_SCALE_TYPE_BADGE } from "../../../api/ui-mappings"
import type {
  RatingScale,
  RatingScaleType,
  TeachingLevel,
} from "../../../api/types/academic-period/rating-scales"
import { CreateRatingScaleDialog } from "../dialogs/dialog-create-rating-scale"
import { DeleteRatingScaleDialog } from "../dialogs/dialog-delete-rating-scale"
import { ExportRatingScalesDialog } from "../dialogs/dialog-export-rating-scales"
import { RatingSymbolSelect, RatingSymbolView } from "../rating-symbol"
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
      <div className="flex items-center justify-end gap-2">
        <CreateRatingScaleDialog academicPeriodId={academicPeriodId} />
        <ExportRatingScalesDialog filters={{}} />
      </div>

      <ExpandableDataTable
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

function ScalesSubTable({ scales }: { scales: RatingScale[] }) {
  const { data: symbols = [] } = useRatingSymbolsQuery()
  const { data: tipoOptions = [] } = useRatingScaleTypesQuery()
  const [editingCodigo, setEditingCodigo] = useState<number | null>(null)
  const [draft, setDraft] = useState<EditableScale | null>(null)

  const updateMutation = useUpdateRatingScale({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          toast.error(result.message)
          return
        }
        toast.success(result.message)
        setEditingCodigo(null)
        setDraft(null)
      },
    },
  })

  function startEdit(scale: RatingScale) {
    setEditingCodigo(scale.codigo)
    setDraft(toDraft(scale))
  }

  function cancelEdit() {
    setEditingCodigo(null)
    setDraft(null)
  }

  function patchDraft(patch: Partial<EditableScale>) {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev))
  }

  function saveEdit(scale: RatingScale) {
    if (!draft) return
    updateMutation.mutate({ codigo: scale.codigo, values: { ...scale, ...draft } })
  }

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
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {scales.map((scale) => {
              const isEditing = editingCodigo === scale.codigo

              if (isEditing && draft) {
                return (
                  <TableRow key={scale.codigo}>
                    <TableCell>
                      <Input
                        aria-label="Nombre"
                        value={draft.nombre}
                        onChange={(e) => patchDraft({ nombre: e.target.value })}
                        className="min-w-32"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        aria-label="Abreviación"
                        value={draft.abreviacion}
                        onChange={(e) => patchDraft({ abreviacion: e.target.value })}
                        className="min-w-24"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        aria-label="Nota máximo"
                        type="number"
                        step="0.1"
                        value={Number.isNaN(draft.notaMaxima) ? "" : draft.notaMaxima}
                        onChange={(e) => patchDraft({ notaMaxima: e.target.valueAsNumber })}
                        className="w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        aria-label="Nota mínimo"
                        type="number"
                        step="0.1"
                        value={Number.isNaN(draft.notaMinima) ? "" : draft.notaMinima}
                        onChange={(e) => patchDraft({ notaMinima: e.target.valueAsNumber })}
                        className="w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        aria-label="Nota equivalente"
                        type="number"
                        step="0.1"
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
                          <SelectValue />
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
                        variant="fill"
                        color="secondary"
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
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
