"use no memo"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { getErrorMessage } from "@/lib/api-client"

import type { useHistorialAcademico } from "@/features/gestion-estudiantil/prevencion/hooks/use-historial-academico"

/**
 * Resultado de la consulta: Evaluativo (G.8.HIS.1) con las notas por asignatura y período, o Formativo (G.8.HIS.2) con
 * las observaciones por período. Solo lectura: nada se calcula ni se copia a Gestión Estudiantil.
 */
export function ResultadosHistorialAcademico({ h }: { h: ReturnType<typeof useHistorialAcademico> }) {
  const q = h.resultadoQuery
  const error = q.error
  if (h.consultada == null) return null
  if (q.isPending) return <Skeleton className="h-48" />
  const r = h.resultado
  if (q.isError || !r) return <ErrorNoticeBanner error={error ?? true} fallback="No se pudo consultar el historial académico." />

  const evaluativo = r.enfoque === "EVALUATIVO"
  const tabla = evaluativo ? h.tablaEvaluativo : h.tablaFormativo
  return (
    <section aria-labelledby="historial-academico-resultado" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex flex-col gap-1">
          <h2 id="historial-academico-resultado" className="text-lg font-semibold">
            {evaluativo ? "Resultados de la matrícula" : "Observaciones de la matrícula"} {r.anio}
          </h2>
          <p className="text-sm text-muted-foreground">Enfoque {evaluativo ? "Evaluativo" : "Formativo"}</p>
          {evaluativo && r.resultado_matricula && (
            <p className="text-sm">
              <span className="text-muted-foreground">Resultado de la matrícula: </span>
              {r.resultado_matricula}
            </p>
          )}
        </div>
        <DataTableViewOptions table={tabla} />
      </div>
      {!evaluativo && (
        <Alert>
          <AlertDescription>
            Gestión Académica guarda una observación por estudiante y período, no por asignatura: se muestran como «General».
          </AlertDescription>
        </Alert>
      )}
      <DataTable
        table={tabla}
        isPending={false}
        isError={false}
        onRetry={q.refetch}
        emptyMessage="No hay resultados para los períodos elegidos."
        errorMessage={error ? getErrorMessage(error) : undefined}
      />
    </section>
  )
}
