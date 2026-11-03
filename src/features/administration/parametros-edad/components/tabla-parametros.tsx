"use no memo"

import { useState } from "react"
import type { ColumnDef, SortingState } from "@tanstack/react-table"

import { DataTable } from "@/components/data-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CheckIcon, ControlPointIcon, PencilIcon, SpinnerIcon, XIcon } from "@/components/ui/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useDataTable } from "@/hooks/use-data-table"
import { cn } from "@/lib/utils"

/** Fila de la tabla: `fila` null es el alta que se está escribiendo. */
export interface FilaParametro<T> {
  id: string
  fila: T | null
}

/** Ancho de la columna de acciones: dos botones (✓ + ✕ al editar). */
export const ACCIONES_SIZE = 96

const sinCambio = () => {}

/**
 * Marco común de las tablas sobre `DataTable`. Son listas cortas (un registro
 * por grado o calendario), así que se muestran completas sin paginar. Sin
 * `agregarLabel` no hay botón de alta (los cortes por defecto son un solo registro).
 */
export function TablaParametros<T>({
  titulo,
  agregarLabel,
  columns,
  data,
  editandoId,
  emptyMessage,
  puedeAgregar,
  onAgregar,
  onSubmit,
  valorOrden,
}: {
  titulo: string
  agregarLabel?: string
  columns: ColumnDef<FilaParametro<T>>[]
  /** Filas en el orden de la lista de valores (el de por defecto). */
  data: FilaParametro<T>[]
  /** id de la fila en edición: deja fijos sus botones de guardar y cancelar. */
  editandoId: string | null
  emptyMessage: string
  puedeAgregar?: boolean
  onAgregar?: () => void
  onSubmit: (e: React.FormEvent) => void
  /** Valor por el que se ordena cada columna ordenable. */
  valorOrden: (fila: T, columna: string) => string | number
}) {
  // `useDataTable` ordena en manual: el orden se resuelve acá, en el navegador.
  const [sorting, setSorting] = useState<SortingState>([])
  const [orden] = sorting
  const nueva = data.filter((d) => d.fila === null)
  const guardadas = data.filter((d): d is { id: string; fila: T } => d.fila !== null)
  const ordenadas = orden
    ? [...guardadas].sort((a, b) => {
        const va = valorOrden(a.fila, orden.id)
        const vb = valorOrden(b.fila, orden.id)
        const r =
          typeof va === "number" && typeof vb === "number"
            ? va - vb
            : String(va).localeCompare(String(vb), "es", { numeric: true })
        return orden.desc ? -r : r
      })
    : guardadas

  const { table } = useDataTable({
    columns,
    // La fila de alta queda arriba con cualquier orden.
    data: [...nueva, ...ordenadas],
    pageCount: 1,
    getRowId: (row) => row.id,
    pageIndex: 0,
    pageSize: Math.max(data.length, 1),
    goToPage: sinCambio,
    setPageSize: sinCambio,
    sorting,
    setSorting,
  })

  return (
    <form onSubmit={onSubmit} aria-label={titulo} className="flex min-w-0 flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-base font-semibold">{titulo}</h2>
        {agregarLabel && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!puedeAgregar}
            onClick={onAgregar}
          >
            <ControlPointIcon data-icon="inline-start" />
            {agregarLabel}
          </Button>
        )}
      </div>
      <DataTable
        table={table}
        isPending={false}
        isError={false}
        onRetry={sinCambio}
        emptyMessage={emptyMessage}
        isRowActive={(row) => row.id === editandoId}
      />
    </form>
  )
}

/**
 * Acciones de la fila: Modificar, o Guardar/Cancelar mientras se edita. No hay
 * Eliminar: la vista solo modifica (Administración del Sistema, Sección 6.1).
 */
export function AccionesFila({
  editando,
  puedeEditar,
  guardando,
  etiqueta,
  onModificar,
  onCancelar,
}: {
  editando: boolean
  puedeEditar: boolean
  guardando: boolean
  etiqueta: string
  onModificar: () => void
  onCancelar: () => void
}) {
  // Keys distintas: si React reusara el botón de Modificar como submit, el mismo
  // clic que abre la edición enviaría el formulario.
  if (editando) {
    return (
      <div key="editando" className="flex justify-end gap-1">
        {/* Mismo estilo que la edición en fila de Escala de valoración. */}
        <Tooltip key="guardar">
          <TooltipTrigger
            render={
              <Button
                type="submit"
                color="primary"
                size="icon-sm"
                aria-label="Guardar cambios"
                disabled={guardando}
                aria-busy={guardando}
              />
            }
          >
            {guardando ? <SpinnerIcon className="animate-spin" /> : <CheckIcon />}
          </TooltipTrigger>
          <TooltipContent>Guardar cambios</TooltipContent>
        </Tooltip>
        <Tooltip key="cancelar">
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="fill"
                color="neutral"
                size="icon-sm"
                aria-label="Cancelar edición"
                disabled={guardando}
                onClick={onCancelar}
              />
            }
          >
            <XIcon />
          </TooltipTrigger>
          <TooltipContent>Cancelar edición</TooltipContent>
        </Tooltip>
      </div>
    )
  }
  return (
    <div key="leyendo" className="flex justify-end gap-1">
      <Tooltip key="modificar">
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              color="neutral"
              size="icon-sm"
              aria-label={`Modificar ${etiqueta}`}
              disabled={!puedeEditar}
              onClick={onModificar}
            />
          }
        >
          <PencilIcon />
        </TooltipTrigger>
        <TooltipContent>Modificar</TooltipContent>
      </Tooltip>
    </div>
  )
}

/** Selector de la fila en edición, con el mismo estilo que los de otras tablas. */
export function SelectFila({
  label,
  placeholder,
  opciones,
  value,
  onChange,
  className,
}: {
  label: string
  placeholder: string
  opciones: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
  className?: string
}) {
  return (
    <Select
      items={Object.fromEntries(opciones.map((o) => [o.value, o.label]))}
      value={value}
      onValueChange={(next) => onChange(String(next ?? ""))}
    >
      <SelectTrigger
        variant="outlined"
        size="sm"
        aria-label={label}
        className={cn("h-8 w-full max-w-56", className)}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {opciones.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/** Deja el signo menos inicial y hasta dos dígitos: los cortes son ±años. */
function toEnteroConSigno(value: string) {
  const negativo = value.trimStart().startsWith("-") || value.trimStart().startsWith("−")
  return (negativo ? "-" : "") + value.replace(/\D/g, "").slice(0, 2)
}

/** Input de un corte en la fila en edición. */
export function InputCorte({
  label,
  value,
  placeholder,
  invalido,
  autoFocus,
  onChange,
}: {
  label: string
  value: string
  placeholder?: string
  invalido: boolean
  autoFocus?: boolean
  onChange: (value: string) => void
}) {
  return (
    <Input
      inputMode="numeric"
      autoFocus={autoFocus}
      aria-label={label}
      aria-invalid={invalido}
      variant="outlined"
      size="sm"
      placeholder={placeholder}
      className="ml-auto h-8 w-16 text-right tabular-nums"
      value={value}
      onChange={(e) => onChange(toEnteroConSigno(e.target.value))}
    />
  )
}

/** Mensaje de validación bajo el campo en edición. */
export function ErrorCampo({ mensaje }: { mensaje: string | null }) {
  if (!mensaje) return null
  return (
    <span role="alert" className="text-xs text-red">
      {mensaje}
    </span>
  )
}
