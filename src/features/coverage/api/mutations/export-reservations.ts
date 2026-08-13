import { useMutation } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { ExportFormat, ExportResult, ReservationsQueryRequest } from "@/features/coverage/api/types/reservation"

interface ExportReservationsInput {
  filters: ReservationsQueryRequest["filters"]
  format: ExportFormat
}

function exportReservations(input: ExportReservationsInput): Promise<ExportResult> {
  return api.post("/coverage/reservations/export-all", input)
}

interface UseExportReservationsOptions {
  mutationConfig?: MutationConfig<typeof exportReservations>
}

export function useExportReservations({ mutationConfig }: UseExportReservationsOptions = {}) {
  return useMutation({
    mutationFn: exportReservations,
    ...mutationConfig,
  })
}
