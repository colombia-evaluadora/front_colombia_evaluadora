import { DescargaDocumentoPdf } from "@/features/gestion-estudiantil/commons/components/descarga-documento-pdf"

/** Mención de honor: descarga el PDF de reporting-service (clave `reconocimiento-mencion-honor`). */
export function DialogMencionHonor({ reconocimientoId, onClose }: { reconocimientoId: number; onClose: () => void }) {
  return <DescargaDocumentoPdf titulo="Mención de honor" clave="reconocimiento-mencion-honor" filtros={{ FK_RECONOCIMIENTO: reconocimientoId }} onClose={onClose} />
}
