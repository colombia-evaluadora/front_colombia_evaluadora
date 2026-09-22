import { useMutation } from "@tanstack/react-query"

import { downloadReport } from "@/lib/report-client"
import type { MutationConfig } from "@/lib/react-query"
import type { ExportFormat, ExportResult } from "@/features/academic-management/reports/api/types/export"

/**
 * Dos descargas distintas, y la diferencia es toda la gracia.
 *
 * El BOLETÍN (`/reportes/boletin-preescolar`) no es la tabla en otro formato:
 * es un PDF armado aparte, una página por (estudiante, asignatura/dimensión),
 * con foto, evidencias y fondo institucional — ver `boletin-preescolar.md`.
 * Por eso solo acepta `pdf` y un único (período, estudiante) a la vez.
 *
 * El DESCARGAR (`/reportes/informes-tabla`) no filtra nada: es la tabla como
 * se está viendo, con la búsqueda aplicada, y cada número viene dicho con
 * todas las letras en la columna Estado.
 */

interface ExportBoletinInput {
  grupoId: number
  /** Un boletín es de un único período. */
  periodoId: number
  /** Un boletín es de un único estudiante. */
  matriculaId: number
}

function exportBoletin(input: ExportBoletinInput): Promise<ExportResult> {
  return downloadReport("boletin-preescolar", {
    format: "pdf",
    filters: {
      FK_TGRUPO: input.grupoId,
      FK_TPERIODO_EVALUACION: input.periodoId,
      FK_TMATRICULAS: [input.matriculaId],
    },
  })
}

export function useExportBoletin({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof exportBoletin> } = {}) {
  return useMutation({ mutationFn: exportBoletin, ...mutationConfig })
}

interface ExportTablaInput {
  format: ExportFormat
  grupoId: number
  periodos?: number[]
  /** El mismo texto del buscador de la tabla: lo que se ve es lo que baja. */
  search?: string
  /** El resumen con nombres para el membrete; sin esto se imprimen los ids. */
  filtersLabel?: string
}

function exportTabla(input: ExportTablaInput): Promise<ExportResult> {
  return downloadReport("informes-tabla", {
    format: input.format,
    filters: {
      FK_TGRUPO: input.grupoId,
      PERIODOS: input.periodos?.length ? input.periodos : null,
      SEARCH: input.search?.trim() || null,
    },
    filtersLabel: input.filtersLabel,
  })
}

export function useExportTabla({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof exportTabla> } = {}) {
  return useMutation({ mutationFn: exportTabla, ...mutationConfig })
}
