import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DotsThreeVerticalIcon, EyeIcon, MedalIcon, PencilIcon, ProhibitIcon } from "@/components/ui/icons"

import type { AccionesReconocimiento } from "@/features/gestion-estudiantil/reconocimientos/api/ui-mappings"

export type AccionReconocimiento = "ver" | "modificar" | "anular" | "mencion"

interface Props {
  /** Para el nombre accesible del botón. */
  estudiante: string
  acciones: AccionesReconocimiento
  onAccion: (accion: AccionReconocimiento) => void
}

/**
 * Menú ⋮ del reconocimiento (G.6.LIS.3): todas las acciones a la vista; las que la bandera del backend
 * o el estado no permiten van deshabilitadas.
 */
export function MenuAccionesReconocimiento({ estudiante, acciones, onAccion }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" color="neutral" size="icon-sm" aria-label={`Acciones del reconocimiento de ${estudiante}`} />}
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
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem disabled={!acciones.mencionHonor} onClick={() => onAccion("mencion")}>
            <MedalIcon />
            Generar mención de honor
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
