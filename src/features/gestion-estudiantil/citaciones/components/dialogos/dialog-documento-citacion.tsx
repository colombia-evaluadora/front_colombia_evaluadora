import { useCitacionDocumentoQuery } from "@/features/gestion-estudiantil/citaciones/api/query/use-citaciones-query"
import {
  DatosDocumento,
  DialogoDocumento,
  Firma,
  HojaDocumento,
  SeccionDocumento,
} from "@/features/gestion-estudiantil/citaciones/components/dialogos/documento-imprimible"
import { formatFechaHora } from "@/features/gestion-estudiantil/convivencia/api/ui-mappings"

/** Citación al acudiente imprimible (G.3.CIT.DOC.1, «Ver citación PDF»): datos de `GET /citaciones/:ID/documento`. */
export function DialogDocumentoCitacion({ citacionId, onClose }: { citacionId: number; onClose: () => void }) {
  const { data: d, isPending, error } = useCitacionDocumentoQuery(citacionId)
  return (
    <DialogoDocumento titulo="Citación al acudiente" isPending={isPending} error={error} onClose={onClose}>
      {d && (
        <HojaDocumento
          establecimiento={d.establecimiento}
          titulo="Citación al acudiente"
          subtitulo={`Citación para el ${formatFechaHora(d.fecha_programada)}`}
        >
          <DatosDocumento
            filas={[
              ["Estudiante", `${d.estudiante} · ${d.grado_grupo}`],
              ["Acudiente", d.acudiente ?? "—"],
              ["Fecha y hora", formatFechaHora(d.fecha_programada)],
              ["Lugar", d.lugar],
              ["Quién atiende", d.atiende],
              ["Documento", d.estudiante_documento],
            ]}
          />
          <SeccionDocumento titulo="Mensaje para el acudiente">
            <p className="whitespace-pre-line">{d.texto_acudiente}</p>
          </SeccionDocumento>
          <SeccionDocumento titulo="Firma">
            <div className="pt-10">
              <Firma nombre={d.cita} rol="Quien cita" />
            </div>
          </SeccionDocumento>
        </HojaDocumento>
      )}
    </DialogoDocumento>
  )
}
