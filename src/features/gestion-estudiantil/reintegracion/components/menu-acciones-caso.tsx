import { AccionesFila } from "@/features/gestion-estudiantil/commons/components/acciones-fila"
import type { CasoRow } from "@/features/gestion-estudiantil/reintegracion/api/types"
import {
  accionesCaso,
  type AccionCaso,
} from "@/features/gestion-estudiantil/reintegracion/components/acciones-caso"

interface Props {
  fila: CasoRow
  onAccion: (accion: AccionCaso) => void
}

/** Acciones de una fila de la bandeja: cuatro iconos en el hover y el resto en el ⋮; la que no aplica va deshabilitada. */
export function MenuAccionesCaso({ fila: f, onAccion }: Props) {
  const { etiqueta, acciones } = accionesCaso(
    { ...f, profesional_asignado: f.fk_tusuario_profesional != null },
    `Acciones del caso de ${f.estudiante_nombre}`,
    onAccion,
  )
  return <AccionesFila etiqueta={etiqueta} acciones={acciones} />
}
