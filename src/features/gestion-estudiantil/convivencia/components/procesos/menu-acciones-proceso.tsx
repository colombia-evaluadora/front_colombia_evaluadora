import type { ReactNode } from "react"

import {
  CalendarBlankIcon,
  CheckCircleIcon,
  ClipboardAddIcon,
  EyeIcon,
  FileTextIcon,
  GavelIcon,
  PencilIcon,
  ProhibitIcon,
  UserSwitchIcon,
} from "@/components/ui/icons"

import { AccionesFila, type AccionFila } from "@/features/gestion-estudiantil/commons/components/acciones-fila"
import type { ProcesoAcciones } from "@/features/gestion-estudiantil/convivencia/api/procesos-types"

export type AccionProceso =
  | "ver"
  | "descargos"
  | "decision"
  | "notificar"
  | "recurso"
  | "resolver"
  | "ajustar"
  | "cumplimiento"
  | "anular"

/** Las nueve acciones de la fila: 4 como iconos y el resto en ⋮. */
export const ACCIONES_PROCESO = 9

interface Props {
  numero: string
  acciones: ProcesoAcciones
  onAccion: (accion: AccionProceso) => void
  /** En el detalle ya se está viendo el proceso: se omite «Ver detalle» y todo va en un ⋮ del encabezado. */
  sinVerDetalle?: boolean
  /** Contenido extra al final del menú (p. ej. documentos). */
  children?: ReactNode
}

/** Acciones del proceso (G.2.PRD.LIS.3): todas visibles; las que el backend niega, deshabilitadas. */
export function MenuAccionesProceso({ numero, acciones, onAccion, sinVerDetalle, children }: Props) {
  const lista: AccionFila[] = [
    { id: "ver", label: "Ver detalle", icon: <EyeIcon />, disabled: !acciones.puede_ver_detalle, onSelect: () => onAccion("ver") },
    {
      id: "descargos",
      label: "Registrar descargos",
      icon: <ClipboardAddIcon />,
      disabled: !acciones.puede_descargos,
      onSelect: () => onAccion("descargos"),
    },
    { id: "decision", label: "Registrar decisión", icon: <GavelIcon />, disabled: !acciones.puede_decidir, onSelect: () => onAccion("decision") },
    {
      id: "notificar",
      label: "Notificación presencial",
      icon: <UserSwitchIcon />,
      disabled: !acciones.puede_notificar,
      onSelect: () => onAccion("notificar"),
    },
    { id: "recurso", label: "Registrar recurso", icon: <FileTextIcon />, disabled: !acciones.puede_recurso, onSelect: () => onAccion("recurso") },
    { id: "resolver", label: "Resolver recurso", icon: <PencilIcon />, disabled: !acciones.puede_resolver, onSelect: () => onAccion("resolver") },
    { id: "ajustar", label: "Ajustar fechas", icon: <CalendarBlankIcon />, disabled: !acciones.puede_ajustar, onSelect: () => onAccion("ajustar") },
    {
      id: "cumplimiento",
      label: "Registrar cumplimiento",
      icon: <CheckCircleIcon />,
      disabled: !acciones.puede_cumplimiento,
      onSelect: () => onAccion("cumplimiento"),
    },
    { id: "anular", label: "Anular", icon: <ProhibitIcon />, disabled: !acciones.puede_anular, onSelect: () => onAccion("anular") },
  ]

  return (
    <AccionesFila
      etiqueta={`Acciones del proceso ${numero}`}
      acciones={sinVerDetalle ? lista.filter((a) => a.id !== "ver") : lista}
      modo={sinVerDetalle ? "menu" : "fila"}
      extra={children}
    />
  )
}
