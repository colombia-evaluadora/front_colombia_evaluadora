import {
  CalendarBlankIcon,
  CheckCircleIcon,
  ClipboardAddIcon,
  FilePdfIcon,
  PencilIcon,
  ProhibitIcon,
} from "@/components/ui/icons"

import type { AccionesCitacion } from "@/features/gestion-estudiantil/citaciones/api/ui-mappings"
import { AccionesFila } from "@/features/gestion-estudiantil/commons/components/acciones-fila"

export type AccionCitacion = "programar" | "reprogramar" | "cancelar" | "asistencia" | "compromiso" | "documento"

/** Programar, Reprogramar, Cancelar, Registrar asistencia, Crear compromiso y Descargar citación. */
export const ACCIONES_CITACION = 6

interface Props {
  /** Para el nombre accesible del botón. */
  estudiante: string
  acciones: AccionesCitacion
  /** «Descargar citación» solo exige poder ver. */
  puedeVer: boolean
  onAccion: (accion: AccionCitacion) => void
}

/**
 * Acciones de la citación (G.3.CIT.1): todas a la vista; las que el estado (§12.4) o el permiso no
 * permiten van deshabilitadas, como en Procesos disciplinarios.
 */
export function MenuAccionesCitacion({ estudiante, acciones, puedeVer, onAccion }: Props) {
  return (
    <AccionesFila
      etiqueta={`Acciones de la citación de ${estudiante}`}
      acciones={[
        { id: "programar", label: "Programar", icon: <CalendarBlankIcon />, disabled: !acciones.programar, onSelect: () => onAccion("programar") },
        { id: "reprogramar", label: "Reprogramar", icon: <PencilIcon />, disabled: !acciones.reprogramar, onSelect: () => onAccion("reprogramar") },
        { id: "cancelar", label: "Cancelar", icon: <ProhibitIcon />, disabled: !acciones.cancelar, onSelect: () => onAccion("cancelar") },
        {
          id: "asistencia",
          label: "Registrar asistencia",
          icon: <CheckCircleIcon />,
          disabled: !acciones.asistencia,
          onSelect: () => onAccion("asistencia"),
        },
        {
          id: "compromiso",
          label: "Crear compromiso",
          icon: <ClipboardAddIcon />,
          disabled: !acciones.crearCompromiso,
          onSelect: () => onAccion("compromiso"),
        },
        {
          id: "documento",
          label: "Descargar citación",
          icon: <FilePdfIcon />,
          separada: true,
          disabled: !puedeVer,
          onSelect: () => onAccion("documento"),
        },
      ]}
    />
  )
}
