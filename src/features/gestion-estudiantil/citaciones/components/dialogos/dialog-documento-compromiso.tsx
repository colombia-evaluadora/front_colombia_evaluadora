import { DescargaDocumentoPdf } from "@/features/gestion-estudiantil/commons/components/descarga-documento-pdf"

/** Acta de compromiso: descarga el PDF de reporting-service (clave `compromiso-documento`). */
export function DialogDocumentoCompromiso({ compromisoId, onClose }: { compromisoId: number; onClose: () => void }) {
  return <DescargaDocumentoPdf titulo="Acta de compromiso" clave="compromiso-documento" filtros={{ FK_COMPROMISO: compromisoId }} onClose={onClose} />
}
