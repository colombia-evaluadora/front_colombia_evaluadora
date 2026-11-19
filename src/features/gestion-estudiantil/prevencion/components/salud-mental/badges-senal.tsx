import { Badge } from "@/components/ui/badge"

import type { EstadoSenalSM, SeveridadSaludMental } from "@/features/gestion-estudiantil/prevencion/api/types"
import {
  ESTADO_SM_COLOR,
  SEVERIDAD_SM_COLOR,
} from "@/features/gestion-estudiantil/prevencion/api/ui-mappings"

/** Severidad de una señal de salud mental; «—» mientras no se ha valorado. */
export function BadgeSeveridad({ valor, nombre }: { valor: SeveridadSaludMental | null; nombre: string | null }) {
  if (!valor) return <>—</>
  return (
    <Badge variant="soft" color={SEVERIDAD_SM_COLOR[valor]}>
      <span>{nombre ?? valor}</span>
    </Badge>
  )
}

/** Estado de una señal de salud mental (Regla 19). */
export function BadgeEstadoSenal({ estado, nombre }: { estado: EstadoSenalSM; nombre: string }) {
  return (
    <Badge variant="soft" color={ESTADO_SM_COLOR[estado]}>
      <span>{nombre}</span>
    </Badge>
  )
}
