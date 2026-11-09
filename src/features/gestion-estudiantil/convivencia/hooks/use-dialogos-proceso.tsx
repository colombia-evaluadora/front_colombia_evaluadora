import { useCallback, useState } from "react"

import {
  DialogosProceso,
  type DialogoActivo,
} from "@/features/gestion-estudiantil/convivencia/components/procesos/dialogos/dialogos-proceso"
import type { AccionEtapa } from "@/features/gestion-estudiantil/convivencia/utils/proceso-detalle"

/** Modal de etapa abierto desde el listado o el detalle: `abrir(accion, procesoId)` y `dialogos` para pintarlo. */
export function useDialogosProceso() {
  const [activo, setActivo] = useState<DialogoActivo | null>(null)
  const abrir = useCallback((accion: AccionEtapa, procesoId: number, sancionId?: number) => setActivo({ accion, procesoId, sancionId }), [])
  const cerrar = useCallback(() => setActivo(null), [])
  const dialogos = activo ? <DialogosProceso activo={activo} onClose={cerrar} /> : null
  return { abrir, dialogos }
}
