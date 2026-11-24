import { downloadReport } from "@/lib/report-client"

export const descargarRemision = (remisionId: number) =>
  downloadReport("orientacion-remision", { format: "pdf", filters: { FK_REMISION: remisionId } })

/** Remisión externa de una atención (`remision-externa`, V668): `FK_REMISION` es la externa, no la interna. */
export const descargarRemisionExterna = (remisionExternaId: number) =>
  downloadReport("remision-externa", { format: "pdf", filters: { FK_REMISION: remisionExternaId } })

export const descargarFicha = (atencionId: number) =>
  downloadReport("orientacion-ficha", { format: "pdf", filters: { FK_ATENCION: atencionId } })
