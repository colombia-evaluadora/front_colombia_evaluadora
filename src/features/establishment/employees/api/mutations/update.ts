import { api } from "@/lib/api-client"

import type { Employee } from "@/features/establishment/employees/api/types/employee"

export function update(
  employeeId: string,
  values: Employee,
): Promise<{ status: "ok" | "error"; message: string; employee: Employee }> {
  return api.put(`/establishments/employees/${employeeId}`, values)
}
