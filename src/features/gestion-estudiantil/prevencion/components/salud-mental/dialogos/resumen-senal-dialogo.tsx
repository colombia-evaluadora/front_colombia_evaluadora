import type { ResumenSenalSM } from "@/features/gestion-estudiantil/prevencion/api/types"
import {
  BadgeEstadoSenal,
  BadgeSeveridad,
} from "@/features/gestion-estudiantil/prevencion/components/salud-mental/badges-senal"

/** Línea bajo el título de los modales (G.8.SAL.6): «Señal: tipo» con su severidad y su estado. */
export function ResumenSenalDialogo({ senal }: { senal: ResumenSenalSM }) {
  return (
    <span className="flex flex-wrap items-center gap-2">
      <span className="text-muted-foreground">Señal:</span>
      {senal.tipo_nombre}
      {senal.severidad_valor && <BadgeSeveridad valor={senal.severidad_valor} nombre={senal.severidad_nombre} />}
      <BadgeEstadoSenal estado={senal.estado} nombre={senal.estado_nombre} />
    </span>
  )
}
