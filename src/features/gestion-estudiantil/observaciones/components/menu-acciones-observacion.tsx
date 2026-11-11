import { EyeIcon, PencilIcon, ProhibitIcon } from "@/components/ui/icons"

import { AccionesFila } from "@/features/gestion-estudiantil/commons/components/acciones-fila"
import type { AccionesObservacion } from "@/features/gestion-estudiantil/observaciones/api/ui-mappings"
import type { DialogoObservacion } from "@/features/gestion-estudiantil/observaciones/components/dialogos/use-dialogos-observaciones"

/** Ver detalle, Modificar y Anular: cabe entero como iconos en el hover de la fila. */
export const ACCIONES_OBSERVACION = 3

interface Props {
  /** Para el nombre accesible del botón. */
  descripcion: string
  acciones: AccionesObservacion
  onAccion: (accion: DialogoObservacion) => void
}

/**
 * Acciones de la observación (G.7.LIS.2): Ver detalle, Modificar y Anular siempre a la vista; las que la
 * bandera del backend no permite van deshabilitadas.
 */
export function MenuAccionesObservacion({ descripcion, acciones, onAccion }: Props) {
  return (
    <AccionesFila
      etiqueta={`Acciones de la observación ${descripcion}`}
      acciones={[
        { id: "ver", label: "Ver detalle", icon: <EyeIcon />, disabled: !acciones.verDetalle, onSelect: () => onAccion("ver") },
        { id: "modificar", label: "Modificar", icon: <PencilIcon />, disabled: !acciones.modificar, onSelect: () => onAccion("modificar") },
        { id: "anular", label: "Anular", icon: <ProhibitIcon />, disabled: !acciones.anular, onSelect: () => onAccion("anular") },
      ]}
    />
  )
}
