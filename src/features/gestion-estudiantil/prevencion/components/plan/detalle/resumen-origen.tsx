import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

import { Dato } from "@/features/gestion-estudiantil/commons/components/dato"
import { abreviarPersona, formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import type { PlanDetalle } from "@/features/gestion-estudiantil/prevencion/api/types"
import { NIVEL_COLOR } from "@/features/gestion-estudiantil/prevencion/api/ui-mappings"

interface Props {
  plan: PlanDetalle
  /** Análisis de la valoración de origen, solo donde se ve lo sensible. */
  analisisOrigen: string | null
  canal: string | null
  onVerCaso: () => void
}

/** Valoración de origen, objetivo y fechas, línea de aceptación y datos del plan. */
export function ResumenOrigen({ plan: p, analisisOrigen, canal, onVerCaso }: Props) {
  return (
    <>
      <div className="flex flex-col gap-2 text-sm">
        {p.valoracion && (
          <p className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground">Valoración de origen:</span>
            <span>{formatFecha(p.valoracion.fecha)}</span>
            <Badge variant="soft" color={NIVEL_COLOR[p.valoracion.nivel_valor]}>
              <span>{p.valoracion.nivel_nombre}</span>
            </Badge>
            {analisisOrigen && <span className="text-muted-foreground">· {analisisOrigen}</span>}
          </p>
        )}
        <p>
          <span className="text-muted-foreground">Objetivo: </span>
          {p.objetivo} · {formatFecha(p.fecha_inicio)} a {formatFecha(p.fecha_fin_prevista)}
        </p>
        <p className="text-xs text-muted-foreground">
          {p.fecha_aceptacion
            ? `Aceptado ${canal ? `(${canal.toLowerCase()}) ` : ""}el ${formatFecha(p.fecha_aceptacion)}.`
            : "Aún no ha sido aceptado por el acudiente."}
        </p>
      </div>

      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Dato label="Acudiente">
          {p.acudiente
            ? `${abreviarPersona(p.acudiente.nombre)}${p.acudiente.parentesco ? ` (${p.acudiente.parentesco})` : ""}`
            : "Sin acudiente registrado"}
        </Dato>
        <Dato label="Creado por">{abreviarPersona(p.creado_por)}</Dato>
        <Dato label="Caso de convivencia">
          {p.caso_convivencia && (
            <Button variant="link" size="sm" className="h-auto p-0" onClick={onVerCaso}>
              {p.caso_convivencia.numero}
            </Button>
          )}
        </Dato>
        {p.anulacion && (
          <Dato label="Anulado">
            {formatFecha(p.anulacion.fecha)} · {p.anulacion.motivo}
          </Dato>
        )}
      </dl>
    </>
  )
}
