import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CheckCircleIcon, DotsThreeVerticalIcon, EyeIcon, PencilIcon } from "@/components/ui/icons"

import type { AccionesCompromiso } from "@/features/gestion-estudiantil/citaciones/api/ui-mappings"

export type AccionCompromiso = "ver" | "aceptacion" | "resultado"

interface Props {
  estudiante: string
  acciones: AccionesCompromiso
  onAccion: (accion: AccionCompromiso) => void
}

/** Menú ⋮ del compromiso (G.3.CMP.1): Ver detalle, Registrar aceptación presencial y Registrar resultado. */
export function MenuAccionesCompromiso({ estudiante, acciones, onAccion }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" color="neutral" size="icon-sm" aria-label={`Acciones del compromiso de ${estudiante}`} />}
      >
        <DotsThreeVerticalIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem disabled={!acciones.verDetalle} onClick={() => onAccion("ver")}>
          <EyeIcon />
          Ver detalle
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!acciones.aceptacionPresencial} onClick={() => onAccion("aceptacion")}>
          <PencilIcon />
          Registrar aceptación presencial
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!acciones.registrarResultado} onClick={() => onAccion("resultado")}>
          <CheckCircleIcon />
          Registrar resultado
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
