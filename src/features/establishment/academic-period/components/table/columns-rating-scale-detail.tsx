import type { ColumnDef } from "@tanstack/react-table"
import { CheckIcon, PencilIcon, SpinnerIcon, XIcon } from "@/components/ui/icons"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DataTableColumnHeader } from "@/components/data-table"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { RATING_SCALE_TYPE_BADGE } from "@/features/establishment/academic-period/api/ui-mappings"
import type {
  RatingScale,
  RatingScaleType,
  RatingScaleTypeOption,
  RatingSymbol,
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
            onChange={(e) => patchDraft({ [id]: e.target.valueAsNumber })}
            className="w-20"
          />
        )
      },
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
          <Select
            value={draft!.tipo}
            onValueChange={(value) => value && patchDraft({ tipo: value as RatingScaleType })}
          >
            <SelectTrigger aria-label="Tipo" className="min-w-32">
              <SelectValue>
                {(value) => tipoOptions.find((o) => o.key === value)?.label ?? "Seleccionar"}
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
        )
      },
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
              <Button
                type="button"
                color="primary"
                size="icon-sm"
                aria-label="Guardar cambios"
                disabled={isSaving}
                aria-busy={isSaving}
                onClick={() => onSave(scale)}
              >
                {isSaving ? <SpinnerIcon className="animate-spin" /> : <CheckIcon />}
              </Button>
              <Button
                type="button"
                variant="fill"
                color="neutral"
                size="icon-sm"
                aria-label="Cancelar edición"
                disabled={isSaving}
                onClick={onCancel}
              >
                <XIcon />
              </Button>
            </>
          )
        }

        return (
          <>
            <Button
              type="button"
              variant="ghost"
              color="neutral"
              size="icon-sm"
              aria-label="Editar escala de valoración"
              disabled={editingCodigo !== null}
              onClick={() => onStartEdit(scale)}
            >
              <PencilIcon />
            </Button>
            <DeleteRatingScaleDialog scale={scale} />
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
