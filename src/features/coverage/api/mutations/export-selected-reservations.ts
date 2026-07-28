import { useMutation } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { ExportFormat, ExportResult } from "../types/reservation"

interface ExportSelectedReservationsInput {
  ids: string[]
  format: ExportFormat
}

function exportSelectedReservations(input: ExportSelectedReservationsInput): Promise<ExportResult> {
  return api.post("/coverage/reservations/export", input)
}

interface UseExportSelectedReservationsOptions {
  mutationConfig?: MutationConfig<typeof exportSelectedReservations>
}

export function useExportSelectedReservations({
  mutationConfig,
}: UseExportSelectedReservationsOptions = {}) {
  return useMutation({
    mutationFn: exportSelectedReservations,
    ...mutationConfig,
  })
}
