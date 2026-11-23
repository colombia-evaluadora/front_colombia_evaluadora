import { DescargaDocumentoPdf } from "@/features/gestion-estudiantil/commons/components/descarga-documento-pdf"

/** Citación al acudiente: descarga el PDF de reporting-service (clave `citacion-documento`). */
export function DialogDocumentoCitacion({ citacionId, onClose }: { citacionId: number; onClose: () => void }) {
  return <DescargaDocumentoPdf titulo="Citación al acudiente" clave="citacion-documento" filtros={{ FK_CITACION: citacionId }} onClose={onClose} />
}
