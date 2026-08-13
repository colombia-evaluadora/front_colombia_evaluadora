import { api } from "@/lib/api-client"

import type { Employee } from "@/features/establishment/employees/api/types/employee"

export function update(
  employeeId: number,
  values: Employee,
): Promise<{ status: "ok" | "error"; message: string; employee: Employee }> {
  return api.put(`/establishments/employees/${employeeId}`, values)
}
