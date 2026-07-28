import { api } from "@/lib/api-client"

import type { Campus } from "../types/campus"

export interface CreateCampusResult {
  status: "ok" | "error"
  message: string
  campus: Campus
}

export function createCampus(values: Campus): Promise<CreateCampusResult> {
  return api.post("/campuses", values)
}