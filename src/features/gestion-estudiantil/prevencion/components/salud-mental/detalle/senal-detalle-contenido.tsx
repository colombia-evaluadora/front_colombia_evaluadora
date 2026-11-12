import { TableScreenBody } from "@/components/layout/table-screen"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"

import type { SenalSMDetalle } from "@/features/gestion-estudiantil/prevencion/api/types"
import { DialogValoracionCritica } from "@/features/gestion-estudiantil/prevencion/components/salud-mental/dialogos/dialog-valoracion-critica"
import { EncabezadoSenal } from "@/features/gestion-estudiantil/prevencion/components/salud-mental/detalle/encabezado-senal"
import { ResumenSenal } from "@/features/gestion-estudiantil/prevencion/components/salud-mental/detalle/resumen-senal"
import { SeccionAtencion } from "@/features/gestion-estudiantil/prevencion/components/salud-mental/detalle/seccion-atencion"
import { SeccionValoracionSenal } from "@/features/gestion-estudiantil/prevencion/components/salud-mental/detalle/seccion-valoracion-senal"
import { useSenalDetalle } from "@/features/gestion-estudiantil/prevencion/hooks/use-senal-detalle"

/** Contenido de la señal: resumen, valoración y atención. Sin acceso sensible solo se ve el reporte y su estado. */
export function SenalDetalleContenido({ senal }: { senal: SenalSMDetalle }) {
  const d = useSenalDetalle(senal)
  return (
    <>
      <EncabezadoSenal senal={senal} d={d} />
      <TableScreenBody>
        <div className="flex flex-col gap-4 pb-6">
          <ErrorNoticeBanner error={d.errorBackend} />
          <ResumenSenal senal={senal} />
          {senal.ve_sensible && (
            <>
              <SeccionValoracionSenal senal={senal} d={d} />
              <SeccionAtencion senal={senal} d={d} />
            </>
          )}
        </div>
      </TableScreenBody>
      {d.advertir && (
        <DialogValoracionCritica pending={d.pending} onCancelar={d.cancelarCritica} onConfirmar={d.confirmarCritica} />
      )}
      {d.dialogos}
    </>
  )
}
