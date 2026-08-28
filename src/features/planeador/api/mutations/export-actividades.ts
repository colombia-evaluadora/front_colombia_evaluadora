import { useMutation } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type {
  ActividadQueryResponse,
  ExportFormat,
  ExportResult,
} from "@/features/planeador/api/types/actividad"

interface ExportActividadesInput {
  filters: ActividadQueryResponse["rows"]
  format: ExportFormat
}

function exportActividades(input: ExportActividadesInput): Promise<ExportResult> {
  // Mismo path que `coverage/matricula/export-all`: el filtro del listado
  // viaja en el body (el cliente manda el array ya filtrado, como en
  // matricula). Cuando el backend real acepte los filtros en vez de las
  // filas, basta con cambiar este `filters` por la forma `{...}` propia.
  return api.post(`/eval-col/planeador/actividad/export-all`, input)
}

interface UseExportActividadesOptions {
  mutationConfig?: MutationConfig<typeof exportActividades>
}

export function useExportActividades({ mutationConfig }: UseExportActividadesOptions = {}) {
  return useMutation({
    mutationFn: exportActividades,
    ...mutationConfig,
  })
}
