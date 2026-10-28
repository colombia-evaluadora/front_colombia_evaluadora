"use no memo"

import type { ColumnDef } from "@tanstack/react-table"

import { DataTableColumnHeader } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PencilIcon } from "@/components/ui/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { ConfirmRemoveButton } from "@/components/confirm-remove-button"

import type { RatingScale } from "@/features/establishment/academic-period/api/types/rating-scales"
import { RATING_SCALE_TYPE_BADGE } from "@/features/establishment/academic-period/api/ui-mappings"
import { RatingSymbolView } from "@/features/establishment/academic-period/components/fields/rating-symbol"
import { formatGrade } from "@/features/establishment/academic-period/utils/rating-scale-coverage"

// Mapa de calor de la escala, de rojo (nota más baja) a verde (más alta). La misma tinta pinta la barra de cobertura y la abreviación.
export function heatColor(position: number): string {
  const t = Math.min(1, Math.max(0, position))
  // Tono 4 (rojo) → 40 (ámbar) → 145 (verde); un poco más oscuro en el medio
  // para que el texto blanco se siga leyendo sobre amarillo.
  const hue = 4 + t * 141
  const light = 46 - Math.sin(t * Math.PI) * 8
  return `hsl(${hue.toFixed(0)} 68% ${light.toFixed(0)}%)`
}

// Versión pastel del mismo tono para la barra de cobertura: fondo claro y
// texto oscuro del mismo color, para que se lea sin texto blanco.
export function heatPastel(position: number): { background: string; color: string } {
  const hue = (4 + Math.min(1, Math.max(0, position)) * 141).toFixed(0)
  return { background: `hsl(${hue} 75% 88%)`, color: `hsl(${hue} 60% 28%)` }
}

// Lo que cabe en el círculo: la primera letra y la primera consonante que le
// sigue, máximo dos ("SUP" → "SP", "BS" → "BS", "A" → "A"). El tooltip
// muestra la abreviación completa.
export function shortAbbreviation(abreviacion: string): string {
  const letters = abreviacion.trim().toUpperCase()
  const consonant = [...letters.slice(1)].find((c) => /[A-ZÑ]/.test(c) && !/[AEIOUÁÉÍÓÚÜ]/.test(c))
  return letters.charAt(0) + (consonant ?? "")
}

export function isFailingScale(scale: RatingScale): boolean {
  return (scale.tipoName ?? scale.tipo).toLowerCase().startsWith("debil")
}

// Color de cada valoración según su lugar en la escala: la más baja en rojo,
// la más alta en verde y las del medio repartidas parejo entre ambos. Por
// posición numérica un tramo largo como "Bajo" (0 a 5,9) quedaba ocre.
export function getScaleColors(scales: RatingScale[]): Map<number, string> {
  const sorted = [...scales].sort((x, y) => x.notaMinima - y.notaMinima)
  const last = Math.max(1, sorted.length - 1)
  return new Map(sorted.map((s, i) => [s.codigo, heatColor(sorted.length === 1 ? 1 : i / last)]))
}

interface CreateRatingScaleColumnsOptions {
  colors: Map<number, string>
  onEdit: (scale: RatingScale) => void
  onDelete: (scale: RatingScale) => Promise<boolean>
}

const gradeCell = (value: number) => (
  <span className="block text-center tabular-nums">{formatGrade(value)}</span>
)

export function createRatingScaleColumns({
  colors,
  onEdit,
  onDelete,
}: CreateRatingScaleColumnsOptions): ColumnDef<RatingScale>[] {
  return [
    {
      id: "nombre",
      accessorKey: "nombre",
      meta: { label: "Nombre" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
      cell: ({ row }) => <span>{row.original.nombre}</span>,
    },
    {
      id: "abreviacion",
      accessorKey: "abreviacion",
      meta: { label: "Abreviación" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Abreviación" />,
      cell: ({ row }) => {
        return (
          <span
            className="inline-flex size-8 items-center justify-center rounded-full text-sm font-medium text-white"
            style={{ backgroundColor: colors.get(row.original.codigo) }}
            title={row.original.abreviacion}
          >
            {shortAbbreviation(row.original.abreviacion)}
          </span>
        )
      },
    },
    {
      id: "tipo",
      accessorKey: "tipoName",
      meta: { label: "Tipo" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo" />,
      cell: ({ row }) => {
        const label = row.original.tipoName ?? row.original.tipo
        return (
          <Badge {...RATING_SCALE_TYPE_BADGE[label]} className="border border-current/30">
            <span aria-hidden className="size-1.5 rounded-full bg-current" />
            {label}
          </Badge>
        )
      },
    },
    {
      id: "iconografia",
      accessorKey: "iconografia",
      meta: { label: "Ícono" },
      header: () => <span>Ícono</span>,
      cell: ({ row }) => (
        <RatingSymbolView value={row.original.iconografia} label={row.original.nombre} className="text-xl" />
      ),
      enableSorting: false,
    },
    {
      id: "notaMinima",
      accessorKey: "notaMinima",
      meta: { label: "Nota mínima" },
      header: () => <span className="block text-center">Nota mínima</span>,
      cell: ({ row }) => gradeCell(row.original.notaMinima),
    },
    {
      id: "notaMaxima",
      accessorKey: "notaMaxima",
      meta: { label: "Nota máxima" },
      header: () => <span className="block text-center">Nota máxima</span>,
      cell: ({ row }) => gradeCell(row.original.notaMaxima),
    },
    {
      id: "notaEquivalente",
      accessorKey: "notaEquivalente",
      meta: { label: "Nota equivalente" },
      header: () => <span className="block text-center">Nota equivalente</span>,
      cell: ({ row }) => gradeCell(row.original.notaEquivalente),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  color="neutral"
                  size="icon-sm"
                  onClick={() => onEdit(row.original)}
                />
              }
            >
              <span className="sr-only">Modificar {row.original.nombre}</span>
              <PencilIcon />
            </TooltipTrigger>
            <TooltipContent>Modificar</TooltipContent>
          </Tooltip>
          <ConfirmRemoveButton
            label={`Eliminar ${row.original.nombre}`}
            title={`Eliminar ${row.original.nombre}`}
            description={`Se eliminará la valoración ${row.original.nombre} de esta escala.`}
            onConfirm={() => onDelete(row.original)}
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
      size: 96,
    },
  ]
}
