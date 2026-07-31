import type { CatalogItem } from "./catalog"
import type { Permission, PermissionStatus } from "./permission"
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
  /**
   * Roles agregados a partir de los permisos del funcionario. Se listan
   * una sola vez por código, conservando el orden en que aparecen en
   * `permissions`. Cuando un funcionario tiene varios permisos con
   * distintos roles, este arreglo contiene todos para renderizarlos
   * como una lista separada por comas.
   */
  roles: CatalogItem[]
  campuses: string[]
  workSchedule: CatalogItem
  /**
   * Estados agregados desde los permisos del funcionario. Análogo a
   * `roles`: se preserva el orden de aparición, sin duplicados.
   */
  statuses: PermissionStatus[]
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