import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MatriculaFieldConfigResult } from "@/features/coverage/api/types/matricula"

function fetchMatriculaFieldConfig(): Promise<MatriculaFieldConfigResult> {
  return api.get("/coverage/matricula/config")
}

export function useMatriculaFieldConfigQuery() {
  return useQuery({
    queryKey: ["matricula", "field-config"],
    queryFn: fetchMatriculaFieldConfig,
  })
}
