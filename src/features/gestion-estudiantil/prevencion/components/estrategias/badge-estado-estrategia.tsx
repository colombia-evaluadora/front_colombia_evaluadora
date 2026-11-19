import { Badge } from "@/components/ui/badge"

import type { EstadoEstrategia } from "@/features/gestion-estudiantil/prevencion/api/types"
import { ESTADO_ESTRATEGIA_COLOR } from "@/features/gestion-estudiantil/prevencion/api/ui-mappings"

/** Estado derivado de una estrategia: Planeada, En ejecución o Finalizada. */
export function BadgeEstadoEstrategia({ estado, nombre }: { estado: EstadoEstrategia; nombre: string }) {
  return (
    <Badge variant="soft" color={ESTADO_ESTRATEGIA_COLOR[estado]}>
      <span>{nombre}</span>
    </Badge>
  )
}

/** Estado de la matrícula del beneficiario: «Cursando» en verde (su `valor` es «1»), el resto en gris. */
export function BadgeMatricula({ valor, nombre }: { valor: string | null; nombre: string | null }) {
  if (!nombre) return <>—</>
  return (
    <Badge variant="soft" color={valor === "1" ? "success" : "muted"}>
      <span>{nombre}</span>
    </Badge>
  )
}
