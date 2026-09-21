import { useMutation } from "@tanstack/react-query"

import { downloadReport } from "@/lib/report-client"
import type { MutationConfig } from "@/lib/react-query"
import type { ExportFormat, ExportResult } from "@/features/academic-management/reports/api/types/export"

/**
 * Dos descargas distintas, y la diferencia es toda la gracia.
 *
 * El BOLETÍN (`/reportes/informes`) filtra: solo sale lo consolidado. Una
 * proyección o una nota requerida, impresas, se leen como calificaciones
 * reales en cuanto el archivo sale del sistema.
 *
 * El DESCARGAR (`/reportes/informes-tabla`) no filtra nada: es la tabla como
 * se está viendo, con la búsqueda aplicada, y cada número viene dicho con
 * todas las letras en la columna Estado.
 */

interface ExportBoletinInput {
  format: ExportFormat
  grupoId: number
  /** Vacío = todos los períodos del período académico del grupo. */
  periodos?: number[]
  /** Un boletín es de un estudiante. Vacío = el grupo entero. */
  matriculas?: number[]
  incluirFinal?: boolean
}

function exportBoletin(input: ExportBoletinInput): Promise<ExportResult> {
  return downloadReport("informes", {
    format: input.format,
    filters: {
      FK_TGRUPO: input.grupoId,
      PERIODOS: input.periodos?.length ? input.periodos : null,
      MATRICULAS: input.matriculas?.length ? input.matriculas : null,
      INCLUIR_FINAL: input.incluirFinal ?? false,
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
  incluirFinal?: boolean
}

function exportTabla(input: ExportTablaInput): Promise<ExportResult> {
  return downloadReport("informes-tabla", {
    format: input.format,
    filters: {
      FK_TGRUPO: input.grupoId,
      PERIODOS: input.periodos?.length ? input.periodos : null,
      SEARCH: input.search?.trim() || null,
      INCLUIR_FINAL: input.incluirFinal ?? false,
    },
  })
}

export function useExportTabla({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof exportTabla> } = {}) {
  return useMutation({ mutationFn: exportTabla, ...mutationConfig })
}
