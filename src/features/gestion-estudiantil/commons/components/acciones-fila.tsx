import { Fragment, type ReactNode } from "react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DotsThreeVerticalIcon } from "@/components/ui/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

import { MAX_ACCIONES_VISIBLES } from "@/features/gestion-estudiantil/commons/utils/acciones-fila"

/** Una acción de la fila. Se ve siempre; la que no aplica va `disabled`, no oculta. */
export interface AccionFila {
  id: string
  label: string
  icon: ReactNode
  onSelect: () => void
  disabled?: boolean
  /** En el menú ⋮, separador antes de esta acción (p. ej. los documentos). */
  separada?: boolean
}

interface Props {
  /** Nombre accesible del ⋮ («Acciones de la observación …»); cada icono usa su `label`. */
  etiqueta: string
  acciones: AccionFila[]
  /**
   * `fila` (por defecto): iconos en el hover de la fila, el sobrante en ⋮.
   * `menu`: todo en un ⋮, para encabezados de detalle donde no hay fila.
   */
  modo?: "fila" | "menu"
  /** Contenido extra al final del ⋮ (p. ej. documentos del encabezado). */
  extra?: ReactNode
}

/**
 * Acciones de una fila de Gestión Estudiantil, como en Matrícula: los iconos aparecen al pasar sobre la
 * fila (el overlay de `DataTable`). Hasta 6 acciones van todas a la vista; desde 7, las 6 primeras como
 * iconos y el resto en un menú ⋮.
 */
export function AccionesFila({ etiqueta, acciones, modo = "fila", extra }: Props) {
  if (modo === "menu") return <MenuAcciones etiqueta={etiqueta} acciones={acciones} extra={extra} />

  const desborda = acciones.length > MAX_ACCIONES_VISIBLES
  const visibles = desborda ? acciones.slice(0, MAX_ACCIONES_VISIBLES) : acciones
  const resto = desborda ? acciones.slice(MAX_ACCIONES_VISIBLES) : []

  return (
    <div className="flex items-center justify-end gap-1">
      {visibles.map((a) => (
        <Tooltip key={a.id}>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                color="neutral"
                size="icon-sm"
                aria-label={a.label}
                disabled={a.disabled}
                onClick={a.onSelect}
              />
            }
          >
            {a.icon}
          </TooltipTrigger>
          <TooltipContent>{a.label}</TooltipContent>
        </Tooltip>
      ))}
      {(resto.length > 0 || extra) && <MenuAcciones etiqueta={etiqueta} acciones={resto} extra={extra} />}
    </div>
  )
}

function MenuAcciones({ etiqueta, acciones, extra }: { etiqueta: string; acciones: AccionFila[]; extra?: ReactNode }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" color="neutral" size="icon-sm" aria-label={etiqueta} />}>
        <DotsThreeVerticalIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          {acciones.map((a, i) => (
            <Fragment key={a.id}>
              {a.separada && i > 0 && <DropdownMenuSeparator />}
              <DropdownMenuItem disabled={a.disabled} onClick={a.onSelect}>
                {a.icon}
                {a.label}
              </DropdownMenuItem>
            </Fragment>
          ))}
        </DropdownMenuGroup>
        {extra}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
