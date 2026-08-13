import { api } from "@/lib/api-client"

import type { Campus } from "@/features/establishment/campuses/api/types/campus"

export interface CreateResult {
  status: "ok" | "error"
  message: string
  campus: Campus
}

// El cliente no manda `id`: lo asigna el backend al crear.
export function create(values: Omit<Campus, "id">): Promise<CreateResult> {
  return api.post("/establishments/campuses", values)
}

export function updateCampus(
  campusId: number,
  values: Campus
): Promise<CreateResult> {
  return api.put(`/establishments/campuses/${campusId}`, values)
}