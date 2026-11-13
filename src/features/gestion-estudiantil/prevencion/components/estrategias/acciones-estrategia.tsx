import { CheckCircleIcon, CopyIcon, EyeIcon, PencilIcon, ControlPointIcon } from "@/components/ui/icons"

import type { AccionFila } from "@/features/gestion-estudiantil/commons/components/acciones-fila"
import type { EstrategiaRow } from "@/features/gestion-estudiantil/prevencion/api/types"

export type AccionEstrategia = "ver" | "modificar" | "beneficiarios" | "copiar" | "finalizar"

/** Ver detalle, Modificar, Agregar beneficiarios, Copiar estrategia y Finalizar. */
export const ACCIONES_ESTRATEGIA = 5

type Banderas = Pick<
  EstrategiaRow,
  "puede_modificar" | "puede_agregar_beneficiarios" | "puede_copiar" | "puede_finalizar"
>

/** Acciones de una estrategia (G.8.EST.3); la que el backend no permite va deshabilitada, no oculta. */
export function accionesEstrategia(
  f: Banderas,
  etiquetaMenu: string,
  onAccion: (accion: AccionEstrategia) => void,
): { etiqueta: string; acciones: AccionFila[] } {
  return {
    etiqueta: etiquetaMenu,
    acciones: [
      { id: "ver", label: "Ver detalle", icon: <EyeIcon />, onSelect: () => onAccion("ver") },
      {
        id: "modificar",
        label: "Modificar",
        icon: <PencilIcon />,
        disabled: !f.puede_modificar,
        onSelect: () => onAccion("modificar"),
      },
      {
        id: "beneficiarios",
        label: "Agregar beneficiarios",
        icon: <ControlPointIcon />,
        disabled: !f.puede_agregar_beneficiarios,
        onSelect: () => onAccion("beneficiarios"),
      },
      {
        id: "copiar",
        label: "Copiar estrategia",
        icon: <CopyIcon />,
        disabled: !f.puede_copiar,
        onSelect: () => onAccion("copiar"),
      },
      {
        id: "finalizar",
        label: "Finalizar",
        icon: <CheckCircleIcon />,
        disabled: !f.puede_finalizar,
        onSelect: () => onAccion("finalizar"),
      },
    ],
  }
}
