import {
  ClipboardCheckIcon,
  ClipboardTextIcon,
  ClockCounterClockwiseIcon,
  GearIcon,
} from "@/components/ui/icons"

import { AccionesFila } from "@/features/gestion-estudiantil/commons/components/acciones-fila"
import type { TableroRow } from "@/features/gestion-estudiantil/prevencion/api/types"

export type AccionTablero = "valorar" | "plan" | "historial" | "gestionar"

/** Valorar riesgo, Crear plan, Ver historial y Gestionar. */
export const ACCIONES_TABLERO = 4

interface Props {
  fila: TableroRow
  onAccion: (accion: AccionTablero) => void
}

/**
 * Acciones del estudiante del tablero (G.8.TAB.3): todas a la vista; las que la bandera del backend no
 * permite van deshabilitadas. «Gestionar» (9.11) no tiene backend: `puede_gestionar` llega siempre en false.
 */
export function MenuAccionesTablero({ fila, onAccion }: Props) {
  return (
    <AccionesFila
      etiqueta={`Acciones de ${fila.estudiante_nombre}`}
      acciones={[
        {
          id: "valorar",
          label: "Valorar riesgo",
          icon: <ClipboardCheckIcon />,
          disabled: !fila.puede_valorar,
          onSelect: () => onAccion("valorar"),
        },
        {
          id: "plan",
          label: "Crear plan",
          icon: <ClipboardTextIcon />,
          disabled: !fila.puede_crear_plan,
          onSelect: () => onAccion("plan"),
        },
        {
          id: "historial",
          label: "Ver historial",
          icon: <ClockCounterClockwiseIcon />,
          onSelect: () => onAccion("historial"),
        },
        {
          id: "gestionar",
          label: "Gestionar",
          icon: <GearIcon />,
          disabled: !fila.puede_gestionar,
          onSelect: () => onAccion("gestionar"),
        },
      ]}
    />
  )
}
