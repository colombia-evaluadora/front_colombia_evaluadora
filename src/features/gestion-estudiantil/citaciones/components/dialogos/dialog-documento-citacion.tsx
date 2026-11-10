import { citacionesKeys } from "@/features/gestion-estudiantil/citaciones/api/query-keys"
import { useCitacionDocumentoQuery } from "@/features/gestion-estudiantil/citaciones/api/query/use-citaciones-query"
import {
  DatosDocumento,
  DialogoDocumento,
  Firma,
  HojaDocumento,
  SeccionDocumento,
} from "@/features/gestion-estudiantil/commons/components/documento-imprimible"
import { formatFechaHora } from "@/features/gestion-estudiantil/commons/utils/formatos"

/** Citación al acudiente imprimible (G.3.CIT.DOC.1, «Descargar citación»): datos de `GET /citaciones/:ID/documento`. */
export function DialogDocumentoCitacion({ citacionId, onClose }: { citacionId: number; onClose: () => void }) {
  const { data: d, isPending, error } = useCitacionDocumentoQuery(citacionId)
  return (
    <DialogoDocumento titulo="Citación al acudiente" isPending={isPending} error={error} onClose={onClose}>
      {d && (
        <HojaDocumento
          claveModulo={citacionesKeys.all}
          encabezado={d}
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
            ]}
          />
          <SeccionDocumento titulo="Mensaje para el acudiente">
            <p className="whitespace-pre-line">{d.texto_acudiente}</p>
          </SeccionDocumento>
          <SeccionDocumento titulo="Firma">
            <div className="pt-10">
              <Firma nombre={d.cita} rol={[d.cita_cargo, "Quien cita"].filter(Boolean).join(" · ")} />
            </div>
          </SeccionDocumento>
        </HojaDocumento>
      )}
    </DialogoDocumento>
  )
}
