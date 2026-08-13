import { api } from "@/lib/api-client"
import type { EstablishmentDetails } from "@/features/establishment/institution/api/types/establishment"

export interface CreateResult {
  status: "ok" | "error"
  message: string
  establishment: EstablishmentDetails
}

export function create(values: EstablishmentDetails): Promise<CreateResult> {
  return api.post("/establishments", values)
}

export function updateEstablishment(
  establishmentId: string,
  values: EstablishmentDetails
): Promise<CreateResult> {
  return api.put(`/establishments/${establishmentId}`, values)
}
