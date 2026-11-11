import { CheckCircleIcon, EyeIcon, PencilIcon } from "@/components/ui/icons"

import type { AccionesCompromiso } from "@/features/gestion-estudiantil/citaciones/api/ui-mappings"
import { AccionesFila } from "@/features/gestion-estudiantil/commons/components/acciones-fila"

export type AccionCompromiso = "ver" | "aceptacion" | "resultado"

/** Ver detalle, Registrar aceptación presencial y Registrar resultado. */
export const ACCIONES_COMPROMISO = 3

interface Props {
  estudiante: string
  acciones: AccionesCompromiso
  onAccion: (accion: AccionCompromiso) => void
}

/** Acciones del compromiso (G.3.CMP.1): Ver detalle, Registrar aceptación presencial y Registrar resultado. */
export function MenuAccionesCompromiso({ estudiante, acciones, onAccion }: Props) {
  return (
    <AccionesFila
      etiqueta={`Acciones del compromiso de ${estudiante}`}
      acciones={[
        { id: "ver", label: "Ver detalle", icon: <EyeIcon />, disabled: !acciones.verDetalle, onSelect: () => onAccion("ver") },
        {
          id: "aceptacion",
          label: "Registrar aceptación presencial",
          icon: <PencilIcon />,
          disabled: !acciones.aceptacionPresencial,
          onSelect: () => onAccion("aceptacion"),
        },
        {
          id: "resultado",
          label: "Registrar resultado",
          icon: <CheckCircleIcon />,
          disabled: !acciones.registrarResultado,
          onSelect: () => onAccion("resultado"),
        },
      ]}
    />
  )
}
