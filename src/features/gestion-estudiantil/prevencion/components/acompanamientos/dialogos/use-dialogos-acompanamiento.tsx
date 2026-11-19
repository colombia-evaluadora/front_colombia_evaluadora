import { useCallback, useState } from "react"

import type {
  AcompAccion,
  ReporteConsumoRow,
  ResumenAcomp,
} from "@/features/gestion-estudiantil/prevencion/api/types"
import type { ExportarSiuceAcompInput } from "@/features/gestion-estudiantil/prevencion/api/mutations/acompanamientos"
import { DialogAccionAcomp } from "@/features/gestion-estudiantil/prevencion/components/acompanamientos/dialogos/dialog-accion-acomp"
import { DialogAnularAcomp } from "@/features/gestion-estudiantil/prevencion/components/acompanamientos/dialogos/dialog-anular-acomp"
import { DialogCerrarAcomp } from "@/features/gestion-estudiantil/prevencion/components/acompanamientos/dialogos/dialog-cerrar-acomp"
import { DialogExportarSiuceAcomp } from "@/features/gestion-estudiantil/prevencion/components/acompanamientos/dialogos/dialog-exportar-siuce-acomp"
import { DialogResultadoAccion } from "@/features/gestion-estudiantil/prevencion/components/acompanamientos/dialogos/dialog-resultado-accion"
import { DialogVerReporte } from "@/features/gestion-estudiantil/prevencion/components/acompanamientos/dialogos/dialog-ver-reporte"
import { DialogVincularReporte } from "@/features/gestion-estudiantil/prevencion/components/acompanamientos/dialogos/dialog-vincular-reporte"

export type DialogoAcomp =
  | { dialogo: "accion"; acomp: ResumenAcomp; accion?: AcompAccion | null }
  | { dialogo: "resultado"; acomp: ResumenAcomp; accion: AcompAccion }
  | { dialogo: "cerrar" | "anular"; acomp: ResumenAcomp }
  | { dialogo: "ver-reporte" | "vincular"; reporte: ReporteConsumoRow }
  | ({ dialogo: "siuce"; total: number; filtrosTexto: string[] } & Pick<ExportarSiuceAcompInput, "tipo" | "filters">)

/** Un solo modal de operación abierto a la vez; lo comparten el listado, Reportes recibidos y el detalle. */
export function useDialogosAcompanamiento() {
  const [abierto, setAbierto] = useState<DialogoAcomp | null>(null)
  const cerrar = useCallback(() => setAbierto(null), [])
  const d = abierto
  let dialogo = null
  if (d?.dialogo === "accion") dialogo = <DialogAccionAcomp acomp={d.acomp} accion={d.accion} onClose={cerrar} />
  else if (d?.dialogo === "resultado") dialogo = <DialogResultadoAccion acomp={d.acomp} accion={d.accion} onClose={cerrar} />
  else if (d?.dialogo === "cerrar") dialogo = <DialogCerrarAcomp acomp={d.acomp} onClose={cerrar} />
  else if (d?.dialogo === "anular") dialogo = <DialogAnularAcomp acomp={d.acomp} onClose={cerrar} />
  else if (d?.dialogo === "ver-reporte")
    dialogo = (
      <DialogVerReporte
        reporte={d.reporte}
        onClose={cerrar}
        onVincular={() => setAbierto({ dialogo: "vincular", reporte: d.reporte })}
      />
    )
  else if (d?.dialogo === "vincular") dialogo = <DialogVincularReporte reporte={d.reporte} onClose={cerrar} />
  else if (d?.dialogo === "siuce")
    dialogo = (
      <DialogExportarSiuceAcomp
        tipo={d.tipo}
        filters={d.filters}
        total={d.total}
        filtrosTexto={d.filtrosTexto}
        onClose={cerrar}
      />
    )
  return { abrir: setAbierto, dialogos: dialogo }
}
