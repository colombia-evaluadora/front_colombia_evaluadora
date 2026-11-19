import { EyeIcon, PencilIcon } from "@/components/ui/icons"

import { AccionesFila } from "@/features/gestion-estudiantil/commons/components/acciones-fila"
import type { CaracterizacionRow } from "@/features/gestion-estudiantil/prevencion/api/types"

export type AccionCaracterizacion = "ver" | "modificar"

/** Ver detalle y Modificar. */
export const ACCIONES_CARACTERIZACION = 2

interface Props {
  fila: CaracterizacionRow
  onAccion: (accion: AccionCaracterizacion) => void
}

/** Acciones de una fila (G.8.CAR.2): Modificar queda deshabilitada sin `puede_modificar` (p. ej. trabajo social). */
export function MenuAccionesCaracterizacion({ fila: f, onAccion }: Props) {
  return (
    <AccionesFila
      etiqueta={`Acciones de la caracterización de ${f.estudiante_nombre}`}
      acciones={[
        { id: "ver", label: "Ver detalle", icon: <EyeIcon />, onSelect: () => onAccion("ver") },
        {
          id: "modificar",
          label: "Modificar",
          icon: <PencilIcon />,
          disabled: !f.puede_modificar,
          onSelect: () => onAccion("modificar"),
        },
      ]}
    />
  )
}
