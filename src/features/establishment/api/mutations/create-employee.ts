import { api } from "@/lib/api-client"

import type { Employee } from "../types/employee"
import type { Person } from "../types/person"

export interface CreateEmployeePersonResult {
  status: "ok" | "error"
  message: string
  person: Person
}

export interface CreateEmployeeResult {
  status: "ok" | "error"
  message: string
  employee: Employee
}

export function createEmployeePerson(values: Person): Promise<CreateEmployeePersonResult> {
  return api.post("/establishments/employees/person", values)
}

export function createEmployee(values: Employee): Promise<CreateEmployeeResult> {
  return api.post("/establishments/employees", values)
}

export function updateEmployee(
  employeeId: string,
  values: Employee
): Promise<CreateEmployeeResult> {
  return api.put(`/establishments/employees/${employeeId}`, values)
}
