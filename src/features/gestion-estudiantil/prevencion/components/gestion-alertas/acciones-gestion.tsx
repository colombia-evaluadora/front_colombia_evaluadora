import {
  ArrowUpIcon,
  ChatCircleTextIcon,
  CheckCircleIcon,
  EyeIcon,
  PersonAddIcon,
  ShieldIcon,
  UsersIcon,
} from "@/components/ui/icons"

import type { AccionFila } from "@/features/gestion-estudiantil/commons/components/acciones-fila"
import type { GestionAlertaRow } from "@/features/gestion-estudiantil/prevencion/api/types"

export type AccionGestion = "ver" | "tomar" | "contacto" | "apoyo" | "ruta" | "escalar" | "resolver"

/** Ver detalle, Tomar, Registrar contacto, Solicitar apoyo de orientación, Activar ruta, Escalar y Resolver. */
export const ACCIONES_GESTION = 7

type Banderas = Pick<
  GestionAlertaRow,
  | "puede_tomar"
  | "puede_registrar_contacto"
  | "puede_apoyo_orientacion"
  | "puede_ruta_proteccion"
  | "puede_escalar"
  | "puede_resolver"
>

/**
 * Acciones de una gestión (G.8.GAL.1): todas se ven; las banderas del backend (rol y estado) deshabilitan las
 * que no aplican.
 */
export function accionesGestion(f: Banderas, onAccion: (accion: AccionGestion) => void): AccionFila[] {
  return [
    { id: "ver", label: "Ver detalle", icon: <EyeIcon />, onSelect: () => onAccion("ver") },
    { id: "tomar", label: "Tomar", icon: <PersonAddIcon />, disabled: !f.puede_tomar, onSelect: () => onAccion("tomar") },
    {
      id: "contacto",
      label: "Registrar contacto",
      icon: <ChatCircleTextIcon />,
      disabled: !f.puede_registrar_contacto,
      onSelect: () => onAccion("contacto"),
    },
    {
      id: "apoyo",
      label: "Solicitar apoyo de orientación",
      icon: <UsersIcon />,
      disabled: !f.puede_apoyo_orientacion,
      onSelect: () => onAccion("apoyo"),
    },
    {
      id: "ruta",
      label: "Activar ruta de protección",
      icon: <ShieldIcon />,
      disabled: !f.puede_ruta_proteccion,
      onSelect: () => onAccion("ruta"),
    },
    { id: "escalar", label: "Escalar", icon: <ArrowUpIcon />, disabled: !f.puede_escalar, onSelect: () => onAccion("escalar") },
    {
      id: "resolver",
      label: "Resolver",
      icon: <CheckCircleIcon />,
      disabled: !f.puede_resolver,
      onSelect: () => onAccion("resolver"),
    },
  ]
}
