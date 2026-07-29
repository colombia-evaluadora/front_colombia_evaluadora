import type { CatalogItem } from "./catalog"
import type { Permission } from "./permission"
import type { Person } from "./person"

export const EMPLOYEE_STATUSES = ["ACTIVE", "SUSPENDED"] as const

export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number]

export interface Employee {
  id: string

  person: Person

  employeeClass: CatalogItem
  educationLevel: CatalogItem
  grade: CatalogItem
  highestEducationLevel: CatalogItem
  fundingSource: CatalogItem
  functionalPosition: CatalogItem
  employmentType: CatalogItem

  address: string

  permissions: Permission[]

  status: EmployeeStatus
}

export interface EmployeeListItem {
  id: string
  documentNumber: string
  name: string
  role: CatalogItem
  campuses: string[]
  workSchedule: CatalogItem
  status: EmployeeStatus
}

export interface EmployeesQueryFilters {
  search?: string
  roles?: string[]
  workSchedules?: string[]
  statuses?: EmployeeStatus[]
}

export interface EmployeesQueryRequest {
  filters: EmployeesQueryFilters
  sorting: {
    id: string
    desc: boolean
  }[]
  pageIndex: number
  pageSize: number
}

export interface EmployeesQueryResponse {
  rows: EmployeeListItem[]
  pageCount: number
  totalCount: number
}