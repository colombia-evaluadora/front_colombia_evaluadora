import type { ReactNode } from "react"

import { ConfirmRemoveButton } from "@/components/confirm-remove-button"
import { Button } from "@/components/ui/button"
import { CheckIcon, PencilIcon, PlusIcon, XIcon } from "@/components/ui/icons"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

/** Marco común de las dos tablas: título, botón de alta, cabecera y vacío. */
export function TablaParametros({
  titulo,
  agregarLabel,
  columnas,
  vacio,
  puedeAgregar,
  onAgregar,
  onSubmit,
  children,
}: {
  titulo: string
  agregarLabel: string
  columnas: ReactNode
  vacio: string | null
  puedeAgregar: boolean
  onAgregar: () => void
  onSubmit: (e: React.FormEvent) => void
  children: ReactNode
}) {
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
          <PlusIcon />
          {agregarLabel}
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            {columnas}
            <TableHead className="w-24">
              <span className="sr-only">Acciones</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {children}
          {vacio && (
            <TableRow>
              <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                {vacio}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
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
        <Button
          key="guardar"
          type="submit"
          variant="ghost"
          size="icon-sm"
          disabled={guardando}
          aria-label={`Guardar ${etiqueta}`}
        >
          <CheckIcon className="text-green" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={guardando}
          aria-label="Cancelar"
          onClick={onCancelar}
        >
          <XIcon />
        </Button>
      </div>
    )
  }
  return (
    <div key="leyendo" className="flex justify-end">
      <Button
        key="modificar"
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled={!puedeEditar}
        aria-label={`Modificar ${etiqueta}`}
        onClick={onModificar}
      >
        <PencilIcon />
      </Button>
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
