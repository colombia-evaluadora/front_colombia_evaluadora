import { CheckCircleIcon, ControlPointIcon, EyeIcon, PencilIcon, ProhibitIcon } from "@/components/ui/icons"

import type { AccionFila } from "@/features/gestion-estudiantil/commons/components/acciones-fila"
import type { AcompanamientoRow } from "@/features/gestion-estudiantil/prevencion/api/types"

export type AccionAcomp = "ver" | "modificar" | "accion" | "cerrar" | "anular"

/** Ver detalle, Modificar, Registrar acción o remisión, Cerrar acompañamiento y Anular. */
export const ACCIONES_ACOMPANAMIENTO = 5

type Banderas = Pick<AcompanamientoRow, "puede_modificar" | "puede_registrar_accion" | "puede_cerrar" | "puede_anular">

/**
 * Acciones de un acompañamiento (G.8.EMB.2, G.8.CON.2). Todas se ven; las banderas del backend (que ya
 * miran el estado y el rol: orientación modifica, registra y cierra; Supervisor y Administrador anulan)
 * deshabilitan las que no aplican.
 */
export function accionesAcomp(f: Banderas, onAccion: (accion: AccionAcomp) => void): AccionFila[] {
  return [
    { id: "ver", label: "Ver detalle", icon: <EyeIcon />, onSelect: () => onAccion("ver") },
    {
      id: "modificar",
      label: "Modificar",
      icon: <PencilIcon />,
      disabled: !f.puede_modificar,
      onSelect: () => onAccion("modificar"),
    },
    {
      id: "accion",
      label: "Registrar acción o remisión",
      icon: <ControlPointIcon />,
      disabled: !f.puede_registrar_accion,
      onSelect: () => onAccion("accion"),
    },
    {
      id: "cerrar",
      label: "Cerrar acompañamiento",
      icon: <CheckCircleIcon />,
      disabled: !f.puede_cerrar,
      onSelect: () => onAccion("cerrar"),
    },
    {
      id: "anular",
      label: "Anular",
      icon: <ProhibitIcon />,
      disabled: !f.puede_anular,
      onSelect: () => onAccion("anular"),
    },
  ]
}

export type AccionReporteConsumo = "ver" | "vincular"

/** Ver reporte y Vincular reporte. */
export const ACCIONES_REPORTE_CONSUMO = 2
