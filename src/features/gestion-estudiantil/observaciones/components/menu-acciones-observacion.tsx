import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DotsThreeVerticalIcon, EyeIcon, PencilIcon, ProhibitIcon } from "@/components/ui/icons"

import type { AccionesObservacion } from "@/features/gestion-estudiantil/observaciones/api/ui-mappings"
import type { DialogoObservacion } from "@/features/gestion-estudiantil/observaciones/components/dialogos/use-dialogos-observaciones"

interface Props {
  /** Para el nombre accesible del botón. */
  descripcion: string
  acciones: AccionesObservacion
  onAccion: (accion: DialogoObservacion) => void
}

/**
 * Menú ⋮ de la observación (G.7.LIS.2): Ver detalle, Modificar y Anular siempre a la vista; las que la
 * bandera del backend no permite van deshabilitadas.
 */
export function MenuAccionesObservacion({ descripcion, acciones, onAccion }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" color="neutral" size="icon-sm" aria-label={`Acciones de la observación ${descripcion}`} />}
      >
        <DotsThreeVerticalIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuItem disabled={!acciones.verDetalle} onClick={() => onAccion("ver")}>
            <EyeIcon />
            Ver detalle
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!acciones.modificar} onClick={() => onAccion("modificar")}>
            <PencilIcon />
            Modificar
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!acciones.anular} onClick={() => onAccion("anular")}>
            <ProhibitIcon />
            Anular
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
