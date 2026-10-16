import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { CheckIcon, PencilIcon, PlusIcon, XIcon } from "@/components/ui/icons"
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
}: {
  editando: boolean
  puedeEditar: boolean
  guardando: boolean
  etiqueta: string
  onModificar: () => void
  onCancelar: () => void
}) {
  if (editando) {
    return (
      <div className="flex justify-end gap-1">
        <Button
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
    <div className="flex justify-end">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled={!puedeEditar}
        aria-label={`Modificar ${etiqueta}`}
        onClick={onModificar}
      >
        <PencilIcon />
      </Button>
    </div>
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
