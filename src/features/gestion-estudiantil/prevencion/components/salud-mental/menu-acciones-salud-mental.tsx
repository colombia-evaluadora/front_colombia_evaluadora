import { AccionesFila } from "@/features/gestion-estudiantil/commons/components/acciones-fila"
import type { SenalSMRow } from "@/features/gestion-estudiantil/prevencion/api/types"
import {
  accionesSenal,
  type AccionSenalSM,
} from "@/features/gestion-estudiantil/prevencion/components/salud-mental/acciones-senal"

interface Props {
  fila: SenalSMRow
  onAccion: (accion: AccionSenalSM) => void
}

/** Acciones de una fila de Salud mental: las cuatro como iconos en el hover; la que no aplica va deshabilitada. */
export function MenuAccionesSaludMental({ fila: f, onAccion }: Props) {
  const { etiqueta, acciones } = accionesSenal(f, `Acciones de la señal de ${f.estudiante_nombre}`, onAccion)
  return <AccionesFila etiqueta={etiqueta} acciones={acciones} />
}
