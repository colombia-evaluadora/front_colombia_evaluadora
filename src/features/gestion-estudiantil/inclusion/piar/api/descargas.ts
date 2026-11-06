import { downloadReport } from "@/lib/report-client"

export const descargarPlan = (piarId: number) => downloadReport("piar-plan", { format: "pdf", filters: { FK_PIAR: piarId } })

export const descargarActa = (piarId: number, versionId?: number) =>
  downloadReport("piar-acta", { format: "pdf", filters: { FK_PIAR: piarId, FK_VERSION: versionId ?? null } })

export const descargarActualizacion = (actualizacionId: number) =>
  downloadReport("piar-actualizacion", { format: "pdf", filters: { FK_ACTUALIZACION: actualizacionId } })
