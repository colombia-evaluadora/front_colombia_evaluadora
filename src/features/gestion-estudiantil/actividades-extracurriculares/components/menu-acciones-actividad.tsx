import { CheckCircleIcon, EyeIcon, PencilIcon, ProhibitIcon } from "@/components/ui/icons"

import { AccionesFila, type AccionFila } from "@/features/gestion-estudiantil/commons/components/acciones-fila"
import type { ActividadRow } from "@/features/gestion-estudiantil/actividades-extracurriculares/api/types"

export type AccionActividad = "ver" | "modificar" | "estado"

/** Las tres acciones de la fila (§6.1). */
export const ACCIONES_ACTIVIDAD = 3

interface Props {
  fila: ActividadRow
  onAccion: (accion: AccionActividad) => void
}

/**
 * Acciones de una fila del listado: Ver detalle, Modificar e Inactivar/Activar, estas dos guiadas por
 * `puede_editar` (brecha B2: el backend solo da Inactivar a Supervisor y Administrador).
 */
export function MenuAccionesActividad({ fila: f, onAccion }: Props) {
  const acciones: AccionFila[] = [
    { id: "ver", label: "Ver detalle", icon: <EyeIcon />, onSelect: () => onAccion("ver") },
    {
      id: "modificar",
      label: "Modificar",
      icon: <PencilIcon />,
      disabled: !f.puede_editar,
      onSelect: () => onAccion("modificar"),
    },
    {
      id: "estado",
      label: f.esta_activa ? "Inactivar" : "Activar",
      icon: f.esta_activa ? <ProhibitIcon /> : <CheckCircleIcon />,
      disabled: !f.puede_editar,
      onSelect: () => onAccion("estado"),
    },
  ]
  return <AccionesFila etiqueta={`Acciones de la actividad ${f.nombre}`} acciones={acciones} />
}
