"use no memo"

import type { ColumnDef } from "@tanstack/react-table"

import { ConfirmRemoveButton } from "@/components/confirm-remove-button"
import { DataTable } from "@/components/data-table"
import { Button } from "@/components/ui/button"
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

/** Ancho de la columna de acciones: dos botones (Modificar + Eliminar o ✓ + ✕). */
export const ACCIONES_SIZE = 96

const sinCambio = () => {}

/**
 * Marco común de las dos tablas sobre `DataTable`. Son listas cortas (un
 * registro por grado o calendario), así que se muestran completas sin paginar.
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
}: {
  titulo: string
  agregarLabel: string
  columns: ColumnDef<FilaParametro<T>>[]
  data: FilaParametro<T>[]
  /** id de la fila en edición: deja fijos sus botones de guardar y cancelar. */
  editandoId: string | null
  emptyMessage: string
  puedeAgregar: boolean
  onAgregar: () => void
  onSubmit: (e: React.FormEvent) => void
}) {
  const { table } = useDataTable({
    columns,
    data,
    pageCount: 1,
    getRowId: (row) => row.id,
    pageIndex: 0,
    pageSize: Math.max(data.length, 1),
    goToPage: sinCambio,
    setPageSize: sinCambio,
    sorting: [],
    setSorting: sinCambio,
  })

  return (
    <form onSubmit={onSubmit} aria-label={titulo} className="flex min-w-0 flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-base font-semibold">{titulo}</h2>
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

/** Acciones de la fila: Modificar, o Guardar/Cancelar mientras se edita. */
export function AccionesFila({
  editando,
  puedeEditar,
  guardando,
  etiqueta,
  onModificar,
  onCancelar,
  eliminar,
}: {
  editando: boolean
  puedeEditar: boolean
  guardando: boolean
  etiqueta: string
  onModificar: () => void
  onCancelar: () => void
  /** Solo en filas ya guardadas; sin él no se muestra el botón. */
  eliminar?: { puede: boolean; descripcion: string; onConfirm: () => Promise<boolean> }
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
      {eliminar && (
        <ConfirmRemoveButton
          key="eliminar"
          label={`Eliminar ${etiqueta}`}
          description={eliminar.descripcion}
          disabled={!eliminar.puede}
          onConfirm={eliminar.onConfirm}
        />
      )}
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

/** Mensaje de validación bajo el campo en edición. */
export function ErrorCampo({ mensaje }: { mensaje: string | null }) {
  if (!mensaje) return null
  return (
    <span role="alert" className="text-xs text-red">
      {mensaje}
    </span>
  )
}
