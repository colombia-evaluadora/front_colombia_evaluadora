import { ExportDialog } from "@/components/export-dialog"

import { useExportarAnotaciones } from "@/features/gestion-estudiantil/observador/api/mutations/anotaciones"
import type { ObservadorQueryFilters } from "@/features/gestion-estudiantil/observador/api/types"

/** Exportar del listado: lo que se ve en la tabla (mismos filtros y alcance), sin paginar. */
export function DialogExportarAnotaciones({ filters }: { filters: ObservadorQueryFilters }) {
  const exportar = useExportarAnotaciones()
  return (
    <ExportDialog
      label="Exportar anotaciones"
      description="Elige un formato para descargar las anotaciones con los filtros aplicados. Las de situaciones Tipo II y III salen sin observación para quien no tiene acceso a ella."
      onExport={(format) => exportar.mutateAsync({ filters, format })}
    />
  )
}
