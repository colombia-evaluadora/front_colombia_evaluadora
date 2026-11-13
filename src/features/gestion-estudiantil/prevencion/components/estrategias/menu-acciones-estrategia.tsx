import { AccionesFila } from "@/features/gestion-estudiantil/commons/components/acciones-fila"
import type { EstrategiaRow } from "@/features/gestion-estudiantil/prevencion/api/types"
import {
  accionesEstrategia,
  type AccionEstrategia,
} from "@/features/gestion-estudiantil/prevencion/components/estrategias/acciones-estrategia"

interface Props {
  fila: EstrategiaRow
  onAccion: (accion: AccionEstrategia) => void
}

/** Acciones de una fila de Estrategias: cuatro iconos en el hover y el resto en el ⋮; las no permitidas, deshabilitadas. */
export function MenuAccionesEstrategia({ fila: f, onAccion }: Props) {
  const { etiqueta, acciones } = accionesEstrategia(f, `Acciones de la estrategia ${f.nombre}`, onAccion)
  return <AccionesFila etiqueta={etiqueta} acciones={acciones} />
}
