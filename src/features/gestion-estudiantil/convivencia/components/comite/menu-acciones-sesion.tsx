import { EyeIcon, PencilIcon } from "@/components/ui/icons"

import { AccionesFila } from "@/features/gestion-estudiantil/commons/components/acciones-fila"

export type AccionSesion = "ver" | "modificar"

/** Ver detalle y Modificar. */
export const ACCIONES_SESION = 2

interface Props {
  numero: string | number
  /** Sin permiso de escribir el Comité, Modificar queda deshabilitada: queda la consulta. */
  puedeModificar: boolean
  onAccion: (accion: AccionSesion) => void
}

/** Acciones de una sesión (G.2.COM.SES.2): Ver detalle y Modificar. */
export function MenuAccionesSesion({ numero, puedeModificar, onAccion }: Props) {
  return (
    <AccionesFila
      etiqueta={`Acciones de la sesión ${numero}`}
      acciones={[
        { id: "ver", label: "Ver detalle", icon: <EyeIcon />, onSelect: () => onAccion("ver") },
        { id: "modificar", label: "Modificar", icon: <PencilIcon />, disabled: !puedeModificar, onSelect: () => onAccion("modificar") },
      ]}
    />
  )
}
