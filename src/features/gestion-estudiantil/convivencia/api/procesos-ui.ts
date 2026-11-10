import type { BadgeColor } from "@/features/gestion-estudiantil/commons/utils/badge-color"
import type { EstadoProcesoCodigo, ProcesoRow } from "@/features/gestion-estudiantil/convivencia/api/procesos-types"

/** Color del badge de Estado del proceso (G.2.PRD.LIS.1). */
export const COLOR_ESTADO_PROCESO: Record<EstadoProcesoCodigo, BadgeColor> = {
  EN_DESCARGOS: "info",
  POR_DECIDIR: "warning",
  DECIDIDO: "orange",
  EN_RECURSO: "primary",
  EN_FIRME: "success",
  ARCHIVADO: "muted",
  CERRADO: "success",
  ANULADO: "muted",
}

/** Texto del ícono (i) de Próximo vencimiento. */
export function textoVencimiento(p: Pick<ProcesoRow, "proximo_vencimiento_tipo" | "proximo_vencimiento_detalle">): string | null {
  switch (p.proximo_vencimiento_tipo) {
    case "PLAZO_DESCARGOS":
      return "Plazo para descargos"
    case "PLAZO_RECURSOS":
      return "Plazo para recurrir"
    case "FIN_SANCION":
      return `Fin de la sanción${p.proximo_vencimiento_detalle ? ` ${p.proximo_vencimiento_detalle}` : ""}`
    default:
      return null
  }
}
