import { CheckCircleIcon, EyeIcon, PencilIcon, PersonAddIcon, ProhibitIcon } from "@/components/ui/icons"

import { AccionesFila, type AccionFila } from "@/features/gestion-estudiantil/commons/components/acciones-fila"
import type { ActividadRow } from "@/features/gestion-estudiantil/actividades-extracurriculares/api/types"

export type AccionActividad = "ver" | "inscribir" | "modificar" | "estado"

/** Las cuatro acciones de la fila (§6.1). */
export const ACCIONES_ACTIVIDAD = 4

interface Props {
  fila: ActividadRow
  onAccion: (accion: AccionActividad) => void
}

/**
 * Acciones de una fila del listado, guiadas por las banderas del backend: Ver detalle, Inscribir
 * (`puede_inscribir`), Modificar (`puede_editar`) e Inactivar/Activar (`puede_cambiar_estado`).
 */
export function MenuAccionesActividad({ fila: f, onAccion }: Props) {
  const acciones: AccionFila[] = [
    { id: "ver", label: "Ver detalle", icon: <EyeIcon />, onSelect: () => onAccion("ver") },
    {
      id: "inscribir",
      label: "Inscribir",
      icon: <PersonAddIcon />,
      disabled: !f.puede_inscribir,
      onSelect: () => onAccion("inscribir"),
    },
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
      disabled: !f.puede_cambiar_estado,
      onSelect: () => onAccion("estado"),
    },
  ]
  return <AccionesFila etiqueta={`Acciones de la actividad ${f.nombre}`} acciones={acciones} />
}
