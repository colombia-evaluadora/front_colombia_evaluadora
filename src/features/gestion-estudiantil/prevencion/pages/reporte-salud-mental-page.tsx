import { TableScreen, TableScreenBody, TableScreenHeader, TableScreenTitle } from "@/components/layout/table-screen"
import { NoticeProvider } from "@/components/notice/notice-context"
import { Button } from "@/components/ui/button"
import { FloppyDiskIcon } from "@/components/ui/icons"

import { IconoCarga } from "@/features/gestion-estudiantil/commons/components/icono-carga"
import { CamposReporteSaludMental } from "@/features/gestion-estudiantil/prevencion/components/salud-mental/form/campos-reporte-salud-mental"
import { useReporteSaludMentalForm } from "@/features/gestion-estudiantil/prevencion/hooks/use-reporte-salud-mental-form"

function ReporteContent() {
  const f = useReporteSaludMentalForm()
  return (
    <>
      <TableScreenHeader>
        <TableScreenTitle
          action={
            <div className="flex shrink-0 items-center gap-2">
              <Button size="sm" type="button" variant="outline" color="neutral" disabled={f.pending} onClick={f.volver}>
                Cancelar
              </Button>
              <Button size="sm" type="button" disabled={f.pending} onClick={f.guardar}>
                <IconoCarga cargando={f.pending}>
                  <FloppyDiskIcon data-icon="inline-start" />
                </IconoCarga>
                Guardar
              </Button>
            </div>
          }
        >
          Prevención › Nuevo reporte de salud mental
        </TableScreenTitle>
      </TableScreenHeader>
      <TableScreenBody>
        <CamposReporteSaludMental f={f} />
      </TableScreenBody>
    </>
  )
}

/** Nuevo reporte de una señal de salud mental (§9.6): estudiante, fecha, tipo de señal y lo observado. */
export function ReporteSaludMentalPage() {
  return (
    <NoticeProvider>
      <TableScreen>
        <ReporteContent />
      </TableScreen>
    </NoticeProvider>
  )
}
