import { downloadReport } from "@/lib/report-client"

export const descargarRemision = (remisionId: number) =>
  downloadReport("orientacion-remision", { format: "pdf", filters: { FK_REMISION: remisionId } })

export const descargarFicha = (atencionId: number) =>
  downloadReport("orientacion-ficha", { format: "pdf", filters: { FK_ATENCION: atencionId } })
