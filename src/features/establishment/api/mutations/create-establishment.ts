import { api } from "@/lib/api-client"
import type { EstablishmentDetails } from "../types/establishment"

export interface CreateEstablishmentResult {
  status: "ok" | "error"
  message: string
  establishment: EstablishmentDetails
}

export function createEstablishment(values: EstablishmentDetails): Promise<CreateEstablishmentResult> {
  return api.post("/establishments", values)
}
