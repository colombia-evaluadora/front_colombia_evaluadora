import { useCompromisoDocumentoQuery } from "@/features/gestion-estudiantil/citaciones/api/query/use-compromisos-query"
import {
  DatosDocumento,
  DialogoDocumento,
  Firma,
  HojaDocumento,
  SeccionDocumento,
} from "@/features/gestion-estudiantil/citaciones/components/dialogos/documento-imprimible"
import { formatFecha } from "@/features/gestion-estudiantil/convivencia/api/ui-mappings"

/** Acta de compromiso imprimible (G.3.CMP.DOC.1, «Descargar acta de compromiso»): datos de `GET /compromisos/:ID/documento`. */
export function DialogDocumentoCompromiso({ compromisoId, onClose }: { compromisoId: number; onClose: () => void }) {
  const { data: d, isPending, error } = useCompromisoDocumentoQuery(compromisoId)
  return (
    <DialogoDocumento titulo="Acta de compromiso" isPending={isPending} error={error} onClose={onClose}>
      {d && (
        <HojaDocumento
          establecimiento={d.establecimiento}
          titulo="Acta de compromiso"
          subtitulo={`Compromiso ${d.tipo.toLowerCase()} del ${formatFecha(d.fecha)}`}
        >
          <DatosDocumento
            filas={[
              ["Estudiante", d.estudiante],
              ["Tipo de compromiso", d.tipo],
              ["Fecha", formatFecha(d.fecha)],
              ["Fecha de revisión", formatFecha(d.fecha_revision)],
            ]}
          />
          <SeccionDocumento titulo="Compromisos">
            <table className="w-full border border-border text-left">
              <thead className="bg-muted">
                <tr>
                  <th className="w-10 px-3 py-1.5">N.º</th>
                  <th className="px-3 py-1.5">Compromiso</th>
                  <th className="px-3 py-1.5">Responsable</th>
                  <th className="px-3 py-1.5">Plazo</th>
                </tr>
              </thead>
              <tbody>
                {d.items.map((i, n) => (
                  <tr key={i.id} className="border-t border-border">
                    <td className="px-3 py-1.5">{n + 1}</td>
                    <td className="px-3 py-1.5">{i.descripcion}</td>
                    <td className="px-3 py-1.5">{i.responsable}</td>
                    <td className="px-3 py-1.5">{formatFecha(i.plazo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SeccionDocumento>
          <SeccionDocumento titulo="Firmas">
            <div className="grid grid-cols-1 gap-6 pt-10 sm:grid-cols-3">
              <Firma nombre={d.estudiante} rol="Estudiante" />
              <Firma nombre={d.acudiente ?? "—"} rol="Acudiente" />
              <Firma nombre={d.crea} rol="Quien crea el compromiso" />
            </div>
          </SeccionDocumento>
        </HojaDocumento>
      )}
    </DialogoDocumento>
  )
}
