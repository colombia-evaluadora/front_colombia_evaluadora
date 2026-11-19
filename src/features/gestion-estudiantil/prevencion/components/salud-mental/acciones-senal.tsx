import { CheckCircleIcon, ControlPointIcon, EyeIcon, PencilIcon } from "@/components/ui/icons"

import type { AccionFila } from "@/features/gestion-estudiantil/commons/components/acciones-fila"
import type { SenalSMRow } from "@/features/gestion-estudiantil/prevencion/api/types"

export type AccionSenalSM = "ver" | "valorar" | "atencion" | "cerrar"

/** Ver, Valorar, Registrar atención y Cerrar. */
export const ACCIONES_SALUD_MENTAL = 4

type Banderas = Pick<SenalSMRow, "estado" | "es_orientacion" | "puede_valorar" | "puede_atender" | "puede_cerrar">

/**
 * Acciones de una señal (G.8.SAL.3). Cerrar se ve habilitada para orientación aun en Por valorar: el modal
 * es el que explica el bloqueo («aún no ha sido valorada»); en Cerrada va deshabilitada.
 */
export function accionesSenal(
  f: Banderas,
  etiquetaMenu: string,
  onAccion: (accion: AccionSenalSM) => void,
): { etiqueta: string; acciones: AccionFila[] } {
  const cerrarHabilitada = f.puede_cerrar || (f.es_orientacion && f.estado === "POR_VALORAR")
  return {
    etiqueta: etiquetaMenu,
    acciones: [
      { id: "ver", label: "Ver señal", icon: <EyeIcon />, onSelect: () => onAccion("ver") },
      {
        id: "valorar",
        label: "Valorar",
        icon: <PencilIcon />,
        disabled: !f.puede_valorar,
        onSelect: () => onAccion("valorar"),
      },
      {
        id: "atencion",
        label: "Registrar atención",
        icon: <ControlPointIcon />,
        disabled: !f.puede_atender,
        onSelect: () => onAccion("atencion"),
      },
      {
        id: "cerrar",
        label: "Cerrar",
        icon: <CheckCircleIcon />,
        disabled: !cerrarHabilitada,
        onSelect: () => onAccion("cerrar"),
      },
    ],
  }
}

