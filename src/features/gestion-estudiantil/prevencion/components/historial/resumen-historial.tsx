import { Badge } from "@/components/ui/badge"

import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import type { Historial } from "@/features/gestion-estudiantil/prevencion/api/types"
import { ESTADO_PLAN_COLOR, ESTADO_PLAN_ETIQUETA, NIVEL_COLOR } from "@/features/gestion-estudiantil/prevencion/api/ui-mappings"

/** «Nivel de riesgo actual: Alto (06/05/2027) · Plan: En seguimiento». */
export function ResumenHistorial({ historial: h }: { historial: Historial }) {
  const plan = h.planes.find((p) => p.id === h.fk_tprevencion_plan_abierto)
  return (
    <p className="flex flex-wrap items-center gap-2 text-sm">
      <span>Nivel de riesgo actual:</span>
      {h.nivel_actual ? (
        <>
          <Badge variant="soft" color={NIVEL_COLOR[h.nivel_actual.valor]}>
            <span>{h.nivel_actual.nombre}</span>
          </Badge>
          <span className="text-muted-foreground">({formatFecha(h.nivel_actual.fecha)})</span>
        </>
      ) : (
        <span>—</span>
      )}
      <span>· Plan:</span>
      {plan ? (
        <Badge variant="soft" color={ESTADO_PLAN_COLOR[plan.estado]}>
          <span>{ESTADO_PLAN_ETIQUETA[plan.estado]}</span>
        </Badge>
      ) : (
        <span>Sin plan abierto</span>
      )}
    </p>
  )
}
