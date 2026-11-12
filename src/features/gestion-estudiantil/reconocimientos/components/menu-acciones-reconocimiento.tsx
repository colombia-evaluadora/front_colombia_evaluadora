import { EyeIcon, MedalIcon, PencilIcon, ProhibitIcon } from "@/components/ui/icons"

import { AccionesFila } from "@/features/gestion-estudiantil/commons/components/acciones-fila"
import type { AccionesReconocimiento } from "@/features/gestion-estudiantil/reconocimientos/api/ui-mappings"

export type AccionReconocimiento = "ver" | "modificar" | "anular" | "mencion"

/** Ver detalle, Modificar, Anular y Generar mención de honor. */
export const ACCIONES_RECONOCIMIENTO = 4

interface Props {
  /** Para el nombre accesible del botón. */
  estudiante: string
  acciones: AccionesReconocimiento
  onAccion: (accion: AccionReconocimiento) => void
}

/**
 * Acciones del reconocimiento (G.6.LIS.3): todas a la vista; las que la bandera del backend o el estado
 * no permiten van deshabilitadas.
 */
export function MenuAccionesReconocimiento({ estudiante, acciones, onAccion }: Props) {
  return (
    <AccionesFila
      etiqueta={`Acciones del reconocimiento de ${estudiante}`}
      acciones={[
        { id: "ver", label: "Ver detalle", icon: <EyeIcon />, disabled: !acciones.verDetalle, onSelect: () => onAccion("ver") },
        { id: "modificar", label: "Modificar", icon: <PencilIcon />, disabled: !acciones.modificar, onSelect: () => onAccion("modificar") },
        { id: "anular", label: "Anular", icon: <ProhibitIcon />, disabled: !acciones.anular, onSelect: () => onAccion("anular") },
        {
          id: "mencion",
          label: "Generar mención de honor",
          icon: <MedalIcon />,
          separada: true,
          disabled: !acciones.mencionHonor,
          onSelect: () => onAccion("mencion"),
        },
      ]}
    />
  )
}
