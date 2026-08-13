import { api } from "@/lib/api-client"

import type { Campus } from "@/features/establishment/campuses/api/types/campus"

export interface CreateResult {
  status: "ok" | "error"
  message: string
  campus: Campus
}

export function create(values: Campus): Promise<CreateResult> {
  return api.post("/establishments/campuses", values)
}

export function updateCampus(
  campusId: string,
  values: Campus
): Promise<CreateResult> {
  return api.put(`/establishments/campuses/${campusId}`, values)
}