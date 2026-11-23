import { useCallback, useState } from "react"

import { prevencionKeys } from "@/features/gestion-estudiantil/prevencion/api/query-keys"
import type { ResumenGestion } from "@/features/gestion-estudiantil/prevencion/api/types"
import {
  DialogConfirmarGestion,
  type ConfirmacionGestion,
} from "@/features/gestion-estudiantil/prevencion/components/gestion-alertas/dialogos/dialog-confirmar-gestion"
import { DialogContactoGestion } from "@/features/gestion-estudiantil/prevencion/components/gestion-alertas/dialogos/dialog-contacto-gestion"
import { DialogResolverGestion } from "@/features/gestion-estudiantil/prevencion/components/gestion-alertas/dialogos/dialog-resolver-gestion"
import { DialogRutaProteccion } from "@/features/gestion-estudiantil/prevencion/components/gestion-alertas/dialogos/dialog-ruta-proteccion"
import {
  DialogoGestionRemision,
  DialogoRespuestaRemision,
  type ResumenRemision,
} from "@/features/gestion-estudiantil/commons/components/remisiones/dialogos-remision"

export type DialogoGestion =
  | { dialogo: "contacto" | "resolver" | "ruta"; gestion: ResumenGestion }
  | { dialogo: ConfirmacionGestion; gestion: ResumenGestion }
  | { dialogo: "remision-gestion" | "remision-respuesta"; remision: ResumenRemision }

/** Un solo modal de la gestión abierto a la vez; lo comparten el listado y el detalle. */
export function useDialogosGestion() {
  const [abierto, setAbierto] = useState<DialogoGestion | null>(null)
  const cerrar = useCallback(() => setAbierto(null), [])
  const d = abierto
  let dialogo = null
  if (d?.dialogo === "contacto") dialogo = <DialogContactoGestion gestion={d.gestion} onClose={cerrar} />
  else if (d?.dialogo === "resolver") dialogo = <DialogResolverGestion gestion={d.gestion} onClose={cerrar} />
  else if (d?.dialogo === "ruta") dialogo = <DialogRutaProteccion gestion={d.gestion} onClose={cerrar} />
  else if (d?.dialogo === "tomar" || d?.dialogo === "apoyo" || d?.dialogo === "escalar")
    dialogo = <DialogConfirmarGestion gestion={d.gestion} accion={d.dialogo} onClose={cerrar} />
  else if (d?.dialogo === "remision-gestion") dialogo = <DialogoGestionRemision remision={d.remision} onClose={cerrar} invalidar={prevencionKeys.all} />
  else if (d?.dialogo === "remision-respuesta") dialogo = <DialogoRespuestaRemision remision={d.remision} onClose={cerrar} invalidar={prevencionKeys.all} />
  return { abrir: setAbierto, dialogos: dialogo }
}
