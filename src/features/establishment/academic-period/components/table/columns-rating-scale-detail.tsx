import type { ColumnDef } from "@tanstack/react-table"
import { CheckIcon, PencilIcon, SpinnerIcon, XIcon } from "@/components/ui/icons"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Checkbox } from "@/components/ui/checkbox"
import { DataTableColumnHeader } from "@/components/data-table"
import { Input } from "@/components/ui/input"
import {
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
  ComboboxGroup,
} from "@/components/ui/combobox"

import { RATING_SCALE_TYPE_BADGE } from "@/features/establishment/academic-period/api/ui-mappings"
import {
  bandaIdForLevel,
  type RatingScale,
  type RatingScaleType,
  type RatingScaleTypeOption,
  type RatingSymbol,
} from "@/features/establishment/academic-period/api/types/rating-scales"
import type { GradingRange } from "@/features/establishment/academic-period/components/grading-range"
import {
  RatingSymbolSelect,
  RatingSymbolView,
} from "@/features/establishment/academic-period/components/rating-symbol"
import { DeleteRatingScaleDialog } from "@/features/establishment/academic-period/components/dialogs/dialog-delete-rating-scale"

/** Los campos que la fila deja editar en línea. */
export type EditableScale = Pick<
  RatingScale,
  | "nombre"
  | "abreviacion"
  | "notaMaxima"
  | "notaMinima"
  | "notaEquivalente"
  | "tipo"
  | "iconografia"
>

export function toScaleDraft(scale: RatingScale): EditableScale {
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

interface CreateColumnsOptions {
  range: GradingRange
  symbols: RatingSymbol[]
  tipoOptions: RatingScaleTypeOption[]
  /** Nivel de enseñanza de esta subtabla — resuelve el PK de banda correcto
   *  para acciones (eliminar) cuando la fila viene de una escala agrupada
   *  entre varios niveles (ver `bandaIdForLevel`). */
  levelId: number
  /** Código de la escala en edición, o `null` si no hay ninguna. */
  editingCodigo: number | null
  draft: EditableScale | null
  patchDraft: (patch: Partial<EditableScale>) => void
  onStartEdit: (scale: RatingScale) => void
  onSave: (scale: RatingScale) => void
  onCancel: () => void
  isSaving: boolean
}

/** `NaN` es lo que deja un input numérico vacío; no debe llegar al `value`. */
function numberValue(n: number): number | "" {
  return Number.isNaN(n) ? "" : n
}

export function createRatingScaleDetailColumns({
  range,
  symbols,
  tipoOptions,
  levelId,
  editingCodigo,
  draft,
  patchDraft,
  onStartEdit,
  onSave,
  onCancel,
  isSaving,
}: CreateColumnsOptions): ColumnDef<RatingScale>[] {
  const isEditing = (scale: RatingScale) => editingCodigo === scale.codigo && draft !== null

  /** Las tres notas comparten input, rango y ancho: solo cambia el campo. */
  function gradeColumn(
    id: "notaMaxima" | "notaMinima" | "notaEquivalente",
    title: string,
  ): ColumnDef<RatingScale> {
    return {
      id,
      accessorKey: id,
      meta: { label: title },
      header: ({ column }) => <DataTableColumnHeader column={column} title={title} />,
      cell: ({ row }) => {
        const scale = row.original
        if (!isEditing(scale)) return <span className="tabular-nums">{scale[id]}</span>
        return (
          <Input
            aria-label={title}
            type="number"
            step="0.1"
            min={range.min}
            max={range.max}
            value={numberValue(draft![id])}
            onKeyDown={(e) => {
              if (["-", "+", "e", "E"].includes(e.key)) e.preventDefault()
            }}
            onChange={(e) => {
              const value = e.target.valueAsNumber
              if (e.target.value === "" || !Number.isNaN(value)) {
                patchDraft({ [id]: value })
              }
            }}
            className="w-20"
          />
        )
      },
      enableHiding: false,
    }
  }

  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          aria-label="Seleccionar página"
          className="translate-y-0.5"
          checked={table.getIsAllPageRowsSelected()}
          indeterminate={!table.getIsAllPageRowsSelected() && table.getIsSomePageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          aria-label={`Seleccionar ${row.original.nombre}`}
          className="translate-y-0.5"
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 32,
    },
    {
      id: "nombre",
      accessorKey: "nombre",
      meta: { label: "Nombre" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
      cell: ({ row }) => {
        const scale = row.original
        if (!isEditing(scale)) return <span className="font-medium">{scale.nombre}</span>
        return (
          <Input
            aria-label="Nombre"
            placeholder="Agregar"
            maxLength={130}
            value={draft!.nombre}
            onChange={(e) => patchDraft({ nombre: e.target.value })}
            className="min-w-32"
          />
        )
      },
      enableHiding: false,
    },
    {
      id: "abreviacion",
      accessorKey: "abreviacion",
      meta: { label: "Abreviación" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Abreviación" />,
      cell: ({ row }) => {
        const scale = row.original
        if (!isEditing(scale)) return scale.abreviacion
        return (
          <Input
            aria-label="Abreviación"
            placeholder="Agregar"
            maxLength={30}
            value={draft!.abreviacion}
            onChange={(e) => patchDraft({ abreviacion: e.target.value })}
            className="min-w-24"
          />
        )
      },
      enableHiding: false,
    },
    gradeColumn("notaMaxima", "Nota máximo"),
    gradeColumn("notaMinima", "Nota mínimo"),
    gradeColumn("notaEquivalente", "Nota equivalente"),
    {
      id: "tipo",
      accessorKey: "tipo",
      meta: { label: "Tipo" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo" />,
      cell: ({ row }) => {
        const scale = row.original
        if (!isEditing(scale)) {
          const label = scale.tipoName ?? scale.tipo
          return <Badge {...RATING_SCALE_TYPE_BADGE[label]}>{label}</Badge>
        }
        return (
          <ComboboxField
            value={draft!.tipo}
            onValueChange={(value) => value && patchDraft({ tipo: value as RatingScaleType })}
          >
            <ComboboxFieldTrigger aria-label="Tipo" className="min-w-32">
              <ComboboxFieldValue>
                {(value) => tipoOptions.find((o) => o.key === value)?.label ?? "Seleccionar"}
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
        )
      },
      enableHiding: false,
    },
    {
      id: "iconografia",
      accessorKey: "iconografia",
      meta: { label: "Iconografía" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Iconografía" />,
      cell: ({ row }) => {
        const scale = row.original
        if (!isEditing(scale)) {
          return <RatingSymbolView value={scale.iconografia} className="text-lg" />
        }
        return (
          <RatingSymbolSelect
            symbols={symbols}
            value={draft!.iconografia}
            onChange={(valor) => patchDraft({ iconografia: valor })}
          />
        )
      },
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) => {
        const scale = row.original

        // En edición los botones son guardar/cancelar; `DataTable` mantiene el
        // overlay visible para esta fila (`isRowActive`), así que no dependen
        // del hover.
        if (isEditing(scale)) {
          return (
            <>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      type="button"
                      color="primary"
                      size="icon-sm"
                      aria-label="Guardar cambios"
                      disabled={isSaving}
                      aria-busy={isSaving}
                      onClick={() => onSave(scale)}
                    />
                  }
                >
                  {isSaving ? <SpinnerIcon className="animate-spin" /> : <CheckIcon />}
                </TooltipTrigger>
                <TooltipContent>Guardar cambios</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      type="button"
                      variant="fill"
                      color="neutral"
                      size="icon-sm"
                      aria-label="Cancelar edición"
                      disabled={isSaving}
                      onClick={onCancel}
                    />
                  }
                >
                  <XIcon />
                </TooltipTrigger>
                <TooltipContent>Cancelar edición</TooltipContent>
              </Tooltip>
            </>
          )
        }

        return (
          <>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    color="neutral"
                    size="icon-sm"
                    aria-label="Editar escala de valoración"
                    disabled={editingCodigo !== null}
                    onClick={() => onStartEdit(scale)}
                  />
                }
              >
                <PencilIcon />
              </TooltipTrigger>
              <TooltipContent>Editar escala de valoración</TooltipContent>
            </Tooltip>
            <DeleteRatingScaleDialog scale={{ ...scale, codigo: bandaIdForLevel(scale, levelId) }} />
          </>
        )
      },
      enableSorting: false,
      enableHiding: false,
      // Dos botones icon (`size-8`) + gap + el `px-2` del overlay.
      size: 96,
    },
  ]
}
