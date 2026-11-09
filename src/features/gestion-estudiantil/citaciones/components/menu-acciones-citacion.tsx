import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  CalendarBlankIcon,
  CheckCircleIcon,
  ClipboardAddIcon,
  DotsThreeVerticalIcon,
  FilePdfIcon,
  PencilIcon,
  ProhibitIcon,
} from "@/components/ui/icons"

import type { AccionesCitacion } from "@/features/gestion-estudiantil/citaciones/api/ui-mappings"

export type AccionCitacion = "programar" | "reprogramar" | "cancelar" | "asistencia" | "compromiso" | "documento"

interface Props {
  /** Para el nombre accesible del botón. */
  estudiante: string
  acciones: AccionesCitacion
  /** «Ver citación PDF» solo exige poder ver. */
  puedeVer: boolean
  onAccion: (accion: AccionCitacion) => void
}

/**
 * Menú ⋮ de la citación (G.3.CIT.1): todas las acciones a la vista; las que el estado (§12.4) o el
 * permiso no permiten van deshabilitadas, como en Procesos disciplinarios.
 */
export function MenuAccionesCitacion({ estudiante, acciones, puedeVer, onAccion }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" color="neutral" size="icon-sm" aria-label={`Acciones de la citación de ${estudiante}`} />}
      >
        <DotsThreeVerticalIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem disabled={!acciones.programar} onClick={() => onAccion("programar")}>
          <CalendarBlankIcon />
          Programar
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!acciones.reprogramar} onClick={() => onAccion("reprogramar")}>
          <PencilIcon />
          Reprogramar
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!acciones.cancelar} onClick={() => onAccion("cancelar")}>
          <ProhibitIcon />
          Cancelar
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!acciones.asistencia} onClick={() => onAccion("asistencia")}>
          <CheckCircleIcon />
          Registrar asistencia
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!acciones.crearCompromiso} onClick={() => onAccion("compromiso")}>
          <ClipboardAddIcon />
          Crear compromiso
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={!puedeVer} onClick={() => onAccion("documento")}>
          <FilePdfIcon />
          Ver citación PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
