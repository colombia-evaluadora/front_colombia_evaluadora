import { TableScreenBody, TableScreenHeader, TableScreenTitle } from "@/components/layout/table-screen"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { NoticeOutlet } from "@/components/notice/notice-context"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"

import { abreviarPersona } from "@/features/gestion-estudiantil/commons/utils/formatos"
import { BotonVolver } from "@/features/gestion-estudiantil/prevencion/components/boton-volver"
import { FiltrosHistorialAcademico } from "@/features/gestion-estudiantil/prevencion/components/historial-academico/filtros-historial-academico"
import { ResultadosHistorialAcademico } from "@/features/gestion-estudiantil/prevencion/components/historial-academico/resultados-historial-academico"
import { useHistorialAcademico } from "@/features/gestion-estudiantil/prevencion/hooks/use-historial-academico"

/**
 * Historial académico (G.8.HIS.1-3): «Prevención › Historial académico · {estudiante} · {grado/grupo}», con el estudiante y
 * el establecimiento del expediente, los filtros y el resultado de la consulta (solo lectura). Sin años anteriores
 * muestra el mensaje del backend con los filtros deshabilitados.
 */
export function PantallaHistorialAcademico({ matricula }: { matricula: number }) {
  const h = useHistorialAcademico(matricula)
  const op = h.op
  const nombre = abreviarPersona(op?.estudiante_nombre)

  return (
    <>
      <TableScreenHeader>
        <TableScreenTitle description={<BotonVolver texto="Volver al expediente" onClick={h.volverAlExpediente} />}>
          <span className="whitespace-normal">
            {op ? `Prevención › Historial académico · ${nombre} · ${op.grado_grupo}` : "Prevención › Historial académico"}
          </span>
        </TableScreenTitle>
        <NoticeOutlet className="mx-(--screen-spacing) my-4" />
      </TableScreenHeader>

      <TableScreenBody>
        {h.opcionesQuery.isPending ? (
          <Skeleton className="m-6 h-96" />
        ) : h.opcionesQuery.isError || !op ? (
          <ErrorNoticeBanner error={h.opcionesQuery.error ?? true} fallback="No se encontró el estudiante solicitado." className="m-6" />
        ) : (
          <div className="flex flex-col gap-4 pb-6">
            <p className="text-sm">
              <span className="font-medium">
                {nombre} · {op.grado_grupo}
              </span>
              <span className="text-muted-foreground"> · {op.establecimiento_nombre} · Estudiante y establecimiento del expediente</span>
            </p>
            {h.sinAcceso && (
              <Alert>
                <AlertDescription>Su rol no puede consultar el historial académico.</AlertDescription>
              </Alert>
            )}
            <FiltrosHistorialAcademico h={h} />
            {op.sin_anios_anteriores && (
              <Alert>
                <AlertDescription>
                  {op.mensaje ?? "Este estudiante no tiene matrículas de años anteriores en el establecimiento."}
                </AlertDescription>
              </Alert>
            )}
            <ResultadosHistorialAcademico h={h} />
          </div>
        )}
      </TableScreenBody>
    </>
  )
}
