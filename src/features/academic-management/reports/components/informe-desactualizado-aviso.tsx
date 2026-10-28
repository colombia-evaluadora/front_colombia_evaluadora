import { format } from "date-fns"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { WarningIcon } from "@/components/ui/icons"

import {
  MENSAJE_INFORME_DESACTUALIZADO,
  useInformesDesactualizadosQuery,
} from "@/features/academic-management/reports/api/query/use-informe-desactualizado-query"
import type { CambioDesactualizado } from "@/features/academic-management/reports/api/query/use-informe-desactualizado-query"

interface InformeDesactualizadoAvisoProps {
  grupoId: number | null
  periodos: number[]
  /** Nombre visible del período; sin él se omite en el detalle. */
  nombrePeriodo?: (periodoId: number) => string | undefined
  /** En la planilla de una asignatura: solo cuenta lo de esa asignatura o lo
   *  que tocó el informe del grupo entero (`asignatura` nula). */
  asignatura?: string | null
  className?: string
}

const TIPO_LEGIBLE: Record<string, string> = {
  RECUPERACION_REFUERZO: "Refuerzo",
  RECUPERACION_HABILITACION: "Habilitación",
  CORRECCION_RESULTADO: "Corrección de resultado",
  CORRECCION_OBSERVACION: "Corrección de observación",
}

function detalleCambio(cambio: CambioDesactualizado): string {
  const tipo = TIPO_LEGIBLE[cambio.tipo] ?? cambio.tipo
  const fecha = cambio.fechaAprobacion ? format(new Date(cambio.fechaAprobacion), "dd/MM/yyyy") : null
  return [cambio.asignatura ?? "Todo el grupo", tipo, fecha && `aprobada el ${fecha}`]
    .filter(Boolean)
    .join(" · ")
}

/**
 * Regla 71: aviso ESTÁTICO en la cabecera cuando el informe/consolidado que
 * se está mostrando se emitió antes de una aprobación (p. ej. una
 * Recuperación). No se cierra ni regenera nada: desaparece cuando alguien
 * vuelve a consolidar, que es lo que limpia la marca en el backend.
 */
export function InformeDesactualizadoAviso({
  grupoId,
  periodos,
  nombrePeriodo,
  asignatura,
  className,
}: InformeDesactualizadoAvisoProps) {
  const marcados = useInformesDesactualizadosQuery(grupoId, periodos)
    .map((informe) => ({
      ...informe,
      cambios:
        asignatura === undefined
          ? informe.cambios
          : informe.cambios.filter((c) => c.asignatura == null || c.asignatura === asignatura),
    }))
    .filter((informe) => asignatura === undefined || informe.cambios.length > 0)

  if (marcados.length === 0) return null

  return (
    <Alert variant="warning" className={className} data-testid="informe-desactualizado">
      <WarningIcon />
      <AlertTitle>Informe desactualizado</AlertTitle>
      <AlertDescription>
        <p>{MENSAJE_INFORME_DESACTUALIZADO}</p>
        <ul className="mt-1 list-disc pl-5 text-xs">
          {marcados.flatMap((informe) =>
            informe.cambios.map((cambio) => {
              const periodo = nombrePeriodo?.(informe.periodoId)
              return (
                <li key={`${informe.periodoId}-${cambio.solicitudId}`}>
                  {periodo ? `${periodo}: ` : ""}
                  {detalleCambio(cambio)}
                </li>
              )
            }),
          )}
        </ul>
      </AlertDescription>
    </Alert>
  )
}
