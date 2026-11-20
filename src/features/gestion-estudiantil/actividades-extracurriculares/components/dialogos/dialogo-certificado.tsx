import { DescargaDocumentoPdf } from "@/features/gestion-estudiantil/commons/components/descarga-documento-pdf"

/** Certificado de servicio social: descarga el PDF de reporting-service (clave `servicio-social-certificado`). */
export function DialogoCertificado({ matricula, onClose }: { matricula: number; onClose: () => void }) {
  return <DescargaDocumentoPdf titulo="Certificado de servicio social" clave="servicio-social-certificado" filtros={{ FK_MATRICULA: matricula }} onClose={onClose} />
}
