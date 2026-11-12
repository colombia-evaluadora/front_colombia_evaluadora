import { Dato } from "@/features/gestion-estudiantil/commons/components/dato"
import { SeccionPlegable } from "@/features/gestion-estudiantil/commons/components/seccion-plegable"
import { abreviarPersona, formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import type { SenalRiesgo, ValoracionDetalle } from "@/features/gestion-estudiantil/prevencion/api/types"
import { etiquetasAlertas } from "@/features/gestion-estudiantil/prevencion/utils/alertas"

/** `alertas_consideradas` llega como JSONB `{senales, condiciones}` tal cual lo guardó el backend. */
function alertasConsideradas(valor: unknown): string[] {
  const a = valor as { senales?: SenalRiesgo[]; condiciones?: string[] } | null
  return a?.senales ? etiquetasAlertas(a.senales, a.condiciones ?? []) : []
}

/** Datos de la valoración: fecha, nivel, autor, análisis y, si se anuló, la anulación. */
export function SeccionValoracion({ valoracion: v }: { valoracion: ValoracionDetalle }) {
  return (
    <SeccionPlegable encuadrada comoSeccion titulo="Valoración del riesgo" contentClassName="flex flex-col gap-4 px-4 py-4">
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Dato label="Fecha">{formatFecha(v.fecha)}</Dato>
        <Dato label="Nivel de riesgo">{v.nivel_nombre}</Dato>
        <Dato label="Valorada por">{abreviarPersona(v.valorada_por)}</Dato>
      </dl>
      <p className="text-sm">
        <span className="text-muted-foreground">Alertas consideradas: </span>
        {alertasConsideradas(v.alertas_consideradas).join(" · ") || "Ninguna"}
      </p>
      <p className="text-sm">
        <span className="text-muted-foreground">Análisis: </span>
        {v.analisis}
      </p>
      {v.anulacion && (
        <p className="text-sm">
          <span className="text-muted-foreground">
            Anulada el {formatFecha(v.anulacion.fecha)} por {abreviarPersona(v.anulacion.por)}:{" "}
          </span>
          {v.anulacion.motivo}
        </p>
      )}
    </SeccionPlegable>
  )
}
