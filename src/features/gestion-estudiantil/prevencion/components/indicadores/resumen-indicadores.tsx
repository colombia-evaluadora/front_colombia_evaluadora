import type { ReactNode } from "react"

import { Card } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { InfoIcon } from "@/components/ui/icons"

import type { IndicadorRow } from "@/features/gestion-estudiantil/prevencion/api/types"
import { formatPorcentaje } from "@/features/gestion-estudiantil/prevencion/utils/indicadores"

function Metrica({ titulo, ayuda, children }: { titulo: string; ayuda: string; children: ReactNode }) {
  return (
    <Card size="sm" className="gap-2">
      <div className="flex items-center gap-1.5 px-(--card-spacing) text-sm text-muted-foreground">
        <span>{titulo}</span>
        <Tooltip>
          <TooltipTrigger render={<span tabIndex={0} role="img" aria-label={`Qué mide ${titulo}`} />}>
            <InfoIcon aria-hidden="true" className="size-4" />
          </TooltipTrigger>
          <TooltipContent>{ayuda}</TooltipContent>
        </Tooltip>
      </div>
      <p className="flex items-baseline gap-2 px-(--card-spacing) text-2xl">{children}</p>
    </Card>
  )
}

const Secundario = ({ children }: { children: ReactNode }) => (
  <span className="text-sm text-muted-foreground">{children}</span>
)

/** Cifras del resumen (G.8.IND.1): asistencia, reprobación, en riesgo, retenidos y retiros del período. */
export function ResumenIndicadores({ resumen: r }: { resumen: IndicadorRow }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <Metrica titulo="Asistencia" ayuda="Presente, tarde o ausencia justificada sobre los registros de asistencia.">
        {formatPorcentaje(r.asistencia_pct)}
      </Metrica>
      <Metrica titulo="Reprobación" ayuda="Estudiantes con un área reprobada sobre los que cursan.">
        {formatPorcentaje(r.reprobacion_pct)}
      </Metrica>
      <Metrica titulo="En riesgo" ayuda="Estudiantes en riesgo del período, y su proporción sobre los que cursan.">
        {r.en_riesgo}
        <Secundario>({formatPorcentaje(r.en_riesgo_pct)})</Secundario>
      </Metrica>
      <Metrica titulo="Retenidos" ayuda="Estudiantes que siguen cursando sobre los que estaban en el período.">
        {r.retenidos}
        <Secundario>de {r.retenidos_base}</Secundario>
      </Metrica>
      <Metrica titulo="Retiros" ayuda="Estudiantes retirados en el período, filtrados por el motivo de retiro si se eligió.">
        {r.retiros}
        {r.motivo_principal && <Secundario>({r.motivo_principal})</Secundario>}
      </Metrica>
    </div>
  )
}
