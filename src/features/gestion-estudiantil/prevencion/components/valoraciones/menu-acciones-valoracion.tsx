import {
  CheckCircleIcon,
  ControlPointIcon,
  EyeIcon,
  GearIcon,
  PencilIcon,
  PencilSimpleIcon,
  ProhibitIcon,
} from "@/components/ui/icons"

import { AccionesFila } from "@/features/gestion-estudiantil/commons/components/acciones-fila"
import type { ValoracionRow } from "@/features/gestion-estudiantil/prevencion/api/types"

export type AccionValoracion =
  | "ver"
  | "avance"
  | "marcar"
  | "aceptacion"
  | "modificar"
  | "anular-plan"
  | "anular-valoracion"
  | "gestionar"

/** Ver, Registrar avance, Marcar, Aceptación presencial, Modificar, Anular plan, Anular valoración y Gestionar. */
export const ACCIONES_VALORACION = 8

interface Props {
  fila: ValoracionRow
  onAccion: (accion: AccionValoracion) => void
}

/**
 * Acciones de una fila de Valoraciones y planes (G.8.VAL.3): todas a la vista, las cuatro primeras como iconos
 * en el hover y el resto en el ⋮. La que la bandera del backend no permite va deshabilitada. «Gestionar» (9.11)
 * no tiene backend. Modificar: el listado no trae `puede_modificar`; se habilita para un plan Propuesto o Activo y el
 * detalle (con `puede_modificar`) y el backend deciden.
 */
export function MenuAccionesValoracion({ fila: f, onAccion }: Props) {
  const tienePlan = f.fk_tprevencion_plan != null
  const abierto = f.estado_plan === "PROPUESTO" || f.estado_plan === "ACTIVO"
  return (
    <AccionesFila
      etiqueta={`Acciones de ${f.estudiante_nombre}`}
      acciones={[
        { id: "ver", label: "Ver detalle", icon: <EyeIcon />, onSelect: () => onAccion("ver") },
        {
          id: "avance",
          label: "Registrar avance",
          icon: <ControlPointIcon />,
          disabled: !f.puede_registrar_avance,
          onSelect: () => onAccion("avance"),
        },
        {
          id: "marcar",
          label: "Marcar Superado / Incumplido",
          icon: <CheckCircleIcon />,
          disabled: !f.puede_marcar,
          onSelect: () => onAccion("marcar"),
        },
        {
          id: "aceptacion",
          label: "Registrar aceptación presencial",
          icon: <PencilIcon />,
          disabled: !f.puede_aceptar_presencial,
          onSelect: () => onAccion("aceptacion"),
        },
        {
          id: "modificar",
          label: "Modificar plan",
          icon: <PencilSimpleIcon />,
          disabled: !tienePlan || !abierto,
          onSelect: () => onAccion("modificar"),
        },
        {
          id: "anular-plan",
          label: "Anular plan",
          icon: <ProhibitIcon />,
          disabled: !f.puede_anular,
          onSelect: () => onAccion("anular-plan"),
        },
        {
          id: "anular-valoracion",
          label: "Anular valoración",
          icon: <ProhibitIcon />,
          disabled: !f.puede_anular_valoracion,
          onSelect: () => onAccion("anular-valoracion"),
        },
        {
          id: "gestionar",
          label: "Gestionar",
          icon: <GearIcon />,
          // Gestión de alertas (9.11) no tiene backend.
          disabled: true,
          onSelect: () => onAccion("gestionar"),
        },
      ]}
    />
  )
}
