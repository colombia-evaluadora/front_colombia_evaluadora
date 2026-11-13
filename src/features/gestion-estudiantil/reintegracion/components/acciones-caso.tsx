import {
  ArrowRightIcon,
  ArrowsLeftRightIcon,
  CheckCircleIcon,
  ClipboardCheckIcon,
  ControlPointIcon,
  EyeIcon,
  FileTextIcon,
  LockIcon,
  PaperPlaneTiltIcon,
  PencilIcon,
  ShieldCheckIcon,
  UserSwitchIcon,
} from "@/components/ui/icons"

import type { AccionFila } from "@/features/gestion-estudiantil/commons/components/acciones-fila"
import type { BanderasCaso } from "@/features/gestion-estudiantil/reintegracion/api/types"

export type AccionCaso =
  | "ver"
  | "modificar"
  | "asignar"
  | "intervencion"
  | "estado"
  | "validar"
  | "aprobar"
  | "acta"
  | "simpade"
  | "remitir"
  | "cerrar"
  | "convivencia"

/** Las once acciones de la fila, en el orden de la especificación (§10.1). */
export const ACCIONES_CASO = 11

type Fila = Pick<BanderasCaso, Exclude<keyof BanderasCaso, "estados_siguientes">> & { profesional_asignado: boolean }

/**
 * Acciones de un caso. Cada una se guía por su bandera `puede_*` del backend y va deshabilitada, no oculta.
 * «Remitir» (§10.4) tiene el mismo gate que registrar una intervención: usa `puede_registrar_intervencion`.
 */
export function accionesCaso(
  f: Fila,
  etiquetaMenu: string,
  onAccion: (accion: AccionCaso) => void,
  /** El detalle suma «Abrir caso de convivencia» (`puede_abrir_convivencia`); la fila no. */
  conConvivencia = false,
): { etiqueta: string; acciones: AccionFila[] } {
  const acciones: AccionFila[] = [
    { id: "ver", label: "Ver caso", icon: <EyeIcon />, onSelect: () => onAccion("ver") },
    {
      id: "modificar",
      label: "Modificar",
      icon: <PencilIcon />,
      disabled: !f.puede_modificar,
      onSelect: () => onAccion("modificar"),
    },
    {
      id: "asignar",
      label: f.profesional_asignado ? "Reasignar" : "Asignar",
      icon: <UserSwitchIcon />,
      disabled: !f.puede_asignar,
      onSelect: () => onAccion("asignar"),
    },
    {
      id: "intervencion",
      label: "Registrar intervención",
      icon: <ControlPointIcon />,
      disabled: !f.puede_registrar_intervencion,
      onSelect: () => onAccion("intervencion"),
    },
    {
      id: "estado",
      label: "Cambiar estado",
      icon: <ArrowsLeftRightIcon />,
      disabled: !f.puede_cambiar_estado,
      onSelect: () => onAccion("estado"),
    },
    {
      id: "validar",
      label: "Validar caso",
      icon: <ShieldCheckIcon />,
      disabled: !f.puede_validar,
      onSelect: () => onAccion("validar"),
    },
    {
      id: "aprobar",
      label: "Aprobar reingreso",
      icon: <CheckCircleIcon />,
      disabled: !f.puede_aprobar_reingreso,
      onSelect: () => onAccion("aprobar"),
    },
    {
      id: "acta",
      label: "Generar acta de retiro",
      icon: <FileTextIcon />,
      disabled: !f.puede_generar_acta,
      onSelect: () => onAccion("acta"),
      separada: true,
    },
    {
      id: "simpade",
      label: "Marcar como ingresado al SIMPADE",
      icon: <ClipboardCheckIcon />,
      disabled: !f.puede_marcar_simpade,
      onSelect: () => onAccion("simpade"),
    },
    {
      id: "remitir",
      label: "Remitir",
      icon: <PaperPlaneTiltIcon />,
      disabled: !f.puede_registrar_intervencion,
      onSelect: () => onAccion("remitir"),
    },
    {
      id: "cerrar",
      label: "Cerrar",
      icon: <LockIcon />,
      disabled: !f.puede_cerrar,
      onSelect: () => onAccion("cerrar"),
      separada: true,
    },
  ]
  if (conConvivencia)
    acciones.splice(acciones.length - 1, 0, {
      id: "convivencia",
      label: "Abrir caso de convivencia",
      icon: <ArrowRightIcon />,
      disabled: !f.puede_abrir_convivencia,
      onSelect: () => onAccion("convivencia"),
    })
  return { etiqueta: etiquetaMenu, acciones }
}
