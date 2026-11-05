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

// Mapa de calor de la escala, de rojo (nota más baja) a azul (más alta), con
// paradas en naranja, amarillo, verde y cian. La misma tinta pinta la barra de
// cobertura, la abreviación y el ícono SVG de la valoración.
const HEAT_STOPS: [number, number, number][] = [
  [228, 26, 28], // rojo
  [255, 127, 0], // naranja
  [255, 255, 33], // amarillo
  [77, 175, 74], // verde
  [65, 182, 196], // cian
  [34, 87, 139], // azul
]

function heatRgb(position: number): [number, number, number] {
  const t = Math.min(1, Math.max(0, position))
  const n = HEAT_STOPS.length - 1
  const i = Math.min(Math.floor(t * n), n - 1)
  const f = t * n - i
  const [a, b] = [HEAT_STOPS[i], HEAT_STOPS[i + 1]]
  return [0, 1, 2].map((k) => Math.round(a[k] + (b[k] - a[k]) * f)) as [number, number, number]
}

const rgb = ([r, g, b]: [number, number, number]) => `rgb(${r}, ${g}, ${b})`
const mix = (c: [number, number, number], with_: number, amount: number) =>
  c.map((v) => Math.round(v + (with_ - v) * amount)) as [number, number, number]

export function heatColor(position: number): string {
  return rgb(heatRgb(position))
}

// Texto que se lee sobre heatColor: el amarillo y el cian necesitan texto oscuro.
export function heatInk(position: number): string {
  const [r, g, b] = heatRgb(position)
  return 0.299 * r + 0.587 * g + 0.114 * b > 160 ? "rgb(33, 33, 33)" : "#fff"
}

// Versión pastel del mismo tono para la barra de cobertura: fondo claro y
// texto oscuro del mismo color, para que se lea sin texto blanco.
export function heatPastel(position: number): { background: string; color: string } {
  const c = heatRgb(position)
  return { background: rgb(mix(c, 255, 0.75)), color: rgb(mix(c, 0, 0.6)) }
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
export function getScalePositions(scales: RatingScale[]): Map<number, number> {
  const sorted = [...scales].sort((x, y) => x.notaMinima - y.notaMinima)
  const last = Math.max(1, sorted.length - 1)
  return new Map(sorted.map((s, i) => [s.codigo, sorted.length === 1 ? 0 : i / last]))
}

export function getScaleColors(scales: RatingScale[]): Map<number, string> {
  return new Map([...getScalePositions(scales)].map(([codigo, p]) => [codigo, heatColor(p)]))
}

// Color que tendría una valoración nueva (o editada) de Nota mínima `notaMinima`
// entre las demás del nivel: mismo reparto que getScaleColors.
export function heatColorFor(others: RatingScale[], notaMinima: number): string {
  const posicion = others.filter((s) => s.notaMinima < notaMinima).length
  return heatColor(others.length === 0 ? 0 : posicion / others.length)
}

interface CreateRatingScaleColumnsOptions {
  colors: Map<number, string>
  /** Texto legible sobre cada color (amarillo y cian van con texto oscuro). */
  inks: Map<number, string>
  onEdit: (scale: RatingScale) => void
  onDelete: (scale: RatingScale) => Promise<boolean>
}

const gradeCell = (value: number) => (
  <span className="block text-center tabular-nums">{formatGrade(value)}</span>
)

export function createRatingScaleColumns({
  colors,
  inks,
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
            className="inline-flex size-8 items-center justify-center rounded-full text-sm font-medium"
            style={{
              backgroundColor: colors.get(row.original.codigo),
              color: inks.get(row.original.codigo),
            }}
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
        <RatingSymbolView
          value={row.original.iconografia}
          label={row.original.nombre}
          color={colors.get(row.original.codigo)}
          className="text-xl"
        />
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
